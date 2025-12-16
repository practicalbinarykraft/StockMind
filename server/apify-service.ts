import { ApifyClient } from 'apify-client';

// Official Apify Instagram scraper (supports posts, reels, stories, profiles)
// https://apify.com/apify/instagram-scraper
const APIFY_ACTOR_ID = 'apify/instagram-scraper';

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
 * - Handles multiple field name variants (videoUrl/video_url, etc.)
 * - Safe defaults for all fields
 */
function mapApifyReel(item: any, shortCodeFallback?: string): InstagramReelData {
  // Mutual recovery: shortCode ↔ URL (support multiple field names)
  let shortCode = item.shortCode || item.shortcode || item.id || shortCodeFallback || '';
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
  const rawDuration = item.videoDuration ?? item.durationInSeconds ?? item.duration ?? item.videoLength ?? item.lengthSeconds ?? 0;
  const normalizedDuration = safeNumber(rawDuration, 0);

  // Log if we had to normalize duration (float → int)
  if (rawDuration !== normalizedDuration && rawDuration > 0) {
    console.log(`[Apify] Normalized duration for ${shortCode}: ${rawDuration} → ${normalizedDuration}s`);
  }

  // Support multiple field name variants for videoUrl
  const videoUrl = item.videoUrl || item.video_url || item.video || item.mediaUrl || '';
  
  // Support multiple field name variants for thumbnailUrl
  const thumbnailUrl = item.thumbnailUrl || item.thumbnail_url || item.displayUrl || 
                       item.display_url || item.imageUrl || item.image_url || 
                       item.coverUrl || item.cover_url || item.images?.[0] || '';

  // Support multiple field name variants for caption
  const caption = (item.caption || item.title || '').trim();

  // Helper to convert to array safely
  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
    return [];
  };

  // Extract hashtags/mentions from caption as fallback
  const hashtagsFromCaption = (caption.match(/#\w+/g) || []).map((s: string) => s.replace('#', ''));
  const mentionsFromCaption = (caption.match(/@\w+/g) || []).map((s: string) => s.replace('@', ''));

  const hashtags = toArray(item.hashtags).length ? toArray(item.hashtags) : hashtagsFromCaption;
  const mentions = toArray(item.mentions).length ? toArray(item.mentions) : mentionsFromCaption;

  return {
    id: item.id || shortCode,
    shortCode,
    url,
    caption,
    hashtags,
    mentions,
    videoUrl,
    thumbnailUrl: thumbnailUrl || undefined,
    videoDuration: normalizedDuration,
    likesCount: safeNumber(item.likesCount ?? item.likes, 0),
    commentsCount: safeNumber(item.commentsCount ?? item.comments, 0),
    videoViewCount: safeNumber(item.videoViewCount ?? item.views ?? item.videoPlayCount ?? item.plays, 0),
    videoPlayCount: safeNumber(item.videoPlayCount ?? item.plays ?? item.videoViewCount ?? item.views, 0),
    sharesCount: safeNumber(item.sharesCount ?? item.shares, 0),
    timestamp: item.timestamp || item.takenAt || item.publishedAt || new Date().toISOString(),
    ownerUsername: item.ownerUsername || item.username || '',
    ownerFullName: item.ownerFullName || item.ownerFullname || item.fullName,
    ownerId: item.ownerId || item.owner?.id,
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

    // Prepare input for the Instagram Scraper actor
    // Documentation: https://apify.com/apify/instagram-scraper
    const input = {
      directUrls: [`https://www.instagram.com/${username}/reels/`],
      resultsType: 'posts', // 'posts' includes reels
      resultsLimit,
    };

    console.log(`[Apify] Starting scraping for Instagram user: @${username} (limit: ${resultsLimit})...`);

    // Run the actor and wait for it to finish (with 3 minute timeout)
    const run = await withTimeout(
      client.actor(APIFY_ACTOR_ID).call(input),
      180000, // 3 minutes timeout
      `Apify scraping timeout (3 minutes) for user: ${username}`
    );

    console.log(`[Apify] Run finished: id=${run.id}, status=${run.status}, dataset=${run.defaultDatasetId}`);

    // Check run status with detailed error messages
    if (run.status === 'FAILED') {
      throw new Error(`Apify actor failed - user @${username} may not exist, be private, or have no reels`);
    } else if (run.status === 'TIMED-OUT') {
      throw new Error(`Apify actor timed out scraping @${username} - try reducing resultsLimit`);
    } else if (run.status === 'ABORTED') {
      throw new Error(`Apify actor was aborted while scraping @${username}`);
    } else if (run.status !== 'SUCCEEDED') {
      throw new Error(`Apify run unexpected status "${run.status}" for user: @${username}`);
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
    const transformedItems: InstagramReelData[] = items
      .map((item: any) => mapApifyReel(item))
      .filter(reel => reel.videoUrl); // Filter out reels without video URLs

    console.log(`[Apify] ✅ Transformed ${transformedItems.length} valid Reels (filtered empty videos)`);

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
      client.actor(APIFY_ACTOR_ID).call({
        directUrls: [`https://www.instagram.com/reel/${shortCode}/`],
        resultsLimit: 1,
      }),
      60000, // 1 minute timeout
      `Timeout fetching reel: ${shortCode}`
    );

    console.log(`[Apify] Single reel run finished: id=${run.id}, status=${run.status}`);

    // Check run status with detailed error messages
    if (run.status === 'FAILED') {
      throw new Error(`Apify actor failed - reel may be private, deleted, or unavailable: ${shortCode}`);
    } else if (run.status === 'TIMED-OUT') {
      throw new Error(`Apify actor timed out fetching reel: ${shortCode}`);
    } else if (run.status === 'ABORTED') {
      throw new Error(`Apify actor was aborted: ${shortCode}`);
    } else if (run.status !== 'SUCCEEDED') {
      throw new Error(`Apify run unexpected status "${run.status}" for reel: ${shortCode}`);
    }
    
    if (!run.defaultDatasetId) {
      throw new Error('Apify run missing defaultDatasetId');
    }

    const { items } = await withTimeout(
      client.dataset(run.defaultDatasetId).listItems({ limit: 1 }),
      30000, // 30 seconds timeout
      `Dataset timeout for reel: ${shortCode}`
    );
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log(`[Apify] No data found for reel ${shortCode}`);
      return null;
    }

    console.log(`[Apify] ✅ Successfully fetched fresh data for ${shortCode}`);
    
    // Use mapApifyReel for safe normalization
    const reel = mapApifyReel(items[0], shortCode);
    
    // Return null if no video URL (shouldn't happen for single reel but be safe)
    if (!reel.videoUrl) {
      console.log(`[Apify] ⚠️ Reel ${shortCode} has no videoUrl`);
      return null;
    }
    
    return reel;
  } catch (error) {
    console.error('[Apify] Error fetching single reel:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch reel from Instagram: ${message}`);
  }
}

/**
 * Test Apify API key by checking actor availability and quota
 * @param apiKey - Apify API key to test
 * @returns Object with success status, usage info, and error message if failed
 */
export async function testApifyApiKey(apiKey: string): Promise<{
  success: boolean;
  usage?: { availableCredits: number };
  error?: string;
}> {
  try {
    const client = new ApifyClient({ token: apiKey });
    
    // Try to get user info to validate the key and get quota
    const user = await client.user().get() as any;
    
    return {
      success: true,
      usage: {
        availableCredits: user?.usageCycle?.credits || 0,
      },
    };
  } catch (error) {
    console.error('Apify API key test failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}
