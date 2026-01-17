import { db } from "../../db";
import {
  conveyorItems,
  conveyorLogs,
  conveyorSettings,
  autoScripts,
  type ConveyorItem,
  type ConveyorLog,
  type ConveyorSettings,
  type AutoScript,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Repository for Conveyor Status
 * Direct database interactions
 */
export class ConveyorStatusRepo {
  /**
   * Get conveyor settings for user
   */
  async getSettings(userId: string): Promise<ConveyorSettings | undefined> {
    const [settings] = await db
      .select()
      .from(conveyorSettings)
      .where(eq(conveyorSettings.userId, userId));
    return settings;
  }

  /**
   * Get pending scripts count
   */
  async getPendingScriptsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(autoScripts)
      .where(
        and(eq(autoScripts.userId, userId), eq(autoScripts.status, "pending"))
      );
    return Number(result[0]?.count || 0);
  }

  /**
   * Get pending scripts
   */
  async getPendingScripts(userId: string): Promise<AutoScript[]> {
    return await db
      .select()
      .from(autoScripts)
      .where(
        and(eq(autoScripts.userId, userId), eq(autoScripts.status, "pending"))
      )
      .orderBy(desc(autoScripts.createdAt));
  }

  /**
   * Get processing items count
   */
  async getProcessingCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(conveyorItems)
      .where(
        and(
          eq(conveyorItems.userId, userId),
          eq(conveyorItems.status, "processing")
        )
      );
    return Number(result[0]?.count || 0);
  }

  /**
   * Get conveyor items for user
   */
  async getItemsByUser(userId: string, limit: number): Promise<ConveyorItem[]> {
    return await db
      .select()
      .from(conveyorItems)
      .where(eq(conveyorItems.userId, userId))
      .orderBy(desc(conveyorItems.startedAt))
      .limit(limit);
  }

  /**
   * Get conveyor item by ID
   */
  async getItemById(id: string): Promise<ConveyorItem | undefined> {
    const [item] = await db
      .select()
      .from(conveyorItems)
      .where(eq(conveyorItems.id, id));
    return item;
  }

  /**
   * Get script associated with conveyor item
   */
  async getScriptByConveyorItem(
    conveyorItemId: string
  ): Promise<AutoScript | undefined> {
    const [script] = await db
      .select()
      .from(autoScripts)
      .where(eq(autoScripts.conveyorItemId, conveyorItemId))
      .orderBy(desc(autoScripts.createdAt))
      .limit(1);
    return script;
  }

  /**
   * Get failed items for user
   */
  async getFailedItems(userId: string): Promise<ConveyorItem[]> {
    return await db
      .select()
      .from(conveyorItems)
      .where(
        and(eq(conveyorItems.userId, userId), eq(conveyorItems.status, "failed"))
      )
      .orderBy(desc(conveyorItems.startedAt));
  }

  /**
   * Get conveyor logs for user
   */
  async getLogsByUser(userId: string, limit: number): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(eq(conveyorLogs.userId, userId))
      .orderBy(desc(conveyorLogs.createdAt))
      .limit(limit);
  }
}
