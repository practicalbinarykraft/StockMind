// Storage interface definition
// NOTE: This interface contains only methods used outside of storage/ and modules/ folders
// Internal methods have been removed to reduce duplication
import type {
  ApiKey,
  ApiKeyWithDecrypted,
  RssSource,
  RssItem,
  InsertRssItem,
  InstagramSource,
  InstagramItem,
  Project,
  ScriptVersion,
  IgAccount,
  IgMedia,
  InsertIgMedia,
  IgMediaInsight,
  InsertIgMediaInsight,
  ProjectVersionBinding,
  InsertProjectVersionBinding,
  PostAnalytics,
  InsertPostAnalytics,
  AnalyticsSnapshot,
  InsertAnalyticsSnapshot,
} from "@shared/schema";

export interface IStorage {
  // API Keys (used in: middleware, cron, lib, routes, services)
  getApiKeys(userId: string): Promise<ApiKey[]>;
  getUserApiKey(userId: string, provider: string): Promise<ApiKeyWithDecrypted | undefined>;

  // RSS Sources (used in: middleware, cron)
  getRssSources(userId: string): Promise<RssSource[]>;
  getAllActiveRssSources(): Promise<RssSource[]>;
  updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined>;

  // RSS Items (used in: cron, lib, routes)
  getRssItemById(id: string): Promise<RssItem | undefined>;
  createRssItemIfNotExists(data: InsertRssItem): Promise<RssItem | null>;
  updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined>;

  // Instagram Sources (used in: middleware)
  getInstagramSources(userId: string): Promise<InstagramSource[]>;

  // Instagram Items (used in: lib, routes)
  getInstagramItems(userId: string, sourceId?: string): Promise<InstagramItem[]>;
  updateInstagramItemDownloadStatus(
    id: string,
    status: 'pending' | 'downloading' | 'completed' | 'failed',
    localVideoPath?: string,
    localThumbnailPath?: string,
    downloadError?: string
  ): Promise<InstagramItem | undefined>;
  updateInstagramItemTranscription(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    transcriptionText?: string,
    language?: string,
    transcriptionError?: string
  ): Promise<InstagramItem | undefined>;
  updateInstagramItemAiScore(
    id: string,
    aiScore: number,
    aiComment: string,
    freshnessScore?: number,
    viralityScore?: number,
    qualityScore?: number
  ): Promise<InstagramItem | undefined>;

  // Projects (used in: routes, middleware)
  getProject(id: string, userId: string): Promise<Project | undefined>;

  // Script Versions (used in: routes, middleware)
  getScriptVersions(projectId: string): Promise<ScriptVersion[]>;
  getScriptVersionById(id: string): Promise<ScriptVersion | undefined>;

  // Instagram Analytics Accounts (used in: routes, services)
  getIgAccounts(userId: string): Promise<IgAccount[]>;
  getAllIgAccounts(): Promise<IgAccount[]>;
  getIgAccountById(id: string, userId: string): Promise<IgAccount | undefined>;
  createIgAccount(userId: string, data: Omit<IgAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IgAccount>;
  updateIgAccount(id: string, userId: string, data: Partial<IgAccount>): Promise<IgAccount | undefined>;
  deleteIgAccount(id: string, userId: string): Promise<void>;

  // Instagram Media (used in: routes, services)
  getIgMedia(accountId: string, filters?: { limit?: number; mediaType?: string }): Promise<IgMedia[]>;
  getIgMediaById(id: string, userId: string): Promise<IgMedia | undefined>;
  upsertIgMedia(data: InsertIgMedia): Promise<IgMedia>;
  updateIgMediaSync(id: string, status: string, error?: string | null, nextSyncAt?: Date | null): Promise<IgMedia | undefined>;

  // Instagram Media Insights (used in: routes, services)
  getIgMediaInsights(igMediaId: string, limit?: number): Promise<IgMediaInsight[]>;
  createIgMediaInsight(data: InsertIgMediaInsight): Promise<IgMediaInsight>;

  // Project Version Bindings (used in: routes)
  createProjectVersionBinding(data: InsertProjectVersionBinding): Promise<ProjectVersionBinding>;
  deleteProjectVersionBinding(id: string, userId: string): Promise<void>;
  getProjectVersionBindings(projectId: string): Promise<ProjectVersionBinding[]>;

  // Post Analytics (used in: routes, cron)
  getAnalyticsByProject(projectId: string): Promise<PostAnalytics | undefined>;
  createAnalytics(userId: string, data: Omit<InsertPostAnalytics, 'userId'>): Promise<PostAnalytics>;
  updateAnalytics(id: string, data: Partial<PostAnalytics>): Promise<PostAnalytics | undefined>;
  deleteAnalytics(id: string): Promise<void>;
  getLatestSnapshot(analyticsId: string): Promise<AnalyticsSnapshot | undefined>;
  createSnapshot(data: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>;
  getSnapshots(analyticsId: string, days?: number): Promise<AnalyticsSnapshot[]>;
  getDueAnalytics(): Promise<PostAnalytics[]>;
  createFetchTask(analyticsId: string, scheduledAt: Date): Promise<void>;
  getPendingTasks(): Promise<any[]>;
  updateFetchTask(id: string, data: Partial<any>): Promise<void>;
}
