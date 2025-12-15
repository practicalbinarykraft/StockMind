import { storage } from "../../storage";
import { scoreInstagramReel, scoreNewsItem } from "../../ai-services";
import { logBackgroundTask } from "../../lib/logger-helpers";
import { logger } from "../../lib/logger";

/**
 * Background transcription helper for Instagram Reels
 * Transcribes video and auto-starts AI scoring on success
 */
export async function transcribeInstagramItemBackground(
  itemId: string,
  localVideoPath: string,
  userId: string
): Promise<void> {
  const startTime = Date.now();

  // Import here to avoid circular dependencies
  const { transcribeInstagramVideo } = await import("../../transcription-service");

  try {
    logBackgroundTask({
      taskName: 'transcribeInstagramItem',
      status: 'started',
      itemId,
      userId
    });

    // Update status to 'processing' before starting transcription
    await storage.updateInstagramItemTranscription(itemId, 'processing');

    // Transcribe the video using OpenAI Whisper
    const result = await transcribeInstagramVideo(localVideoPath, userId);

    // Check results
    if (result.success) {
      await storage.updateInstagramItemTranscription(
        itemId,
        'completed',
        result.text,
        result.language,
        undefined
      );

      const duration = Date.now() - startTime;
      logBackgroundTask({
        taskName: 'transcribeInstagramItem',
        status: 'completed',
        itemId,
        userId,
        duration,
        textLength: result.text?.length || 0,
        language: result.language
      });

      // Auto-start AI scoring after successful transcription
      if (result.text) {
        logger.info('Auto-starting AI analysis after transcription', { itemId, userId });
        scoreInstagramItemBackground(itemId, userId);
      }
    } else {
      await storage.updateInstagramItemTranscription(
        itemId,
        'failed',
        undefined,
        undefined,
        result.error
      );

      logBackgroundTask({
        taskName: 'transcribeInstagramItem',
        status: 'failed',
        itemId,
        userId,
        duration: Date.now() - startTime,
        error: result.error
      });
    }
  } catch (error: any) {
    logBackgroundTask({
      taskName: 'transcribeInstagramItem',
      status: 'failed',
      itemId,
      userId,
      duration: Date.now() - startTime,
      error
    });

    await storage.updateInstagramItemTranscription(
      itemId,
      'failed',
      undefined,
      undefined,
      error.message
    ).catch(err => logger.error('Failed to update transcription status', {
      itemId,
      error: err.message
    }));
  }
}

/**
 * Background AI scoring helper for Instagram Reels
 * Scores transcribed Reels without blocking the response
 */
export async function scoreInstagramItemBackground(
  itemId: string,
  userId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    logBackgroundTask({
      taskName: 'scoreInstagramItem',
      status: 'started',
      itemId,
      userId
    });

    // Get the item with transcription
    const items = await storage.getInstagramItems(userId);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      logger.error('Instagram item not found for scoring', { itemId, userId });
      return;
    }

    if (!item.transcriptionText) {
      logger.error('No transcription available for AI scoring', { itemId, userId });
      return;
    }

    // Get Anthropic API key
    const apiKeyRecord = await storage.getUserApiKey(userId, 'anthropic');
    if (!apiKeyRecord) {
      logger.error('Anthropic API key not found for user', { userId });
      return;
    }

    const apiKey = apiKeyRecord.decryptedKey; // Decrypted value from storage

    // Score the Reel
    const result = await scoreInstagramReel(
      apiKey,
      item.transcriptionText,
      item.caption,
      {
        likes: item.likesCount,
        comments: item.commentsCount,
        views: item.videoViewCount,
      }
    );

    // Update item with AI scores
    await storage.updateInstagramItemAiScore(
      itemId,
      result.score,
      result.comment,
      result.freshnessScore,
      result.viralityScore,
      result.qualityScore
    );

    logBackgroundTask({
      taskName: 'scoreInstagramItem',
      status: 'completed',
      itemId,
      userId,
      duration: Date.now() - startTime,
      score: result.score,
      freshnessScore: result.freshnessScore,
      viralityScore: result.viralityScore,
      qualityScore: result.qualityScore
    });
  } catch (error: any) {
    logBackgroundTask({
      taskName: 'scoreInstagramItem',
      status: 'failed',
      itemId,
      userId,
      duration: Date.now() - startTime,
      error
    });
  }
}

/**
 * Background AI scoring helper for RSS items
 * Scores news items without blocking the response
 */
export async function scoreRssItems(items: any[], userId: string) {
  const startTime = Date.now();

  try {
    // Get user's Anthropic API key
    const apiKey = await storage.getUserApiKey(userId, 'anthropic');
    if (!apiKey) {
      logger.info('No Anthropic API key found, skipping RSS scoring', { userId });
      return;
    }

    logBackgroundTask({
      taskName: 'scoreRssItems',
      status: 'started',
      userId,
      itemsProcessed: 0,
      totalItems: items.length
    });

    let scoredCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      try {
        // Skip items that already have an AI score (additional safety check)
        if (item.aiScore !== null && item.aiScore !== undefined) {
          logger.debug('Skipping already scored RSS item', {
            itemId: item.id,
            title: item.title,
            existingScore: item.aiScore
          });
          skippedCount++;
          continue;
        }

        const result = await scoreNewsItem(
          apiKey.decryptedKey, // Decrypted value from getUserApiKey
          item.title,
          item.content
        );

        // Update the item with AI score
        await storage.updateRssItem(item.id, {
          aiScore: result.score,
          aiComment: result.comment,
        });

        logger.debug('Scored RSS item', {
          itemId: item.id,
          title: item.title,
          score: result.score
        });

        scoredCount++;
      } catch (err: any) {
        logger.error('Failed to score RSS item', {
          itemId: item.id,
          title: item.title,
          error: err.message
        });
        failedCount++;
      }
    }

    logBackgroundTask({
      taskName: 'scoreRssItems',
      status: 'completed',
      userId,
      duration: Date.now() - startTime,
      itemsProcessed: scoredCount,
      totalItems: items.length,
      failedCount,
      skippedCount
    });
  } catch (error: any) {
    logBackgroundTask({
      taskName: 'scoreRssItems',
      status: 'failed',
      userId,
      duration: Date.now() - startTime,
      error
    });
  }
}
