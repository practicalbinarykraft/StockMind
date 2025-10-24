import cron from 'node-cron';
import { db } from '../db';
import { instagramSources, instagramItems } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { scrapeInstagramReels } from '../apify-service';
import { downloadInstagramMedia } from '../instagram-download';
import type { IStorage } from '../storage';
import type { InstagramSource } from '../../shared/schema';

let storage: IStorage;
let isRunning = false;

export function initInstagramMonitor(storageInstance: IStorage) {
  storage = storageInstance;
  
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Instagram Monitor] Starting hourly check...');
    await checkAllSources();
  }, {
    timezone: process.env.CRON_TZ || 'UTC'
  });
  
  console.log('[Instagram Monitor] Cron job initialized (runs hourly)');
  
  // Run immediately on startup (non-blocking)
  checkAllSources().catch((error) => {
    console.error('[Instagram Monitor] Startup check failed:', error);
  });
}

async function checkAllSources() {
  if (isRunning) {
    console.log('[Instagram Monitor] Skip: previous run still active');
    return;
  }
  
  isRunning = true;
  const started = Date.now();
  
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
    
    // Process sources in parallel with concurrency limit
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(Number(process.env.INSTA_MONITOR_CONCURRENCY || 2));
    
    await Promise.all(
      sourcesToCheck.map(source => 
        limit(async () => {
          try {
            await checkSourceForUpdates(source);
          } catch (error) {
            console.error(`[Instagram Monitor] Error checking ${source.username}:`, error);
            
            // Update failed check count with backoff
            const failInterval = source.checkIntervalHours || 6;
            await db
              .update(instagramSources)
              .set({
                failedChecks: sql`${instagramSources.failedChecks} + 1`,
                lastCheckedAt: new Date(),
                totalChecks: sql`${instagramSources.totalChecks} + 1`,
                nextCheckAt: sql`NOW() + ${failInterval * 2} * interval '1 hour'`,
              })
              .where(eq(instagramSources.id, source.id));
          }
        })
      )
    );
  } catch (error) {
    console.error('[Instagram Monitor] Error in checkAllSources:', error);
  } finally {
    isRunning = false;
    const duration = Math.round((Date.now() - started) / 1000);
    console.log(`[Instagram Monitor] Done in ${duration}s`);
  }
}

