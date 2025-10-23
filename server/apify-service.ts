import { ApifyClient } from 'apify-client';

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

    // Prepare input for the Instagram Reel Scraper actor
    const input = {
      username: username,  // Apify requires 'username' field
      resultsLimit,
    };

    console.log(`Starting Apify scraping for Instagram user: ${username}`);

    // Run the actor and wait for it to finish
    const run = await client.actor('apify/instagram-reel-scraper').call(input);

    console.log(`Apify run finished: ${run.id}, status: ${run.status}`);

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`Fetched ${items.length} Reels from @${username}`);

    // Transform Apify results to our format
    const transformedItems: InstagramReelData[] = items.map((item: any) => ({
      id: item.id || item.shortCode,
      shortCode: item.shortCode,
      url: item.url,
      caption: item.caption || '',
      hashtags: item.hashtags || [],
      mentions: item.mentions || [],
      videoUrl: item.videoUrl,
      thumbnailUrl: item.displayUrl || item.images?.[0],
      videoDuration: item.videoDuration,
      likesCount: item.likesCount || 0,
      commentsCount: item.commentsCount || 0,
      videoViewCount: item.videoViewCount,
      videoPlayCount: item.videoPlayCount,
      sharesCount: item.sharesCount,
      timestamp: item.timestamp,
      ownerUsername: item.ownerUsername,
      ownerFullName: item.ownerFullName,
      ownerId: item.ownerId,
      musicInfo: item.musicInfo ? {
        artist: item.musicInfo.artist,
        songName: item.musicInfo.songName,
        originalAudio: item.musicInfo.originalAudio,
      } : undefined,
    }));

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
