import { ApifyClient } from 'apify-client';

// Correct Apify actor ID (with "s" - reels, not reel)
const APIFY_ACTOR_ID = 'apify/instagram-reels-scraper';

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Safe number conversion with validation
 * Converts floats to integers (Math.round)
 * Validates all numbers (isFinite check)
 * Provides safe defaults for missing data
 */
function safeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return isFinite(num) && num >= 0 ? Math.round(num) : defaultValue;
}

/**
 * Normalize Apify reel data to safe types for database storage
 * - Converts floats to integers for duration/counts
 * - Mutual recovery: shortCode ↔ URL
 * - Handles multiple duration field names
 * - Safe defaults for all fields
 */
function mapApifyReel(item: any, shortCodeFallback?: string): InstagramReelData {
  // Mutual recovery: shortCode ↔ URL
  let shortCode = item.shortCode || item.id || shortCodeFallback || '';
  let url = item.url || '';

  // If no shortCode but have URL, extract it
  if (!shortCode && url) {
    const match = url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (match) {
      shortCode = match[1];
    }
  }

  // If no URL but have shortCode, build it
  if (shortCode && !url) {
    url = `https://www.instagram.com/reel/${shortCode}/`;
  }

  // Handle multiple possible duration field names
  const rawDuration = item.videoDuration ?? item.durationInSeconds ?? item.duration ?? item.videoLength ?? 0;
  const normalizedDuration = safeNumber(rawDuration, 0);

  // Log if we had to normalize duration (float → int)
  if (rawDuration !== normalizedDuration && rawDuration > 0) {
    console.log(`[Apify] Normalized duration for ${shortCode}: ${rawDuration} → ${normalizedDuration}s`);
  }

  return {
    id: item.id || shortCode,
    shortCode,
    url,
    caption: (item.caption || '').trim(),
    hashtags: item.hashtags || [],
    mentions: item.mentions || [],
    videoUrl: item.videoUrl || '',
    thumbnailUrl: item.thumbnailUrl || item.displayUrl || item.images?.[0] || '',
    videoDuration: normalizedDuration,
    likesCount: safeNumber(item.likesCount, 0),
    commentsCount: safeNumber(item.commentsCount, 0),
    videoViewCount: safeNumber(item.videoViewCount || item.videoPlayCount, 0),
    videoPlayCount: safeNumber(item.videoPlayCount || item.videoViewCount, 0),
    sharesCount: safeNumber(item.sharesCount, 0),
    timestamp: item.timestamp || new Date().toISOString(),
    ownerUsername: item.ownerUsername || '',
    ownerFullName: item.ownerFullName,
    ownerId: item.ownerId,
    musicInfo: item.musicInfo ? {
      artist: item.musicInfo.artist,
      songName: item.musicInfo.songName,
      originalAudio: item.musicInfo.originalAudio,
    } : undefined,
  };
}

export interface InstagramReelData {
  id: string;
  shortCode: string;
  url: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  videoUrl: string;
  thumbnailUrl?: string;
  videoDuration?: number;
  likesCount: number;
  commentsCount: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  sharesCount?: number;
  timestamp: string;
  ownerUsername: string;
  ownerFullName?: string;
  ownerId?: string;
  musicInfo?: {
    artist?: string;
    songName?: string;
    originalAudio?: boolean;
  };
}

export interface ApifyScrapingResult {
  success: boolean;
  items: InstagramReelData[];
  error?: string;
  itemCount: number;
}

/**
 * Scrape Instagram Reels from a username using Apify
 * @param username - Instagram username (without @)
 * @param apiKey - Apify API key
 * @param resultsLimit - Maximum number of Reels to fetch (default: 50)
 * @returns Scraping result with Reels data
 */
