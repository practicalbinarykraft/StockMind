/**
 * Conveyor Items Storage
 * CRUD operations for conveyor pipeline items
 */
import { db } from "../db";
import {
  conveyorItems,
  type ConveyorItem,
  type InsertConveyorItem,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IConveyorItemsStorage {
  create(data: InsertConveyorItem): Promise<ConveyorItem>;
  getById(id: string): Promise<ConveyorItem | undefined>;
  getByUser(userId: string, limit?: number): Promise<ConveyorItem[]>;
  getProcessing(userId: string): Promise<ConveyorItem[]>;
  countProcessing(userId: string): Promise<number>;
  getFailed(userId: string): Promise<ConveyorItem[]>;
  update(id: string, data: Partial<ConveyorItem>): Promise<ConveyorItem | undefined>;
  updateStageData(id: string, stage: number, data: any): Promise<void>;
  markCompleted(id: string, totalMs: number): Promise<void>;
  markFailed(id: string, stage: number, error: string): Promise<void>;
  incrementRetry(id: string): Promise<void>;
  exists(sourceType: string, sourceItemId: string, userId: string): Promise<boolean>;
}

export class ConveyorItemsStorage implements IConveyorItemsStorage {
  async create(data: InsertConveyorItem): Promise<ConveyorItem> {
    const [item] = await db
      .insert(conveyorItems)
      .values(data)
      .returning();
    return item;
  }

  async getById(id: string): Promise<ConveyorItem | undefined> {
    const [item] = await db
      .select()
      .from(conveyorItems)
      .where(eq(conveyorItems.id, id));
    return item;
  }

  async getByUser(userId: string, limit = 50): Promise<ConveyorItem[]> {
    return await db
      .select()
      .from(conveyorItems)
      .where(eq(conveyorItems.userId, userId))
      .orderBy(desc(conveyorItems.startedAt))
      .limit(limit);
  }

  async getProcessing(userId: string): Promise<ConveyorItem[]> {
    return await db
      .select()
      .from(conveyorItems)
      .where(
        and(
          eq(conveyorItems.userId, userId),
          eq(conveyorItems.status, 'processing')
        )
      )
      .orderBy(desc(conveyorItems.startedAt));
  }

  async countProcessing(userId: string): Promise<number> {
    const [result] = await db
      .select({
        count: sql`COUNT(*)`,
      })
      .from(conveyorItems)
      .where(
        and(
          eq(conveyorItems.userId, userId),
          eq(conveyorItems.status, 'processing')
        )
      );
    return Number(result?.count || 0);
  }

  async getFailed(userId: string): Promise<ConveyorItem[]> {
    return await db
      .select()
      .from(conveyorItems)
      .where(
        and(
          eq(conveyorItems.userId, userId),
          eq(conveyorItems.status, 'failed')
        )
      )
      .orderBy(desc(conveyorItems.startedAt));
  }

  async update(id: string, data: Partial<ConveyorItem>): Promise<ConveyorItem | undefined> {
    const [item] = await db
      .update(conveyorItems)
      .set(data)
      .where(eq(conveyorItems.id, id))
      .returning();
    return item;
  }

  async updateStageData(id: string, stage: number, data: any): Promise<void> {
    const stageFieldMap: Record<number, string> = {
      1: 'sourceData',
      2: 'scoringData',
      3: 'analysisData',
      4: 'architectureData',
      5: 'scriptData',
      6: 'qcData',
      7: 'optimizationData',
      8: 'gateData',
    };

    const field = stageFieldMap[stage];
    if (!field) return;

    await db
      .update(conveyorItems)
      .set({
        [field]: data,
        currentStage: stage,
      })
      .where(eq(conveyorItems.id, id));
  }

  async addStageHistory(id: string, entry: any): Promise<void> {
    await db
      .update(conveyorItems)
      .set({
        stageHistory: sql`${conveyorItems.stageHistory} || ${JSON.stringify([entry])}::jsonb`,
      })
      .where(eq(conveyorItems.id, id));
  }

  async markCompleted(id: string, totalMs: number): Promise<void> {
    await db
      .update(conveyorItems)
      .set({
        status: 'completed',
        completedAt: new Date(),
        totalProcessingMs: totalMs,
      })
      .where(eq(conveyorItems.id, id));
  }

  async markFailed(id: string, stage: number, error: string): Promise<void> {
    await db
      .update(conveyorItems)
      .set({
        status: 'failed',
        errorStage: stage,
        errorMessage: error,
        completedAt: new Date(),
      })
      .where(eq(conveyorItems.id, id));
  }

  async incrementRetry(id: string): Promise<void> {
    await db
      .update(conveyorItems)
      .set({
        retryCount: sql`${conveyorItems.retryCount} + 1`,
        status: 'processing',
        errorStage: null,
        errorMessage: null,
      })
      .where(eq(conveyorItems.id, id));
  }

  async addCost(id: string, cost: number): Promise<void> {
    await db
      .update(conveyorItems)
      .set({
        totalCost: sql`${conveyorItems.totalCost} + ${cost}`,
      })
      .where(eq(conveyorItems.id, id));
  }

  async exists(sourceType: string, sourceItemId: string, userId: string): Promise<boolean> {
    const [item] = await db
      .select({ id: conveyorItems.id })
      .from(conveyorItems)
      .where(
        and(
          eq(conveyorItems.sourceType, sourceType),
          eq(conveyorItems.sourceItemId, sourceItemId),
          eq(conveyorItems.userId, userId)
        )
      )
      .limit(1);
    return !!item;
  }

  /**
   * Create a new conveyor item for revision processing
   * Copies stage data from parent item and sets revisionContext
   */
  async createForRevision(
    parentItem: ConveyorItem,
    revisionContext: {
      notes: string;
      previousScriptId: string;
      attempt: number;
      previousVersions: Array<{
        versionNumber: number;
        fullScript: string;
        scenes: any[];
        feedbackText: string | null;
      }>;
      selectedSceneIds?: number[];
    }
  ): Promise<ConveyorItem> {
    const [item] = await db
      .insert(conveyorItems)
      .values({
        userId: parentItem.userId,
        sourceType: parentItem.sourceType,
        sourceItemId: parentItem.sourceItemId,
        status: 'processing',
        parentItemId: parentItem.id,
        revisionContext: revisionContext as any,
        // Copy stage data from parent (stages 1-4)
        sourceData: parentItem.sourceData,
        scoringData: parentItem.scoringData,
        analysisData: parentItem.analysisData,
        architectureData: parentItem.architectureData,
        currentStage: 5, // Start from Writer stage
      })
      .returning();
    return item;
  }

  /**
   * Get revision items by parent item ID
   */
  async getByParentId(parentItemId: string): Promise<ConveyorItem[]> {
    return await db
      .select()
      .from(conveyorItems)
      .where(eq(conveyorItems.parentItemId, parentItemId))
      .orderBy(desc(conveyorItems.startedAt));
  }

  /**
   * Mark stuck items as failed
   * Items in 'processing' status for more than specified minutes are considered stuck
   */
  async markStuckItemsAsFailed(timeoutMinutes: number = 60): Promise<number> {
    const result = await db
      .update(conveyorItems)
      .set({
        status: 'failed',
        errorMessage: `Timeout: stuck in processing for more than ${timeoutMinutes} minutes`,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(conveyorItems.status, 'processing'),
          sql`${conveyorItems.startedAt} < NOW() - INTERVAL '${sql.raw(String(timeoutMinutes))} minutes'`
        )
      )
      .returning({ id: conveyorItems.id });
    return result.length;
  }
}

export const conveyorItemsStorage = new ConveyorItemsStorage();
