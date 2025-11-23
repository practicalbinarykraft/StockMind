import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projects } from './projects';

// ============================================================================
// SCRIPT VERSIONS TABLE (Version history for scene editing)
// ============================================================================

export const scriptVersions = pgTable("script_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),

  versionNumber: integer("version_number").notNull(),
  createdBy: varchar("created_by", { length: 20 }).notNull(), // 'user' | 'ai' | 'system'

  fullScript: text("full_script").notNull(),
  scenes: jsonb("scenes").notNull(), // Array of scene objects with id, start, end, text, label, etc.

  changes: jsonb("changes"), // Change metadata: { type, affectedScenes, description }

  provenance: jsonb("provenance"), // { source: 'ai_recommendation'|'manual_edit'|'bulk_apply'|'revert', agent?: string, userId?: string, ts: string }
  diff: jsonb("diff"), // Array of { sceneId: number, before: string, after: string }

  analysisResult: jsonb("analysis_result"), // Cached AI analysis for this version
  analysisScore: integer("analysis_score"), // Overall score 0-100

  isCurrent: boolean("is_current").default(false).notNull(),
  parentVersionId: varchar("parent_version_id").references((): any => scriptVersions.id),

  // Reanalyze comparison fields
  isCandidate: boolean("is_candidate").default(false).notNull(), // Candidate version from reanalyze
  isRejected: boolean("is_rejected").default(false).notNull(), // Candidate was rejected/cancelled
  baseVersionId: varchar("base_version_id").references((): any => scriptVersions.id), // Base version for comparison
  metrics: jsonb("metrics"), // { overallScore, hookScore, structureScore, emotionalScore, ctaScore, predicted: {...}, perScene: [...] }
  review: text("review"), // Final review/summary for this version

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("script_versions_project_idx").on(table.projectId, table.versionNumber),
  index("script_versions_current_idx").on(table.projectId, table.isCurrent),
  index("script_versions_proj_desc_idx").on(table.projectId, sql`${table.versionNumber} DESC`),
  uniqueIndex("uniq_script_current").on(table.projectId).where(sql`${table.isCurrent} = true`),
]);

export const insertScriptVersionSchema = createInsertSchema(scriptVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertScriptVersion = z.infer<typeof insertScriptVersionSchema>;
export type ScriptVersion = typeof scriptVersions.$inferSelect;

// ============================================================================
// SCENE RECOMMENDATIONS TABLE (AI-generated recommendations per scene)
// ============================================================================

export const sceneRecommendations = pgTable("scene_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptVersionId: varchar("script_version_id").notNull().references(() => scriptVersions.id, { onDelete: 'cascade' }),
  sceneId: integer("scene_id").notNull(), // Scene number (1, 2, 3, 4)

  priority: varchar("priority", { length: 10 }).notNull(), // 'high' | 'medium' | 'low'
  area: varchar("area", { length: 50 }).notNull(), // 'hook' | 'cta' | 'pacing' | 'emotional' | etc

  currentText: text("current_text").notNull(),
  suggestedText: text("suggested_text").notNull(),

  reasoning: text("reasoning").notNull(),
  expectedImpact: varchar("expected_impact", { length: 100 }).notNull(), // "+18 points" | "+35% saves"

  // Enhanced recommendation tracking
  sourceAgent: varchar("source_agent", { length: 20 }), // 'hook' | 'structure' | 'emotional' | 'cta' | 'general'
  scoreDelta: integer("score_delta"), // Expected score boost (0-100)
  confidence: real("confidence"), // AI confidence in recommendation (0-1)

  applied: boolean("applied").default(false).notNull(),
  appliedAt: timestamp("applied_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("scene_recommendations_version_idx").on(table.scriptVersionId),
  index("scene_recommendations_scene_idx").on(table.sceneId),
  index("scene_recommendations_version_applied_idx").on(table.scriptVersionId, table.applied),
]);

export const insertSceneRecommendationSchema = createInsertSchema(sceneRecommendations).omit({
  id: true,
  applied: true,
  appliedAt: true,
  createdAt: true,
});

export type InsertSceneRecommendation = z.infer<typeof insertSceneRecommendationSchema>;
export type SceneRecommendation = typeof sceneRecommendations.$inferSelect;
