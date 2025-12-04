/**
 * Auto Scripts Storage
 * CRUD operations for auto-generated scripts pending review
 */
import { db } from "../db";
import {
  autoScripts,
  type AutoScript,
  type InsertAutoScript,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IAutoScriptsStorage {
  create(data: InsertAutoScript): Promise<AutoScript>;
  getById(id: string): Promise<AutoScript | undefined>;
  getByUser(userId: string, status?: string): Promise<AutoScript[]>;
  getPending(userId: string): Promise<AutoScript[]>;
  getForReview(userId: string): Promise<AutoScript[]>;
  countForReview(userId: string): Promise<number>;
  update(id: string, data: Partial<AutoScript>): Promise<AutoScript | undefined>;
  approve(id: string, projectId: string): Promise<AutoScript | undefined>;
  reject(id: string, reason: string, category: string): Promise<AutoScript | undefined>;
  markRevision(id: string, notes: string): Promise<AutoScript | undefined>;
  updateAfterRevision(id: string, data: Partial<AutoScript>): Promise<AutoScript | undefined>;
  resetRevision(id: string): Promise<AutoScript | undefined>;
}

export class AutoScriptsStorage implements IAutoScriptsStorage {
  async create(data: InsertAutoScript): Promise<AutoScript> {
    const [script] = await db
      .insert(autoScripts)
      .values(data)
      .returning();
    return script;
  }

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
          and(
            eq(autoScripts.userId, userId),
            eq(autoScripts.status, status)
          )
        )
        .orderBy(desc(autoScripts.createdAt));
    }

    return await db
      .select()
      .from(autoScripts)
      .where(eq(autoScripts.userId, userId))
      .orderBy(desc(autoScripts.createdAt));
  }

  async getPending(userId: string): Promise<AutoScript[]> {
    return await db
      .select()
      .from(autoScripts)
      .where(
        and(
          eq(autoScripts.userId, userId),
          eq(autoScripts.status, 'pending')
        )
      )
      .orderBy(desc(autoScripts.createdAt));
  }

  async update(id: string, data: Partial<AutoScript>): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set(data)
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  async approve(id: string, libraryScriptId?: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  async reject(id: string, reason: string, category: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        status: 'rejected',
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
        status: 'revision',
        revisionNotes: notes,
        revisionCount: sql`${autoScripts.revisionCount} + 1`,
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  async updateAfterRevision(id: string, data: Partial<AutoScript>): Promise<AutoScript | undefined> {
    const [script] = await db
      .update(autoScripts)
      .set({
        ...data,
        status: 'pending',
        revisionNotes: null,
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
        status: 'pending',
        revisionNotes: null,
        revisionCount: 0,
      })
      .where(eq(autoScripts.id, id))
      .returning();
    return script;
  }

  async getByConveyorItem(conveyorItemId: string): Promise<AutoScript | undefined> {
    const [script] = await db
      .select()
      .from(autoScripts)
      .where(eq(autoScripts.conveyorItemId, conveyorItemId));
    return script;
  }

  async countPending(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(autoScripts)
      .where(
        and(
          eq(autoScripts.userId, userId),
          eq(autoScripts.status, 'pending')
        )
      );
    return Number(result[0]?.count || 0);
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

  /**
   * Count scripts for review - includes both "pending" and "revision" statuses
   */
  async countForReview(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(autoScripts)
      .where(
        and(
          eq(autoScripts.userId, userId),
          sql`${autoScripts.status} IN ('pending', 'revision')`
        )
      );
    return Number(result[0]?.count || 0);
  }
}

export const autoScriptsStorage = new AutoScriptsStorage();
