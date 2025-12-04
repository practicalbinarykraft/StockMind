import { ApifyClient } from 'apify-client';
import { logger } from '../lib/logger';

export interface PostStats {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  impressions?: number;
  plays?: number;
  watchTimeSeconds?: number;
}

const APIFY_ACTORS = {
  instagram: {
    actor: 'apify/instagram-reels-scraper',
    parseResult: (data: any): PostStats => {
      return {
        views: data.videoViewCount || data.videoPlayCount || 0,
        likes: data.likesCount || 0,
        comments: data.commentsCount || 0,
        // Instagram не отдаёт shares/saves через scraper напрямую
        reach: data.reach || undefined,
        impressions: data.impressions || undefined,
      };
    }
  },
  tiktok: {
    actor: 'clockworks/tiktok-scraper',
    parseResult: (data: any): PostStats => {
      return {
        views: data.playCount || 0,
        likes: data.diggCount || 0,
        comments: data.commentCount || 0,
        shares: data.shareCount || 0,
      };
    }
  },
  youtube: {
    actor: 'bernardo/youtube-scraper',
    parseResult: (data: any): PostStats => {
      return {
        views: data.viewCount || 0,
        likes: data.likes || 0,
        comments: data.numberOfComments || 0,
        watchTimeSeconds: data.watchTime || undefined,
      };
    }
  }
};

export class AnalyticsScraper {
  private client: ApifyClient;

  constructor(apiKey: string) {
    this.client = new ApifyClient({ token: apiKey });
  }

  /**
   * Fetch post statistics from platform
   */
  async fetchPostStats(
    platform: 'instagram' | 'tiktok' | 'youtube',
    postUrl: string
  ): Promise<PostStats> {
    const config = APIFY_ACTORS[platform];
    
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    logger.info(`[Analytics] Fetching ${platform} stats for: ${postUrl}`);

    let input: any;
    
    if (platform === 'instagram') {
      input = {
        directUrls: [postUrl],
        resultsLimit: 1,
      };
    } else if (platform === 'tiktok') {
      input = {
        postURLs: [postUrl],
      };
    } else if (platform === 'youtube') {
      input = {
        startUrls: [{ url: postUrl }],
      };
    }

    const run = await this.client
      .actor(config.actor)
      .call(input);

    logger.info(`[Analytics] Apify run finished: ${run.id}, status: ${run.status}`);

    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Apify run failed with status: ${run.status}`);
    }

    if (!run.defaultDatasetId) {
      throw new Error('Apify run missing defaultDatasetId');
    }

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();

    if (!items.length) {
      throw new Error('No data returned from scraper');
    }

    const stats = config.parseResult(items[0]);

    logger.info(`[Analytics] Got stats:`, stats);

    return stats;
  }
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(stats: PostStats): number {
  const { likes = 0, comments = 0, shares = 0, saves = 0, views = 0 } = stats;
  
  if (views === 0) return 0;
  
  const totalEngagements = likes + comments + shares + saves;
  return (totalEngagements / views) * 100;
}