export async function scrapeInstagramReels(
  username: string,
  apiKey: string,
  resultsLimit: number = 50
): Promise<ApifyScrapingResult> {
  try {
    const client = new ApifyClient({ token: apiKey });

    // Prepare input for the Instagram Reels Scraper actor
    const input = {
      usernames: [username],  // Correct field name: "usernames" (plural)
      resultsLimit,
      maxItems: resultsLimit, // Some actor versions use this
    };

    console.log(`[Apify] Starting scraping for Instagram user: @${username} (limit: ${resultsLimit})...`);

    // Run the actor and wait for it to finish (with 3 minute timeout)
    const run = await withTimeout(
      client.actor(APIFY_ACTOR_ID).call(input),
      180000, // 3 minutes timeout
      `Apify scraping timeout (3 minutes) for user: ${username}`
    );

    console.log(`[Apify] Run finished: id=${run.id}, status=${run.status}, dataset=${run.defaultDatasetId}`);

    // Check run status and dataset ID
    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Apify run failed with status: ${run.status}`);
    }
    if (!run.defaultDatasetId) {
      throw new Error('Apify run missing defaultDatasetId');
    }

    // Fetch results from the dataset (with 30 second timeout + limit)
    const { items } = await withTimeout(
      client.dataset(run.defaultDatasetId).listItems({ limit: resultsLimit }),
      30000, // 30 seconds timeout
      `Apify dataset fetch timeout for user: ${username}`
    );

    console.log(`[Apify] ✅ Fetched ${items.length} Reels from @${username}`);
    
    // Log first item to see what fields Apify returns
    if (items.length > 0) {
      console.log('[Apify] Sample item fields:', Object.keys(items[0]));
      console.log('[Apify] Sample duration fields:', {
        videoDuration: items[0].videoDuration,
        durationInSeconds: items[0].durationInSeconds,
        duration: items[0].duration,
        videoLength: items[0].videoLength,
      });
    }

    // Transform Apify results using mapApifyReel for safe normalization
    const transformedItems: InstagramReelData[] = items.map((item: any) => 
      mapApifyReel(item)
    );

    return {
      success: true,
      items: transformedItems,
      itemCount: transformedItems.length,
    };
  } catch (error) {
    console.error('Apify scraping error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      success: false,
      items: [],
      error: errorMessage,
      itemCount: 0,
    };
  }
}

/**
 * Fetch a single reel's fresh data by shortCode to get updated videoUrl
 * Instagram video URLs expire after 24-48 hours, use this to refresh them
 * @param shortCode - Instagram reel short code
 * @param apiKey - Apify API key
 * @returns Fresh reel data or null if not found
 */
export async function fetchSingleReelData(
  shortCode: string,
  apiKey: string
): Promise<InstagramReelData | null> {
  if (!shortCode || shortCode.trim().length === 0) {
    throw new Error('Short code is required');
  }

  if (!apiKey) {
    throw new Error('Apify API key is required');
  }

  try {
    console.log(`[Apify] Fetching fresh data for reel ${shortCode}...`);
    
    const client = new ApifyClient({ token: apiKey });

    // Use directUrls for single reel fetch (with 60 second timeout)
    const run = await withTimeout(
      client.actor('apify/instagram-reel-scraper').call({
        directUrls: [`https://www.instagram.com/reel/${shortCode}/`],
        resultsLimit: 1,
      }),
      60000, // 1 minute timeout
      `Timeout fetching reel: ${shortCode}`
    );

    if (!run || !run.defaultDatasetId) {
      throw new Error('Apify actor run failed or returned no dataset');
    }

    const { items } = await withTimeout(
      client.dataset(run.defaultDatasetId).listItems(),
      30000, // 30 seconds timeout
      `Dataset timeout for reel: ${shortCode}`
    );
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log(`[Apify] No data found for reel ${shortCode}`);
      return null;
    }

    console.log(`[Apify] Successfully fetched fresh data for ${shortCode}`);
    
    // Use mapApifyReel for safe normalization
    return mapApifyReel(items[0], shortCode);
  } catch (error) {
    console.error('[Apify] Error fetching single reel:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch reel from Instagram: ${message}`);
  }
}

/**
 * Test Apify API key by checking actor availability
 * @param apiKey - Apify API key to test
 * @returns True if key is valid
 */
export async function testApifyApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new ApifyClient({ token: apiKey });
    
    // Try to get actor info to validate the key
    await client.actor('apify/instagram-reel-scraper').get();
    
    return true;
  } catch (error) {
    console.error('Apify API key test failed:', error);
    return false;
  }
}
