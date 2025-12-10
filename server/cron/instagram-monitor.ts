import cron from "node-cron";
import { db } from "../db";
import { instagramSources, instagramItems } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { scrapeInstagramReels } from "../apify-service";
import { downloadInstagramMedia } from "../instagram-download";
import type { IStorage } from "../storage";
import type { InstagramSource } from "../../shared/schema";
import { logCronJob } from "../lib/logger-helpers";
import { logger } from "../lib/logger";

let storage: IStorage;
let isRunning = false;

export function initInstagramMonitor(storageInstance: IStorage) {
  storage = storageInstance;

  // // Run every hour at minute 0
  // cron.schedule('0 * * * *', async () => {
  //   logCronJob('instagramMonitor', 'started', { scheduledTime: new Date() });
  //   await checkAllSources();
  // }, {
  //   timezone: process.env.CRON_TZ || 'UTC'
  // });

  // logger.info('Instagram Monitor cron job initialized', { schedule: 'hourly' });

  // // Run immediately on startup (non-blocking)
  // checkAllSources().catch((error) => {
  //   logger.error('Instagram Monitor startup check failed', {
  //     error: error.message,
  //     stack: error.stack
  //   });
  // });
}

async function checkAllSources() {
  if (isRunning) {
    logger.warn("Instagram Monitor skipped: previous run still active");
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

    logger.info("Instagram Monitor found sources to check", {
      sourceCount: sourcesToCheck.length,
    });

    // Process sources in parallel with concurrency limit
    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(Number(process.env.INSTA_MONITOR_CONCURRENCY || 2));

    await Promise.all(
      sourcesToCheck.map((source) =>
        limit(async () => {
          try {
            await checkSourceForUpdates(source);
          } catch (error: any) {
            logger.error("Instagram Monitor error checking source", {
              username: source.username,
              sourceId: source.id,
              error: error.message,
              stack: error.stack,
            });

            // Update failed check count with backoff
            const failInterval = source.checkIntervalHours || 6;
            await db
              .update(instagramSources)
              .set({
                failedChecks: sql`${instagramSources.failedChecks} + 1`,
                lastCheckedAt: new Date(),
                totalChecks: sql`${instagramSources.totalChecks} + 1`,
                nextCheckAt: sql`NOW() + ${
                  failInterval * 2
                } * interval '1 hour'`,
              })
              .where(eq(instagramSources.id, source.id));
          }
        })
      )
    );

    const duration = Math.round((Date.now() - started) / 1000);
    logCronJob("instagramMonitor", "completed", {
      duration,
      sourcesChecked: sourcesToCheck.length,
    });
  } catch (error: any) {
    const duration = Math.round((Date.now() - started) / 1000);
    logCronJob("instagramMonitor", "failed", {
      duration,
      error: error.message,
      stack: error.stack,
    });
  } finally {
    isRunning = false;
  }
}

async function checkSourceForUpdates(source: any) {
  const startTime = Date.now();
  const safeInterval = source.checkIntervalHours || 6;

  logger.debug("Checking Instagram source for updates", {
    username: source.username,
    userId: source.userId,
    sourceId: source.id,
  });

  // Get user's Apify API key (getUserApiKey returns decrypted key)
  const apifyKeyObj = await storage.getUserApiKey(source.userId, "apify");
  if (!apifyKeyObj) {
    logger.warn("No Apify key for user, skipping with backoff", {
      userId: source.userId,
      username: source.username,
    });

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
  const apifyKey = apifyKeyObj.decryptedKey;

  if (!apifyKey) {
    logger.error("Apify key decryption failed", {
      userId: source.userId,
      username: source.username,
    });

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
  logger.debug("Using Apify key for scraping", {
    username: source.username,
    keyLast4,
  });

  // Parse latest 20 Reels (light check for auto-update)
  const result = await scrapeInstagramReels(source.username, apifyKey, 20);

  if (!result.success) {
    throw new Error(result.error || "Scraping failed");
  }

  // Validate Apify response
  if (!result.items || !Array.isArray(result.items)) {
    throw new Error("Apify returned invalid response (no items array)");
  }

  // Filter and validate reels
  const validReels = result.items.filter((reel) => {
    const hasRequiredFields = reel.shortCode && reel.url && reel.videoUrl;
    if (!hasRequiredFields) {
      logger.warn("Skipping reel with missing fields", {
        username: source.username,
        reel: reel.shortCode || "unknown",
      });
    }
    return hasRequiredFields;
  });

  logger.debug("Found valid reels", {
    username: source.username,
    validReelsCount: validReels.length,
    totalReels: result.items.length,
  });

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
          caption: reel.caption || "",
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
        logger.debug("New Instagram Reel discovered", {
          shortCode: reel.shortCode,
          username: source.username,
        });

        // Check if viral
        const threshold = source.viralThreshold ?? 0;
        const views = reel.videoViewCount ?? reel.videoPlayCount ?? 0;
        if (views >= threshold) {
          viralReelsCount++;
        }

        // Background download (non-blocking)
        const itemId = insertResult[0].id;
        downloadInstagramMedia(
          reel.videoUrl,
          reel.thumbnailUrl || null,
          itemId
        ).catch((error) => {
          logger.error("Instagram media download failed", {
            itemId,
            shortCode: reel.shortCode,
            error: error.message,
          });
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
    logger.info("Instagram source check completed", {
      username: source.username,
      newReelsCount,
      viralReelsCount,
      duration,
    });
  });
}