async function checkSourceForUpdates(source: any) {
  const startTime = Date.now();
  const safeInterval = source.checkIntervalHours || 6;
  
  console.log(`[Instagram Monitor] Checking ${source.username} (userId: ${source.userId})...`);
  
  // Get user's Apify API key (getUserApiKey returns decrypted key)
  const apifyKeyObj = await storage.getUserApiKey(source.userId, 'apify');
  if (!apifyKeyObj) {
    console.log(`[Instagram Monitor] No Apify key for user ${source.userId}, skipping with backoff`);
    
    // Update with failed status and backoff
    await db
      .update(instagramSources)
      .set({
        lastCheckedAt: new Date(),
        totalChecks: sql`${instagramSources.totalChecks} + 1`,
        failedChecks: sql`${instagramSources.failedChecks} + 1`,
        nextCheckAt: sql`NOW() + ${safeInterval * 2} * interval '1 hour'`,
      })
      .where(eq(instagramSources.id, source.id));
    
    return;
  }
  
  // Extract decrypted key from storage response
  const apifyKey = (apifyKeyObj as any).decryptedKey || 
                   (apifyKeyObj as any).plaintext || 
                   (apifyKeyObj as any).key || 
                   (apifyKeyObj as any).value ||
                   apifyKeyObj.encryptedKey; // Fallback (if already decrypted by getUserApiKey)
  
  if (!apifyKey) {
    console.error(`[Instagram Monitor] Apify key decryption failed for user ${source.userId}`);
    
    await db
      .update(instagramSources)
      .set({
        lastCheckedAt: new Date(),
        totalChecks: sql`${instagramSources.totalChecks} + 1`,
        failedChecks: sql`${instagramSources.failedChecks} + 1`,
        nextCheckAt: sql`NOW() + ${safeInterval * 2} * interval '1 hour'`,
      })
      .where(eq(instagramSources.id, source.id));
    
    return;
  }
  
  const keyLast4 = apifyKey.slice(-4);
  console.log(`[Instagram Monitor] Using Apify key ending in ...${keyLast4}`);
  
  // Parse latest 20 Reels (light check for auto-update)
  const result = await scrapeInstagramReels(source.username, apifyKey, 20);
  
  if (!result.success) {
    throw new Error(result.error || 'Scraping failed');
  }
  
  // Validate Apify response
  if (!result.items || !Array.isArray(result.items)) {
    throw new Error('Apify returned invalid response (no items array)');
  }
  
  // Filter and validate reels
  const validReels = result.items.filter(reel => {
    const hasRequiredFields = reel.shortCode && reel.url && reel.videoUrl;
    if (!hasRequiredFields) {
      console.warn(`[Instagram Monitor] Skipping reel with missing fields: ${JSON.stringify(reel)}`);
    }
    return hasRequiredFields;
  });
  
  console.log(`[Instagram Monitor] Found ${validReels.length} valid reels for ${source.username}`);
  
  // Process reels in a transaction for accurate counters
  await db.transaction(async (tx) => {
    let newReelsCount = 0;
    let viralReelsCount = 0;
    
    for (const reel of validReels) {
      // Use INSERT with ON CONFLICT DO NOTHING for upsert pattern
      const insertResult = await tx
        .insert(instagramItems)
        .values({
          sourceId: source.id,
          userId: source.userId,
          externalId: reel.shortCode,
          shortCode: reel.shortCode,
          caption: reel.caption || '',
          url: reel.url,
          videoUrl: reel.videoUrl,
          thumbnailUrl: reel.thumbnailUrl,
          videoDuration: reel.videoDuration,
          likesCount: reel.likesCount || 0,
          commentsCount: reel.commentsCount || 0,
          videoViewCount: reel.videoViewCount,
          videoPlayCount: reel.videoPlayCount,
          ownerUsername: reel.ownerUsername,
          ownerFullName: reel.ownerFullName,
          publishedAt: reel.timestamp ? new Date(reel.timestamp) : null,
        })
        .onConflictDoNothing()
        .returning({ id: instagramItems.id });
      
      // Check if actually inserted (not a duplicate)
      if (insertResult && insertResult.length > 0) {
        newReelsCount++;
        console.log(`[Instagram Monitor] New Reel: ${reel.shortCode}`);
        
        // Check if viral
        const threshold = source.viralThreshold ?? 0;
        const views = reel.videoViewCount ?? reel.videoPlayCount ?? 0;
        if (views >= threshold) {
          viralReelsCount++;
        }
        
        // Background download (non-blocking)
        const itemId = insertResult[0].id;
        downloadInstagramMedia(reel.videoUrl, reel.thumbnailUrl || null, itemId)
          .catch(error => {
            console.error(`[Instagram Monitor] Download failed for ${itemId}:`, error);
          });
      }
    }
    
    // Update source statistics atomically
    await tx
      .update(instagramSources)
      .set({
        lastCheckedAt: new Date(),
        lastSuccessfulParseAt: new Date(),
        nextCheckAt: sql`NOW() + ${safeInterval} * interval '1 hour'`,
        totalChecks: sql`${instagramSources.totalChecks} + 1`,
        newReelsFound: sql`${instagramSources.newReelsFound} + ${newReelsCount}`,
        failedChecks: 0, // Reset on success
        itemCount: sql`${instagramSources.itemCount} + ${newReelsCount}`,
      })
      .where(eq(instagramSources.id, source.id));
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Instagram Monitor] ✅ ${source.username}: ${newReelsCount} new Reels (${viralReelsCount} viral) in ${duration}s`);
  });
}
