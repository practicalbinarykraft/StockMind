// Storage interface definition
import type {
  User,
  UpsertUser,
  ApiKey,
  ApiKeyWithDecrypted,
  InsertApiKey,
  RssSource,
  InsertRssSource,
  RssItem,
  InsertRssItem,
  InstagramSource,
  InsertInstagramSource,
  InstagramItem,
  InsertInstagramItem,
  Project,
  InsertProject,
  ProjectStep,
  InsertProjectStep,
  ScriptVersion,
  InsertScriptVersion,
  SceneRecommendation,
  InsertSceneRecommendation,
  IgAccount,
  IgMedia,
  InsertIgMedia,
  IgMediaInsight,
  InsertIgMediaInsight,
  ProjectVersionBinding,
  InsertProjectVersionBinding,
  ScriptLibrary,
  InsertScriptLibrary,
  PostAnalytics,
  InsertPostAnalytics,
  AnalyticsSnapshot,
  InsertAnalyticsSnapshot,
} from "@shared/schema";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // API Keys
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(userId: string, data: Omit<InsertApiKey, 'userId' | 'encryptedKey'> & { key: string }): Promise<ApiKey>;
  deleteApiKey(id: string, userId: string): Promise<void>;
  getUserApiKey(userId: string, provider: string): Promise<ApiKeyWithDecrypted | undefined>;
  getApiKeyById(id: string, userId: string): Promise<ApiKeyWithDecrypted | undefined>;

  // RSS Sources
  getRssSources(userId: string): Promise<RssSource[]>;
  getAllActiveRssSources(): Promise<RssSource[]>; // Get all active sources (for cron)
  createRssSource(userId: string, data: Omit<InsertRssSource, 'userId'>): Promise<RssSource>;
  updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined>;
  deleteRssSource(id: string, userId: string): Promise<void>;

  // Instagram Sources
  getInstagramSources(userId: string): Promise<InstagramSource[]>;
  createInstagramSource(userId: string, data: Omit<InsertInstagramSource, 'userId'>): Promise<InstagramSource>;
  updateInstagramSource(id: string, userId: string, data: Partial<InstagramSource>): Promise<InstagramSource | undefined>;
  deleteInstagramSource(id: string, userId: string): Promise<void>;

  // RSS Items
  getRssItems(userId?: string): Promise<Array<RssItem & { sourceName: string }>>;
  getRssItemsBySource(sourceId: string): Promise<RssItem[]>;
  getRssItemById(id: string): Promise<RssItem | undefined>;
  createRssItem(data: InsertRssItem): Promise<RssItem>;
  updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined>;
  updateRssItemAction(id: string, userId: string, action: string, projectId?: string): Promise<RssItem | undefined>;
  setRssItemFullContent(id: string, content: string): Promise<void>;

  // Instagram Items
  getInstagramItems(userId: string, sourceId?: string): Promise<InstagramItem[]>;
  getInstagramItemsBySource(sourceId: string): Promise<InstagramItem[]>;
  createInstagramItem(data: InsertInstagramItem): Promise<InstagramItem>;
  updateInstagramItem(id: string, data: Partial<InstagramItem>): Promise<InstagramItem | undefined>;
  updateInstagramItemAction(id: string, userId: string, action: string, projectId?: string): Promise<InstagramItem | undefined>;
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

  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string, userId: string): Promise<Project | undefined>;
  getProjectById(id: string): Promise<Project | undefined>; // Without userId check - for ownership validation
  createProject(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project>;
  updateProject(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<void>;
  permanentlyDeleteProject(id: string, userId: string): Promise<void>;
  createProjectFromInstagramAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    instagramItemId: string
  ): Promise<Project>;
  createProjectFromNewsAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    newsItemId: string,
    step3Data?: InsertProjectStep
  ): Promise<Project>;

  // Project Steps
  getProjectSteps(projectId: string): Promise<ProjectStep[]>;
  createProjectStep(data: InsertProjectStep): Promise<ProjectStep>;
  updateProjectStep(id: string, data: Partial<ProjectStep>): Promise<ProjectStep | undefined>;

  // Script Versions
  getScriptVersions(projectId: string): Promise<ScriptVersion[]>;
  listScriptVersions(projectId: string): Promise<ScriptVersion[]>;
  getCurrentScriptVersion(projectId: string): Promise<ScriptVersion | undefined>;
  getScriptVersionById(id: string): Promise<ScriptVersion | undefined>;
  getLatestCandidateVersion(projectId: string): Promise<ScriptVersion | undefined>;
  createScriptVersion(data: InsertScriptVersion): Promise<ScriptVersion>;
  updateScriptVersionCurrent(projectId: string, versionId: string): Promise<void>;
  createScriptVersionAtomic(data: InsertScriptVersion): Promise<ScriptVersion>;
  promoteCandidate(projectId: string, candidateId: string): Promise<void>;
  rejectCandidate(projectId: string, candidateId: string): Promise<void>;
  findVersionByIdemKey(projectId: string, idemKey: string): Promise<ScriptVersion[]>;
  markVersionProvenance(versionId: string, prov: any): Promise<void>;

  // Scene Recommendations
  getSceneRecommendations(scriptVersionId: string): Promise<SceneRecommendation[]>;
  createSceneRecommendations(data: InsertSceneRecommendation[]): Promise<SceneRecommendation[]>;
  updateSceneRecommendation(id: string, data: Partial<SceneRecommendation>): Promise<SceneRecommendation | undefined>;
  markRecommendationApplied(id: string): Promise<void>;
  markRecommendationsAppliedBatch(ids: string[]): Promise<void>;

  // Instagram Analytics Accounts
  getIgAccounts(userId: string): Promise<IgAccount[]>;
  getAllIgAccounts(): Promise<IgAccount[]>;
  getIgAccountById(id: string, userId: string): Promise<IgAccount | undefined>;
  createIgAccount(userId: string, data: Omit<IgAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IgAccount>;
  updateIgAccount(id: string, userId: string, data: Partial<IgAccount>): Promise<IgAccount | undefined>;
  deleteIgAccount(id: string, userId: string): Promise<void>;

  // Instagram Media
  getIgMedia(accountId: string, filters?: { limit?: number; mediaType?: string }): Promise<IgMedia[]>;
  getIgMediaById(id: string, userId: string): Promise<IgMedia | undefined>;
  upsertIgMedia(data: InsertIgMedia): Promise<IgMedia>;
  updateIgMediaSync(id: string, status: string, error?: string | null, nextSyncAt?: Date | null): Promise<IgMedia | undefined>;

  // Instagram Media Insights
  getIgMediaInsights(igMediaId: string, limit?: number): Promise<IgMediaInsight[]>;
  createIgMediaInsight(data: InsertIgMediaInsight): Promise<IgMediaInsight>;

  // Project Version Bindings
  createProjectVersionBinding(data: InsertProjectVersionBinding): Promise<ProjectVersionBinding>;
  deleteProjectVersionBinding(id: string, userId: string): Promise<void>;
  getProjectVersionBindings(projectId: string): Promise<ProjectVersionBinding[]>;

  // Scripts Library
  getScripts(userId: string, filters?: {
    status?: string;
    sourceType?: string;
    search?: string;
  }): Promise<ScriptLibrary[]>;
  getScript(id: string, userId: string): Promise<ScriptLibrary | undefined>;
  createScript(userId: string, data: Omit<InsertScriptLibrary, 'userId'>): Promise<ScriptLibrary>;
  updateScript(id: string, userId: string, data: Partial<ScriptLibrary>): Promise<ScriptLibrary | undefined>;
  deleteScript(id: string, userId: string): Promise<void>;
  getScriptsByStatus(userId: string, status: string): Promise<ScriptLibrary[]>;
  getScriptsByProject(projectId: string): Promise<ScriptLibrary | undefined>;
  updateScriptProject(scriptId: string, projectId: string | null): Promise<void>;

  // Post Analytics
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
