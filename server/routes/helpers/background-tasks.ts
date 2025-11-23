import { storage } from "../../storage";
import { scoreInstagramReel, scoreNewsItem } from "../../ai-services";

/**
 * Background transcription helper for Instagram Reels
 * Transcribes video and auto-starts AI scoring on success
 */
export async function transcribeInstagramItemBackground(
  itemId: string,
  localVideoPath: string,
  userId: string
): Promise<void> {
  // Import here to avoid circular dependencies
  const { transcribeInstagramVideo } = await import("../../transcription-service");

  try {
    console.log(`[Transcription] Starting background transcription for item: ${itemId}`);

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
      console.log(`[Transcription] ✅ Transcribed item: ${itemId} (${result.text?.length || 0} chars, language: ${result.language})`);

      // Auto-start AI scoring after successful transcription
      if (result.text) {
        console.log(`[AI Score] 🎯 Auto-starting AI analysis for item: ${itemId}`);
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
      console.error(`[Transcription] ❌ Failed to transcribe item: ${itemId} - ${result.error}`);
    }
  } catch (error: any) {
    console.error(`[Transcription] ❌ Background transcription error for item ${itemId}:`, error.message);
    await storage.updateInstagramItemTranscription(
      itemId,
      'failed',
      undefined,
      undefined,
      error.message
    ).catch(err => console.error('Failed to update transcription status:', err));
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
  try {
    console.log(`[AI Score] Starting AI analysis for item: ${itemId}`);

    // Get the item with transcription
    const items = await storage.getInstagramItems(userId);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      console.error(`[AI Score] ❌ Item not found: ${itemId}`);
      return;
    }

    if (!item.transcriptionText) {
      console.error(`[AI Score] ❌ No transcription available for item: ${itemId}`);
      return;
    }

    // Get Anthropic API key
    const apiKeyRecord = await storage.getUserApiKey(userId, 'anthropic');
    if (!apiKeyRecord) {
      console.error(`[AI Score] ❌ Anthropic API key not found for user`);
      return;
    }

    const apiKey = apiKeyRecord.encryptedKey; // Already decrypted by storage

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

    console.log(`[AI Score] ✅ Scored item ${itemId}: ${result.score}/100`);
  } catch (error: any) {
    console.error(`[AI Score] ❌ Background scoring error for item ${itemId}:`, error.message);
  }
}

/**
 * Background AI scoring helper for RSS items
 * Scores news items without blocking the response
 */
export async function scoreRssItems(items: any[], userId: string) {
  try {
    // Get user's Anthropic API key
    const apiKey = await storage.getUserApiKey(userId, 'anthropic');
    if (!apiKey) {
      console.log('[AI] No Anthropic API key found for user, skipping scoring');
      return;
    }

    console.log(`[AI] Scoring ${items.length} RSS items...`);

    for (const item of items) {
      try {
        const result = await scoreNewsItem(
          apiKey.encryptedKey, // This is decrypted in getUserApiKey
          item.title,
          item.content
        );

        // Update the item with AI score
        await storage.updateRssItem(item.id, {
          aiScore: result.score,
          aiComment: result.comment,
        });

        console.log(`[AI] Scored item "${item.title}": ${result.score}/100`);
      } catch (err) {
        console.error(`[AI] Failed to score item "${item.title}":`, err);
      }
    }

    console.log(`[AI] Completed scoring ${items.length} items`);
  } catch (error) {
    console.error('[AI] Scoring failed:', error);
  }
}
