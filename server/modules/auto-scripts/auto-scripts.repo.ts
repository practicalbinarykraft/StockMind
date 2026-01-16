import { db } from "../../db";
import {
  autoScripts,
  userWritingProfiles,
  userFeedbackEntries,
  autoScriptVersions,
  conveyorItems,
  type AutoScript,
  type UserWritingProfile,
  type UserFeedbackEntry,
  type AutoScriptVersion,
  type ConveyorItem,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Repository for Auto Scripts
 * Direct database interactions
 */
export class AutoScriptsRepo {
  // ============================================================================
  // AUTO SCRIPTS
  // ============================================================================

  async getById(id: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .select()
      .from(autoScripts)
      .where(eq(autoScripts.id, id));
    return script;
  }

  async getByUser(userId: string, status?: string): Promise<AutoScript[]> {
    if (status) {
      return await db
        .select()
        .from(autoScripts)
        .where(
          and(eq(autoScripts.userId, userId), eq(autoScripts.status, status))
        )
        .orderBy(desc(autoScripts.createdAt));
    }

    return await db
      .select()
      .from(autoScripts)
      .where(eq(autoScripts.userId, userId))
      .orderBy(desc(autoScripts.createdAt));
  }

  /**
   * Get scripts for review - includes both "pending" and "revision" statuses
   * This ensures scripts being revised don't disappear from the UI
   */
  async getForReview(userId: string): Promise<AutoScript[]> {
    return await db
      .select()
      .from(autoScripts)
      .where(
        and(
          eq(autoScripts.userId, userId),
          sql`${autoScripts.status} IN ('pending', 'revision')`
        )
      )
      .orderBy(desc(autoScripts.createdAt));
  }

  async countPending(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(autoScripts)
      .where(
        and(eq(autoScripts.userId, userId), eq(autoScripts.status, "pending"))
      );
    return Number(result[0]?.count || 0);
  }

  async approve(id: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        status: "approved",
        reviewedAt: new Date(),
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  async reject(
    id: string,
    reason: string,
    category: string
  ): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        status: "rejected",
        rejectionReason: reason,
        rejectionCategory: category,
        reviewedAt: new Date(),
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  async markRevision(id: string, notes: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        status: "revision",
        revisionNotes: notes,
        revisionCount: sql`${autoScripts.revisionCount} + 1`,
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  /**
   * Reset a stuck revision - returns status to pending and resets revisionCount
   * Use this when revision processing fails or times out
   */
  async resetRevision(id: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        status: "pending",
        revisionNotes: null,
        revisionCount: 0,
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  // ============================================================================
  // USER WRITING PROFILE
  // ============================================================================

  async getWritingProfile(
    userId: string
  ): Promise<UserWritingProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userWritingProfiles)
      .where(eq(userWritingProfiles.userId, userId));
    return profile;
  }

  async updateWritingProfile(
    userId: string,
    data: Partial<UserWritingProfile>
  ): Promise<UserWritingProfile | undefined> {
    const [profile] = await db
      .update(userWritingProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userWritingProfiles.userId, userId))
      .returning();
    return profile;
  }

  // ============================================================================
  // FEEDBACK ENTRIES
  // ============================================================================

  async getFeedbackHistory(
    userId: string,
    limit: number
  ): Promise<UserFeedbackEntry[]> {
    return await db
      .select()
      .from(userFeedbackEntries)
      .where(eq(userFeedbackEntries.userId, userId))
      .orderBy(desc(userFeedbackEntries.createdAt))
      .limit(limit);
  }

  // ============================================================================
  // SCRIPT VERSIONS
  // ============================================================================

  async getScriptVersions(autoScriptId: string): Promise<AutoScriptVersion[]> {
    return await db
      .select()
      .from(autoScriptVersions)
      .where(eq(autoScriptVersions.autoScriptId, autoScriptId))
      .orderBy(desc(autoScriptVersions.versionNumber));
  }

  // ============================================================================
  // CONVEYOR ITEMS
  // ============================================================================

  async getConveyorItemById(id: string): Promise<ConveyorItem | undefined> {
    const [item] = await db
      .select()
      .from(conveyorItems)
      .where(eq(conveyorItems.id, id));
    return item;
  }
}
