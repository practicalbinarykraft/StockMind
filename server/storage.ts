// Main storage composition
// Reference: javascript_log_in_with_replit + javascript_database blueprints
import { IStorage } from "./storage/base/types";
import { userStorage } from "./storage/user.storage";
import { apiKeysStorage } from "./storage/api-keys.storage";
import { rssStorage } from "./storage/rss.storage";
import { instagramStorage } from "./storage/instagram.storage";
import { projectsStorage } from "./storage/projects.storage";
import { projectStepsStorage } from "./storage/project-steps.storage";
import { scriptVersionsStorage } from "./storage/script-versions.storage";
import { scenesStorage } from "./storage/scenes.storage";
import { igAnalyticsStorage } from "./storage/ig-analytics.storage";

/**
 * Main storage class that composes all domain storage modules
 */
class Storage implements IStorage {
  // User operations
  getUser = userStorage.getUser.bind(userStorage);
  upsertUser = userStorage.upsertUser.bind(userStorage);

  // API Keys
  getApiKeys = apiKeysStorage.getApiKeys.bind(apiKeysStorage);
  createApiKey = apiKeysStorage.createApiKey.bind(apiKeysStorage);
  deleteApiKey = apiKeysStorage.deleteApiKey.bind(apiKeysStorage);
  getUserApiKey = apiKeysStorage.getUserApiKey.bind(apiKeysStorage);
  getApiKeyById = apiKeysStorage.getApiKeyById.bind(apiKeysStorage);

  // RSS Sources
  getRssSources = rssStorage.getRssSources.bind(rssStorage);
  createRssSource = rssStorage.createRssSource.bind(rssStorage);
  updateRssSource = rssStorage.updateRssSource.bind(rssStorage);
  deleteRssSource = rssStorage.deleteRssSource.bind(rssStorage);

  // RSS Items
  getRssItems = rssStorage.getRssItems.bind(rssStorage);
  getRssItemsBySource = rssStorage.getRssItemsBySource.bind(rssStorage);
  getRssItemById = rssStorage.getRssItemById.bind(rssStorage);
  createRssItem = rssStorage.createRssItem.bind(rssStorage);
  updateRssItem = rssStorage.updateRssItem.bind(rssStorage);
  updateRssItemAction = rssStorage.updateRssItemAction.bind(rssStorage);
  setRssItemFullContent = rssStorage.setRssItemFullContent.bind(rssStorage);

  // Instagram Sources
  getInstagramSources = instagramStorage.getInstagramSources.bind(instagramStorage);
  createInstagramSource = instagramStorage.createInstagramSource.bind(instagramStorage);
  updateInstagramSource = instagramStorage.updateInstagramSource.bind(instagramStorage);
  deleteInstagramSource = instagramStorage.deleteInstagramSource.bind(instagramStorage);

  // Instagram Items
  getInstagramItems = instagramStorage.getInstagramItems.bind(instagramStorage);
  getInstagramItemsBySource = instagramStorage.getInstagramItemsBySource.bind(instagramStorage);
  createInstagramItem = instagramStorage.createInstagramItem.bind(instagramStorage);
  updateInstagramItem = instagramStorage.updateInstagramItem.bind(instagramStorage);
  updateInstagramItemAction = instagramStorage.updateInstagramItemAction.bind(instagramStorage);
  updateInstagramItemDownloadStatus = instagramStorage.updateInstagramItemDownloadStatus.bind(instagramStorage);
  updateInstagramItemTranscription = instagramStorage.updateInstagramItemTranscription.bind(instagramStorage);
  updateInstagramItemAiScore = instagramStorage.updateInstagramItemAiScore.bind(instagramStorage);

  // Projects
  getProjects = projectsStorage.getProjects.bind(projectsStorage);
  getProject = projectsStorage.getProject.bind(projectsStorage);
  getProjectById = projectsStorage.getProjectById.bind(projectsStorage);
  createProject = projectsStorage.createProject.bind(projectsStorage);
  updateProject = projectsStorage.updateProject.bind(projectsStorage);
  deleteProject = projectsStorage.deleteProject.bind(projectsStorage);
  permanentlyDeleteProject = projectsStorage.permanentlyDeleteProject.bind(projectsStorage);
  createProjectFromInstagramAtomic = projectsStorage.createProjectFromInstagramAtomic.bind(projectsStorage);
  createProjectFromNewsAtomic = projectsStorage.createProjectFromNewsAtomic.bind(projectsStorage);

