/**
 * Instagram Graph API Client
 * Handles OAuth flow, media fetching, and insights collection with retry logic
 */

const GRAPH_API_VERSION = 'v22.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ============================================================================
// Types
// ============================================================================

export interface GraphAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Typically 5184000 seconds (60 days)
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  instagram_business_account?: {
    id: string;
  };
}

export interface PagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REEL';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username?: string;
}

export interface MediaListResponse {
  data: InstagramMedia[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface MediaInsight {
  name: string;
  period: string;
  values: Array<{
    value: number | Record<string, number>;
  }>;
  title?: string;
  description?: string;
  id?: string;
}

export interface InsightsResponse {
  data: MediaInsight[];
  paging?: {
    next?: string;
    previous?: string;
  };
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with exponential backoff retry on 429/5xx errors
 * Backoff: 1s → 3s → 7s (max 3 attempts)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delays = [1000, 3000, 7000]
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable (429 or 5xx)
      const isRetryable = 
        error instanceof GraphAPIClientError &&
        (error.statusCode === 429 || (error.statusCode >= 500 && error.statusCode < 600));
      
      if (!isRetryable || attempt === maxAttempts - 1) {
        throw error;
      }
      
      const delay = delays[attempt] || delays[delays.length - 1];
      console.log(`[Graph API] Rate limit/server error (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class GraphAPIClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public errorCode?: number,
    public fbTraceId?: string
  ) {
    super(message);
    this.name = 'GraphAPIClientError';
  }
}

// ============================================================================
// HTTP Helper
// ============================================================================

async function graphFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok || 'error' in data) {
    const error = data.error || {};
    throw new GraphAPIClientError(
      error.message || `Graph API error: ${response.statusText}`,
      response.status,
      error.type,
      error.code,
      error.fbtrace_id
    );
  }
  
  return data as T;
}

// ============================================================================
// OAuth Methods
// ============================================================================

/**
 * Exchange authorization code for short-lived access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string
): Promise<TokenExchangeResponse> {
  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  
  return withRetry(() => graphFetch<TokenExchangeResponse>(url.toString()));
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<LongLivedTokenResponse> {
  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);
  
  return withRetry(() => graphFetch<LongLivedTokenResponse>(url.toString()));
}

/**
 * Refresh long-lived token (extends expiration)
 */
export async function refreshLongLivedToken(
  currentToken: string,
  appId: string,
  appSecret: string
): Promise<LongLivedTokenResponse> {
  // Same endpoint as getting long-lived token
  return getLongLivedToken(currentToken, appId, appSecret);
}

// ============================================================================
// User & Pages Methods
// ============================================================================

/**
 * Get Facebook user ID from access token
 */
export async function getFacebookUserId(accessToken: string): Promise<string> {
  const url = new URL(`${GRAPH_BASE_URL}/me`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id');
  
  const response = await withRetry(() => 
    graphFetch<{ id: string }>(url.toString())
  );
  
  return response.id;
}

/**
 * Get user's Facebook Pages (with Instagram Business Accounts)
 */
export async function getUserPages(accessToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${GRAPH_BASE_URL}/me/accounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,name,access_token,category,instagram_business_account');
  
  const response = await withRetry(() => 
    graphFetch<PagesResponse>(url.toString())
  );
  
  return response.data;
}

/**
 * Get Instagram Business Account details for a page
 */
export async function getInstagramAccount(
  igUserId: string,
  pageAccessToken: string
): Promise<InstagramAccount> {
  const url = new URL(`${GRAPH_BASE_URL}/${igUserId}`);
  url.searchParams.set('access_token', pageAccessToken);
  url.searchParams.set('fields', 'id,username,name,profile_picture_url,followers_count');
  
  return withRetry(() => graphFetch<InstagramAccount>(url.toString()));
}

// ============================================================================
// Media Methods
// ============================================================================

export interface GetMediaOptions {
  limit?: number;
  after?: string; // Pagination cursor
  since?: string; // Unix timestamp or ISO date
  until?: string; // Unix timestamp or ISO date
  mediaType?: 'REEL' | 'VIDEO' | 'IMAGE' | 'CAROUSEL_ALBUM';
}

/**
 * Get Instagram media (posts/reels) for an account
 */
export async function getInstagramMedia(
  igUserId: string,
  accessToken: string,
  options: GetMediaOptions = {}
): Promise<MediaListResponse> {
  const url = new URL(`${GRAPH_BASE_URL}/${igUserId}/media`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username');
  
  if (options.limit) {
    url.searchParams.set('limit', options.limit.toString());
  }
  
  if (options.after) {
    url.searchParams.set('after', options.after);
  }
  
  if (options.since) {
    url.searchParams.set('since', options.since);
  }
  
  if (options.until) {
    url.searchParams.set('until', options.until);
  }
  
  const response = await withRetry(() => 
    graphFetch<MediaListResponse>(url.toString())
  );
  
  // Filter by media type if specified
  if (options.mediaType) {
    response.data = response.data.filter(media => media.media_type === options.mediaType);
  }
  
  return response;
}

/**
 * Get a single media item by ID
 */
export async function getMediaById(
  mediaId: string,
  accessToken: string
): Promise<InstagramMedia> {
  const url = new URL(`${GRAPH_BASE_URL}/${mediaId}`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username');
  
  return withRetry(() => graphFetch<InstagramMedia>(url.toString()));
}

// ============================================================================
// Insights Methods
// ============================================================================

/**
 * Get available insights for a media item
 * Different metrics available based on media type
 */
export async function getMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<InsightsResponse> {
  const url = new URL(`${GRAPH_BASE_URL}/${mediaId}/insights`);
  url.searchParams.set('access_token', accessToken);
  
  // Request all available metrics (API will return what's available)
  // For Reels: plays, reach, total_interactions, likes, comments, shares, saves
  // For other media: impressions, reach, engagement, saved
  url.searchParams.set('metric', [
    'plays',
    'reach',
    'total_interactions',
    'likes',
    'comments',
    'shares',
    'saves',
    'impressions',
    'engagement',
    'saved',
  ].join(','));
  
  return withRetry(() => graphFetch<InsightsResponse>(url.toString()));
}

/**
 * Transform Graph API insights into a simple key-value metrics object
 */
export function parseInsights(insights: InsightsResponse): Record<string, number> {
  const metrics: Record<string, number> = {};
  
  for (const insight of insights.data) {
    if (insight.values && insight.values.length > 0) {
      const value = insight.values[0].value;
      
      // Handle both number values and object values (e.g., {value: 123})
      if (typeof value === 'number') {
        metrics[insight.name] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Some metrics return objects, extract the main value if possible
        const mainValue = 'value' in value ? (value as any).value : Object.values(value)[0];
        if (typeof mainValue === 'number') {
          metrics[insight.name] = mainValue;
        }
      }
    }
  }
  
  return metrics;
}

/**
 * Check if access token has required permissions
 */
export async function validateToken(accessToken: string): Promise<{
  isValid: boolean;
  scopes: string[];
  appId: string;
  userId: string;
  expiresAt: number;
}> {
  const url = new URL(`${GRAPH_BASE_URL}/debug_token`);
  url.searchParams.set('input_token', accessToken);
  url.searchParams.set('access_token', accessToken); // App token or user token
  
  const response = await withRetry(() => 
    graphFetch<{
      data: {
        app_id: string;
        type: string;
        application: string;
        data_access_expires_at: number;
        expires_at: number;
        is_valid: boolean;
        scopes: string[];
        user_id: string;
      };
    }>(url.toString())
  );
  
  return {
    isValid: response.data.is_valid,
    scopes: response.data.scopes,
    appId: response.data.app_id,
    userId: response.data.user_id,
    expiresAt: response.data.expires_at,
  };
}
