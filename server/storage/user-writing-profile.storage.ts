/**
 * User Writing Profile Storage
 * CRUD operations for user writing profiles and feedback entries
 */
import { db } from "../db";
import {
  userWritingProfiles,
  userFeedbackEntries,
  autoScriptVersions,
  type UserWritingProfile,
  type InsertUserWritingProfile,
  type UserFeedbackEntry,
  type InsertUserFeedbackEntry,
  type AutoScriptVersion,
  type InsertAutoScriptVersion,
  type WritingRule,
  type ExtractedPatterns,
} from "@shared/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// ============================================================================
// USER WRITING PROFILE STORAGE
// ============================================================================

export class UserWritingProfileStorage {
  async getOrCreate(userId: string): Promise<UserWritingProfile> {
    const [existing] = await db
      .select()
      .from(userWritingProfiles)
      .where(eq(userWritingProfiles.userId, userId));

    if (existing) return existing;

    const [created] = await db
      .insert(userWritingProfiles)
      .values({ userId })
      .returning();
    return created;
  }

  async getByUserId(userId: string): Promise<UserWritingProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userWritingProfiles)
      .where(eq(userWritingProfiles.userId, userId));
    return profile;
  }

  async update(
    userId: string,
    data: Partial<InsertUserWritingProfile>
  ): Promise<UserWritingProfile | undefined> {
    const [profile] = await db
      .update(userWritingProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userWritingProfiles.userId, userId))
      .returning();
    return profile;
  }

  async addAvoidPattern(userId: string, pattern: string): Promise<void> {
    await db.execute(sql`
      UPDATE user_writing_profiles
      SET
        avoid_patterns = avoid_patterns || ${JSON.stringify([pattern])}::jsonb,
        updated_at = NOW()
      WHERE user_id = ${userId}
      AND NOT (avoid_patterns @> ${JSON.stringify([pattern])}::jsonb)
    `);
  }

  async addPreferPattern(userId: string, pattern: string): Promise<void> {
    await db.execute(sql`
      UPDATE user_writing_profiles
      SET
        prefer_patterns = prefer_patterns || ${JSON.stringify([pattern])}::jsonb,
        updated_at = NOW()
      WHERE user_id = ${userId}
      AND NOT (prefer_patterns @> ${JSON.stringify([pattern])}::jsonb)
    `);
  }

  async addWritingRule(userId: string, rule: WritingRule): Promise<void> {
    await db.execute(sql`
      UPDATE user_writing_profiles
      SET
        writing_rules = writing_rules || ${JSON.stringify([rule])}::jsonb,
        total_feedback_count = total_feedback_count + 1,
        last_feedback_at = NOW(),
        updated_at = NOW()
      WHERE user_id = ${userId}
    `);
  }

  async updateAiSummary(userId: string, summary: string): Promise<void> {
    await db
      .update(userWritingProfiles)
      .set({ aiSummary: summary, updatedAt: new Date() })
      .where(eq(userWritingProfiles.userId, userId));
  }

  async incrementFeedbackCount(userId: string): Promise<void> {
    await db.execute(sql`
      UPDATE user_writing_profiles
      SET
        total_feedback_count = total_feedback_count + 1,
        last_feedback_at = NOW(),
        updated_at = NOW()
      WHERE user_id = ${userId}
    `);
  }
}

export const userWritingProfileStorage = new UserWritingProfileStorage();

// ============================================================================
// USER FEEDBACK ENTRIES STORAGE
// ============================================================================

export class UserFeedbackEntriesStorage {
  async create(data: InsertUserFeedbackEntry): Promise<UserFeedbackEntry> {
    const [entry] = await db
      .insert(userFeedbackEntries)
      .values(data)
      .returning();
    return entry;
  }

  async getById(id: string): Promise<UserFeedbackEntry | undefined> {
    const [entry] = await db
      .select()
      .from(userFeedbackEntries)
      .where(eq(userFeedbackEntries.id, id));
    return entry;
  }

  async getByUser(userId: string, limit = 50): Promise<UserFeedbackEntry[]> {
    return await db
      .select()
      .from(userFeedbackEntries)
      .where(eq(userFeedbackEntries.userId, userId))
      .orderBy(desc(userFeedbackEntries.createdAt))
      .limit(limit);
  }

  async getUnprocessed(userId: string): Promise<UserFeedbackEntry[]> {
    return await db
      .select()
      .from(userFeedbackEntries)
      .where(
        and(
          eq(userFeedbackEntries.userId, userId),
          eq(userFeedbackEntries.appliedToProfile, false)
        )
      )
      .orderBy(userFeedbackEntries.createdAt);
  }

  async markProcessed(
    id: string,
    extractedPatterns: ExtractedPatterns | null
  ): Promise<void> {
    await db
      .update(userFeedbackEntries)
      .set({
        processedAt: new Date(),
        appliedToProfile: true,
        extractedPatterns: extractedPatterns as any,
      })
      .where(eq(userFeedbackEntries.id, id));
  }

  async getRecentForScript(
    autoScriptId: string
  ): Promise<UserFeedbackEntry[]> {
    return await db
      .select()
      .from(userFeedbackEntries)
      .where(eq(userFeedbackEntries.autoScriptId, autoScriptId))
      .orderBy(desc(userFeedbackEntries.createdAt));
  }
}

export const userFeedbackEntriesStorage = new UserFeedbackEntriesStorage();

// ============================================================================
// AUTO SCRIPT VERSIONS STORAGE
// ============================================================================

export class AutoScriptVersionsStorage {
  async create(data: InsertAutoScriptVersion): Promise<AutoScriptVersion> {
    // First, unset isCurrent for all versions of this script
    await db
      .update(autoScriptVersions)
      .set({ isCurrent: false })
      .where(eq(autoScriptVersions.autoScriptId, data.autoScriptId));

    // Create new version as current
    const [version] = await db
      .insert(autoScriptVersions)
      .values({ ...data, isCurrent: true })
      .returning();
    return version;
  }

  async getById(id: string): Promise<AutoScriptVersion | undefined> {
    const [version] = await db
      .select()
      .from(autoScriptVersions)
      .where(eq(autoScriptVersions.id, id));
    return version;
  }

  async getByScriptId(autoScriptId: string): Promise<AutoScriptVersion[]> {
    return await db
      .select()
      .from(autoScriptVersions)
      .where(eq(autoScriptVersions.autoScriptId, autoScriptId))
      .orderBy(desc(autoScriptVersions.versionNumber));
  }

  async getCurrentVersion(
    autoScriptId: string
  ): Promise<AutoScriptVersion | undefined> {
    const [version] = await db
      .select()
      .from(autoScriptVersions)
      .where(
        and(
          eq(autoScriptVersions.autoScriptId, autoScriptId),
          eq(autoScriptVersions.isCurrent, true)
        )
      );
    return version;
  }

  async getLatestVersionNumber(autoScriptId: string): Promise<number> {
    const [result] = await db
      .select({ max: sql<number>`MAX(version_number)` })
      .from(autoScriptVersions)
      .where(eq(autoScriptVersions.autoScriptId, autoScriptId));
    return result?.max || 0;
  }

  async countVersions(autoScriptId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(autoScriptVersions)
      .where(eq(autoScriptVersions.autoScriptId, autoScriptId));
    return Number(result?.count || 0);
  }
}

export const autoScriptVersionsStorage = new AutoScriptVersionsStorage();
