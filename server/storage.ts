// Main storage composition
// Reference: javascript_log_in_with_replit + javascript_database blueprints
import { IStorage } from "./storage/base/types";
import { apiKeysStorage } from "./storage/api-keys.storage";
import { rssStorage } from "./storage/rss.storage";
import { instagramStorage } from "./storage/instagram.storage";
import { projectsStorage } from "./storage/projects.storage";
import { scriptVersionsStorage } from "./storage/script-versions.storage";
import { igAnalyticsStorage } from "./storage/ig-analytics.storage";
import { postAnalyticsStorage } from "./storage/post-analytics.storage";

/**
 * Main storage class that composes all domain storage modules
 * 
 * NOTE: This file contains only methods used outside of storage/ and modules/ folders
 * Methods used only internally have been removed to reduce duplication
 */
class Storage implements Partial<IStorage> {
  // API Keys (used in: middleware, cron, lib, routes, services)
  getApiKeys = apiKeysStorage.getApiKeys.bind(apiKeysStorage);
  getUserApiKey = apiKeysStorage.getUserApiKey.bind(apiKeysStorage);

  // RSS Sources (used in: middleware, cron)
  getRssSources = rssStorage.getRssSources.bind(rssStorage);
  getAllActiveRssSources = rssStorage.getAllActiveRssSources.bind(rssStorage);
  updateRssSource = rssStorage.updateRssSource.bind(rssStorage);

  // RSS Items (used in: cron, lib, routes)
  getRssItemById = rssStorage.getRssItemById.bind(rssStorage);
  createRssItemIfNotExists = rssStorage.createRssItemIfNotExists.bind(rssStorage);
  updateRssItem = rssStorage.updateRssItem.bind(rssStorage);

  // Instagram Sources (used in: middleware)
  getInstagramSources = instagramStorage.getInstagramSources.bind(instagramStorage);

  // Instagram Items (used in: lib, routes)
  getInstagramItems = instagramStorage.getInstagramItems.bind(instagramStorage);
  updateInstagramItemDownloadStatus = instagramStorage.updateInstagramItemDownloadStatus.bind(instagramStorage);
  updateInstagramItemTranscription = instagramStorage.updateInstagramItemTranscription.bind(instagramStorage);
  updateInstagramItemAiScore = instagramStorage.updateInstagramItemAiScore.bind(instagramStorage);

  // Projects (used in: routes, middleware)
  getProject = projectsStorage.getProject.bind(projectsStorage);

  // Script Versions (used in: routes, middleware)
  getScriptVersions = scriptVersionsStorage.getScriptVersions.bind(scriptVersionsStorage);
  getScriptVersionById = scriptVersionsStorage.getScriptVersionById.bind(scriptVersionsStorage);

  // Instagram Analytics Accounts (used in: routes, services)
  getIgAccounts = igAnalyticsStorage.getIgAccounts.bind(igAnalyticsStorage);
  getAllIgAccounts = igAnalyticsStorage.getAllIgAccounts.bind(igAnalyticsStorage);
  getIgAccountById = igAnalyticsStorage.getIgAccountById.bind(igAnalyticsStorage);
  createIgAccount = igAnalyticsStorage.createIgAccount.bind(igAnalyticsStorage);
  updateIgAccount = igAnalyticsStorage.updateIgAccount.bind(igAnalyticsStorage);
  deleteIgAccount = igAnalyticsStorage.deleteIgAccount.bind(igAnalyticsStorage);

  // Instagram Media (used in: routes, services)
  getIgMedia = igAnalyticsStorage.getIgMedia.bind(igAnalyticsStorage);
  getIgMediaById = igAnalyticsStorage.getIgMediaById.bind(igAnalyticsStorage);
  upsertIgMedia = igAnalyticsStorage.upsertIgMedia.bind(igAnalyticsStorage);
  updateIgMediaSync = igAnalyticsStorage.updateIgMediaSync.bind(igAnalyticsStorage);

  // Instagram Media Insights (used in: routes, services)
  getIgMediaInsights = igAnalyticsStorage.getIgMediaInsights.bind(igAnalyticsStorage);
  createIgMediaInsight = igAnalyticsStorage.createIgMediaInsight.bind(igAnalyticsStorage);

  // Project Version Bindings (used in: routes)
  createProjectVersionBinding = igAnalyticsStorage.createProjectVersionBinding.bind(igAnalyticsStorage);
  deleteProjectVersionBinding = igAnalyticsStorage.deleteProjectVersionBinding.bind(igAnalyticsStorage);
  getProjectVersionBindings = igAnalyticsStorage.getProjectVersionBindings.bind(igAnalyticsStorage);

  // Post Analytics (used in: routes, cron)
  getAnalyticsByProject = postAnalyticsStorage.getAnalyticsByProject.bind(postAnalyticsStorage);
  createAnalytics = postAnalyticsStorage.createAnalytics.bind(postAnalyticsStorage);
  updateAnalytics = postAnalyticsStorage.updateAnalytics.bind(postAnalyticsStorage);
  deleteAnalytics = postAnalyticsStorage.deleteAnalytics.bind(postAnalyticsStorage);
  getLatestSnapshot = postAnalyticsStorage.getLatestSnapshot.bind(postAnalyticsStorage);
  createSnapshot = postAnalyticsStorage.createSnapshot.bind(postAnalyticsStorage);
  getSnapshots = postAnalyticsStorage.getSnapshots.bind(postAnalyticsStorage);
  getDueAnalytics = postAnalyticsStorage.getDueAnalytics.bind(postAnalyticsStorage);
  createFetchTask = postAnalyticsStorage.createFetchTask.bind(postAnalyticsStorage);
  getPendingTasks = postAnalyticsStorage.getPendingTasks.bind(postAnalyticsStorage);
  updateFetchTask = postAnalyticsStorage.updateFetchTask.bind(postAnalyticsStorage);
}

// Export singleton instance
export const storage = new Storage();

// Export interface for type checking
export type { IStorage };
