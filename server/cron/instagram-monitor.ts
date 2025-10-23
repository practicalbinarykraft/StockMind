import cron from 'node-cron';
import { db } from '../db';
import { instagramSources, instagramItems } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { scrapeInstagramReels } from '../apify-service';
import type { IStorage } from '../storage';
import type { InstagramSource } from '../../shared/schema';

let storage: IStorage;

export function initInstagramMonitor(storageInstance: IStorage) {
  storage = storageInstance;
  
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Instagram Monitor] Starting hourly check...');
    await checkAllSources();
  });
  
  console.log('[Instagram Monitor] Cron job initialized (runs hourly)');
}

async function checkAllSources() {
  try {
    // Find sources that need checking
    const sourcesToCheck = await db
      .select()
      .from(instagramSources)
      .where(
        and(
          eq(instagramSources.autoUpdateEnabled, true),
          sql`(${instagramSources.nextCheckAt} IS NULL OR ${instagramSources.nextCheckAt} <= NOW())`
        )
      );
    
    console.log(`[Instagram Monitor] Found ${sourcesToCheck.length} sources to check`);
    
    for (const source of sourcesToCheck) {
      try {
        await checkSourceForUpdates(source);
      } catch (error) {
        console.error(`[Instagram Monitor] Error checking ${source.username}:`, error);
        
        // Update failed check count
        const failInterval = source.checkIntervalHours || 6;
        await db
          .update(instagramSources)
          .set({
            failedChecks: sql`${instagramSources.failedChecks} + 1`,
            lastCheckedAt: new Date(),
            totalChecks: sql`${instagramSources.totalChecks} + 1`,
            nextCheckAt: sql`NOW() + ${failInterval} * interval '1 hour'`, // Parameterized interval
          })
          .where(eq(instagramSources.id, source.id));
      }
    }
  } catch (error) {
    console.error('[Instagram Monitor] Error in checkAllSources:', error);
  }
}

async function checkSourceForUpdates(source: any) {
  console.log(`[Instagram Monitor] Checking ${source.username}...`);
  
  // Always update lastCheckedAt and totalChecks (even if skipped)
  const safeInterval = source.checkIntervalHours || 6;
  
  // Get user's Apify API key (already decrypted)
  const apifyKeyObj = await storage.getUserApiKey(source.userId, 'apify');
  if (!apifyKeyObj) {
    console.log(`[Instagram Monitor] No Apify key for user ${source.userId}, skipping with backoff`);
    
    // Update with failed status and backoff (skip next check to avoid spam)
    await db
      .update(instagramSources)
      .set({
        lastCheckedAt: new Date(),
        totalChecks: sql`${instagramSources.totalChecks} + 1`,
        failedChecks: sql`${instagramSources.failedChecks} + 1`, // Increment failed checks
        nextCheckAt: sql`NOW() + ${safeInterval * 2} * interval '1 hour'`, // Parameterized interval
      })
      .where(eq(instagramSources.id, source.id));
    
    return;
  }
  
  const apifyKey = apifyKeyObj.encryptedKey; // This is already decrypted by getUserApiKey
  
  // Parse latest 20 Reels (light check for auto-update)
  const result = await scrapeInstagramReels(source.username, apifyKey, 20);
  
  if (!result.success) {
    throw new Error(result.error || 'Scraping failed');
  }
  
  let newReelsCount = 0;
  let viralReelsCount = 0;
  
  // Check which Reels are new
  for (const reel of result.items) {
    const existing = await db
      .select()
      .from(instagramItems)
      .where(
        and(
          eq(instagramItems.userId, source.userId),
          eq(instagramItems.externalId, reel.shortCode)
        )
      )
      .limit(1);
    
    if (existing.length === 0) {
      // New Reel found!
      console.log(`[Instagram Monitor] New Reel: ${reel.shortCode}`);
      
      await db.insert(instagramItems).values({
        sourceId: source.id,
        userId: source.userId,
        externalId: reel.shortCode,
        shortCode: reel.shortCode,
        caption: reel.caption,
        url: reel.url,
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        videoDuration: reel.videoDuration,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        videoViewCount: reel.videoViewCount,
        ownerUsername: reel.ownerUsername,
        ownerFullName: reel.ownerFullName,
        publishedAt: new Date(reel.timestamp),
      });
      
      newReelsCount++;
      
      // Check if viral
      if (reel.videoViewCount && reel.videoViewCount >= source.viralThreshold) {
        viralReelsCount++;
      }
      
      // TODO: Background processing (download, transcribe, AI score) can be added later
    }
  }
  
  // Update source statistics
  await db
    .update(instagramSources)
    .set({
      lastCheckedAt: new Date(),
      lastSuccessfulParseAt: new Date(),
      nextCheckAt: sql`NOW() + ${safeInterval} * interval '1 hour'`, // Parameterized interval
      totalChecks: sql`${instagramSources.totalChecks} + 1`,
      newReelsFound: sql`${instagramSources.newReelsFound} + ${newReelsCount}`,
      failedChecks: 0, // Reset on success
      itemCount: sql`${instagramSources.itemCount} + ${newReelsCount}`,
    })
    .where(eq(instagramSources.id, source.id));
  
  console.log(`[Instagram Monitor] ✅ ${source.username}: ${newReelsCount} new Reels (${viralReelsCount} viral)`);
}