  // Project Steps
  getProjectSteps = projectStepsStorage.getProjectSteps.bind(projectStepsStorage);
  createProjectStep = projectStepsStorage.createProjectStep.bind(projectStepsStorage);
  updateProjectStep = projectStepsStorage.updateProjectStep.bind(projectStepsStorage);

  // Script Versions
  getScriptVersions = scriptVersionsStorage.getScriptVersions.bind(scriptVersionsStorage);
  listScriptVersions = scriptVersionsStorage.listScriptVersions.bind(scriptVersionsStorage);
  getCurrentScriptVersion = scriptVersionsStorage.getCurrentScriptVersion.bind(scriptVersionsStorage);
  getScriptVersionById = scriptVersionsStorage.getScriptVersionById.bind(scriptVersionsStorage);
  getLatestCandidateVersion = scriptVersionsStorage.getLatestCandidateVersion.bind(scriptVersionsStorage);
  createScriptVersion = scriptVersionsStorage.createScriptVersion.bind(scriptVersionsStorage);
  updateScriptVersionCurrent = scriptVersionsStorage.updateScriptVersionCurrent.bind(scriptVersionsStorage);
  createScriptVersionAtomic = scriptVersionsStorage.createScriptVersionAtomic.bind(scriptVersionsStorage);
  promoteCandidate = scriptVersionsStorage.promoteCandidate.bind(scriptVersionsStorage);
  rejectCandidate = scriptVersionsStorage.rejectCandidate.bind(scriptVersionsStorage);
  findVersionByIdemKey = scriptVersionsStorage.findVersionByIdemKey.bind(scriptVersionsStorage);
  markVersionProvenance = scriptVersionsStorage.markVersionProvenance.bind(scriptVersionsStorage);

  // Scene Recommendations
  getSceneRecommendations = scenesStorage.getSceneRecommendations.bind(scenesStorage);
  createSceneRecommendations = scenesStorage.createSceneRecommendations.bind(scenesStorage);
  updateSceneRecommendation = scenesStorage.updateSceneRecommendation.bind(scenesStorage);
  markRecommendationApplied = scenesStorage.markRecommendationApplied.bind(scenesStorage);
  markRecommendationsAppliedBatch = scenesStorage.markRecommendationsAppliedBatch.bind(scenesStorage);

  // Instagram Analytics Accounts
  getIgAccounts = igAnalyticsStorage.getIgAccounts.bind(igAnalyticsStorage);
  getAllIgAccounts = igAnalyticsStorage.getAllIgAccounts.bind(igAnalyticsStorage);
  getIgAccountById = igAnalyticsStorage.getIgAccountById.bind(igAnalyticsStorage);
  createIgAccount = igAnalyticsStorage.createIgAccount.bind(igAnalyticsStorage);
  updateIgAccount = igAnalyticsStorage.updateIgAccount.bind(igAnalyticsStorage);
  deleteIgAccount = igAnalyticsStorage.deleteIgAccount.bind(igAnalyticsStorage);

  // Instagram Media
  getIgMedia = igAnalyticsStorage.getIgMedia.bind(igAnalyticsStorage);
  getIgMediaById = igAnalyticsStorage.getIgMediaById.bind(igAnalyticsStorage);
  upsertIgMedia = igAnalyticsStorage.upsertIgMedia.bind(igAnalyticsStorage);
  updateIgMediaSync = igAnalyticsStorage.updateIgMediaSync.bind(igAnalyticsStorage);

  // Instagram Media Insights
  getIgMediaInsights = igAnalyticsStorage.getIgMediaInsights.bind(igAnalyticsStorage);
  createIgMediaInsight = igAnalyticsStorage.createIgMediaInsight.bind(igAnalyticsStorage);

  // Project Version Bindings
  createProjectVersionBinding = igAnalyticsStorage.createProjectVersionBinding.bind(igAnalyticsStorage);
  deleteProjectVersionBinding = igAnalyticsStorage.deleteProjectVersionBinding.bind(igAnalyticsStorage);
  getProjectVersionBindings = igAnalyticsStorage.getProjectVersionBindings.bind(igAnalyticsStorage);
}

// Export singleton instance
export const storage = new Storage();

// Export interface for type checking
export type { IStorage };
