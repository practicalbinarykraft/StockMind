import { relations } from "drizzle-orm";
import { users, apiKeys } from "./auth";
import { rssSources, rssItems } from "./sources-rss";
import { instagramSources } from "./sources-instagram-scraper";
import { projects, projectSteps } from "./projects";
import { scriptVersions, sceneRecommendations } from "./script-versions";
import { igAccounts, igMedia, igMediaInsights, projectVersionBindings } from "./analytics-instagram";
import { conveyorSettings } from "./conveyor";
import { conveyorItems } from "./conveyor-items";
import { autoScripts } from "./auto-scripts";
import { conveyorLogs } from "./conveyor-logs";

export const usersRelations = relations(users, ({ one, many }) => ({
  apiKeys: many(apiKeys),
  rssSources: many(rssSources),
  instagramSources: many(instagramSources),
  projects: many(projects),
  igAccounts: many(igAccounts),
  conveyorSettings: one(conveyorSettings),
  conveyorItems: many(conveyorItems),
  autoScripts: many(autoScripts),
  conveyorLogs: many(conveyorLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const rssSourcesRelations = relations(rssSources, ({ one, many }) => ({
  user: one(users, {
    fields: [rssSources.userId],
    references: [users.id],
  }),
  items: many(rssItems),
}));

export const rssItemsRelations = relations(rssItems, ({ one }) => ({
  source: one(rssSources, {
    fields: [rssItems.sourceId],
    references: [rssSources.id],
  }),
}));

export const instagramSourcesRelations = relations(instagramSources, ({ one }) => ({
  user: one(users, {
    fields: [instagramSources.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  steps: many(projectSteps),
  scriptVersions: many(scriptVersions),
}));

export const projectStepsRelations = relations(projectSteps, ({ one }) => ({
  project: one(projects, {
    fields: [projectSteps.projectId],
    references: [projects.id],
  }),
}));

export const scriptVersionsRelations = relations(scriptVersions, ({ one, many }) => ({
  project: one(projects, {
    fields: [scriptVersions.projectId],
    references: [projects.id],
  }),
  recommendations: many(sceneRecommendations),
  parent: one(scriptVersions, {
    fields: [scriptVersions.parentVersionId],
    references: [scriptVersions.id],
  }),
}));

export const sceneRecommendationsRelations = relations(sceneRecommendations, ({ one }) => ({
  scriptVersion: one(scriptVersions, {
    fields: [sceneRecommendations.scriptVersionId],
    references: [scriptVersions.id],
  }),
}));

export const igAccountsRelations = relations(igAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [igAccounts.userId],
    references: [users.id],
  }),
  media: many(igMedia),
}));

export const igMediaRelations = relations(igMedia, ({ one, many }) => ({
  account: one(igAccounts, {
    fields: [igMedia.igAccountId],
    references: [igAccounts.id],
  }),
  insights: many(igMediaInsights),
  bindings: many(projectVersionBindings),
}));

export const igMediaInsightsRelations = relations(igMediaInsights, ({ one }) => ({
  media: one(igMedia, {
    fields: [igMediaInsights.igMediaId],
    references: [igMedia.id],
  }),
}));

export const projectVersionBindingsRelations = relations(projectVersionBindings, ({ one }) => ({
  project: one(projects, {
    fields: [projectVersionBindings.projectId],
    references: [projects.id],
  }),
  version: one(scriptVersions, {
    fields: [projectVersionBindings.versionId],
    references: [scriptVersions.id],
  }),
  media: one(igMedia, {
    fields: [projectVersionBindings.igMediaId],
    references: [igMedia.id],
  }),
}));

// ============================================================================
// CONVEYOR RELATIONS
// ============================================================================

export const conveyorSettingsRelations = relations(conveyorSettings, ({ one }) => ({
  user: one(users, {
    fields: [conveyorSettings.userId],
    references: [users.id],
  }),
}));

export const conveyorItemsRelations = relations(conveyorItems, ({ one, many }) => ({
  user: one(users, {
    fields: [conveyorItems.userId],
    references: [users.id],
  }),
  parentItem: one(conveyorItems, {
    fields: [conveyorItems.parentItemId],
    references: [conveyorItems.id],
  }),
  autoScripts: many(autoScripts),
  logs: many(conveyorLogs),
}));

export const autoScriptsRelations = relations(autoScripts, ({ one }) => ({
  user: one(users, {
    fields: [autoScripts.userId],
    references: [users.id],
  }),
  conveyorItem: one(conveyorItems, {
    fields: [autoScripts.conveyorItemId],
    references: [conveyorItems.id],
  }),
  project: one(projects, {
    fields: [autoScripts.projectId],
    references: [projects.id],
  }),
}));

export const conveyorLogsRelations = relations(conveyorLogs, ({ one }) => ({
  user: one(users, {
    fields: [conveyorLogs.userId],
    references: [users.id],
  }),
  conveyorItem: one(conveyorItems, {
    fields: [conveyorLogs.conveyorItemId],
    references: [conveyorItems.id],
  }),
}));
