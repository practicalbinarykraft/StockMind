import { storage } from "../storage";
import { downloadInstagramMedia } from "../instagram-download";
import { transcribeInstagramVideo } from "../transcription-service";
import { scoreInstagramReel } from "../ai-services";

/**
 * Background download helper for Instagram media
 * Downloads video + thumbnail without blocking the response
 */
export async function downloadInstagramMediaBackground(
  itemId: string,
  videoUrl: string,
  thumbnailUrl: string | null,
  userId?: string
): Promise<void> {
  try {
    // Update status to 'downloading'
    await storage.updateInstagramItemDownloadStatus(itemId, 'downloading');

    // Download media (with retry logic built-in)
    const result = await downloadInstagramMedia(videoUrl, thumbnailUrl, itemId);

    // Check results
    if (result.video.success) {
      await storage.updateInstagramItemDownloadStatus(
        itemId,
        'completed',
        result.video.localPath,
        result.thumbnail?.localPath,
        undefined
      );
      console.log(`[Instagram] ✅ Downloaded media for item: ${itemId}`);

      // Auto-start transcription after successful download
      if (userId && result.video.localPath) {
        console.log(`[Instagram] 🎙️ Auto-starting transcription for item: ${itemId}`);
        transcribeInstagramItemBackground(itemId, result.video.localPath, userId);
      }
    } else {
      await storage.updateInstagramItemDownloadStatus(
        itemId,
        'failed',
        undefined,
        undefined,
        result.video.error
      );
      console.error(`[Instagram] ❌ Failed to download video for item: ${itemId} - ${result.video.error}`);
    }
  } catch (error: any) {
    console.error(`[Instagram] ❌ Background download error for item ${itemId}:`, error.message);
    await storage.updateInstagramItemDownloadStatus(
      itemId,
      'failed',
      undefined,
      undefined,
      error.message
    ).catch(err => console.error('Failed to update download status:', err));
  }
}

/**
 * Background transcription helper for Instagram Reels
 * Transcribes downloaded video without blocking the response
 */
export async function transcribeInstagramItemBackground(
  itemId: string,
  localVideoPath: string,
  userId: string
): Promise<void> {
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

    console.log(`[AI Score] ✅ Scored item: ${itemId} (overall: ${result.score}, freshness: ${result.freshnessScore}, virality: ${result.viralityScore}, quality: ${result.qualityScore})`);
  } catch (error: any) {
    console.error(`[AI Score] ❌ Background scoring error for item ${itemId}:`, error.message);
  }
}
