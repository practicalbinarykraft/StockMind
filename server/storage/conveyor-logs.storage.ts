/**
 * Conveyor Logs Storage
 * Audit log operations for conveyor events
 */
import { db } from "../db";
import {
  conveyorLogs,
  type ConveyorLog,
  type InsertConveyorLog,
  ConveyorEventType,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// UUID validation regex - same as in conveyor-events.ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalize itemId - returns valid UUID or null
 * Prevents foreign key constraint violations when itemId is not a real UUID (like "scout")
 */
function normalizeItemId(itemId: string | null | undefined): string | null {
  if (!itemId || !UUID_REGEX.test(itemId)) {
    return null;
  }
  return itemId;
}

export interface IConveyorLogsStorage {
  create(data: InsertConveyorLog): Promise<ConveyorLog>;
  getByItem(conveyorItemId: string): Promise<ConveyorLog[]>;
  getByUser(userId: string, limit?: number): Promise<ConveyorLog[]>;
  getByEventType(userId: string, eventType: string): Promise<ConveyorLog[]>;
  getRecentThinking(userId: string, limit?: number): Promise<ConveyorLog[]>;
}

export class ConveyorLogsStorage implements IConveyorLogsStorage {
  async create(data: InsertConveyorLog): Promise<ConveyorLog> {
    const [log] = await db
      .insert(conveyorLogs)
      .values(data)
      .returning();
    return log;
  }

  async getByItem(conveyorItemId: string): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(eq(conveyorLogs.conveyorItemId, conveyorItemId))
      .orderBy(desc(conveyorLogs.createdAt));
  }

  async getByUser(userId: string, limit = 100): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(eq(conveyorLogs.userId, userId))
      .orderBy(desc(conveyorLogs.createdAt))
      .limit(limit);
  }

  async getByEventType(userId: string, eventType: string): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(
        and(
          eq(conveyorLogs.userId, userId),
          eq(conveyorLogs.eventType, eventType)
        )
      )
      .orderBy(desc(conveyorLogs.createdAt));
  }

  // === Helper methods for common log events ===

  async logItemCreated(userId: string, itemId: string, details?: any): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: itemId,
      eventType: ConveyorEventType.ITEM_CREATED,
      details,
    });
  }

  async logStageStarted(
    userId: string,
    itemId: string,
    stageNumber: number,
    agentName: string
  ): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: normalizeItemId(itemId),
      eventType: ConveyorEventType.STAGE_STARTED,
      stageNumber,
      agentName,
    });
  }

  async logStageCompleted(
    userId: string,
    itemId: string,
    stageNumber: number,
    agentName: string,
    details?: any
  ): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: normalizeItemId(itemId),
      eventType: ConveyorEventType.STAGE_COMPLETED,
      stageNumber,
      agentName,
      details,
    });
  }

  async logStageFailed(
    userId: string,
    itemId: string,
    stageNumber: number,
    agentName: string,
    error: string
  ): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: normalizeItemId(itemId),
      eventType: ConveyorEventType.STAGE_FAILED,
      stageNumber,
      agentName,
      details: { error },
    });
  }

  async logError(
    userId: string,
    itemId: string | null,
    error: string,
    details?: any
  ): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: normalizeItemId(itemId),
      eventType: ConveyorEventType.ERROR,
      details: { error, ...details },
    });
  }

  async logLimitReached(userId: string, limitType: 'daily' | 'budget'): Promise<void> {
    const eventType = limitType === 'daily'
      ? ConveyorEventType.DAILY_LIMIT_REACHED
      : ConveyorEventType.BUDGET_LIMIT_REACHED;

    await this.create({
      userId,
      conveyorItemId: null,
      eventType,
    });
  }

  async logScriptApproved(userId: string, scriptId: string): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: null,
      eventType: ConveyorEventType.SCRIPT_APPROVED,
      details: { scriptId },
    });
  }

  async logScriptRejected(
    userId: string,
    scriptId: string,
    reason: string,
    category: string
  ): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: null,
      eventType: ConveyorEventType.SCRIPT_REJECTED,
      details: { scriptId, reason, category },
    });
  }

  /**
   * Get recent thinking events for a user (for loading on page refresh)
   */
  async getRecentThinking(userId: string, limit = 50): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(eq(conveyorLogs.userId, userId))
      .orderBy(desc(conveyorLogs.createdAt))
      .limit(limit);
  }

  /**
   * Log agent thinking event
   */
  async logThinking(
    userId: string,
    itemId: string | null,
    stageNumber: number,
    agentName: string,
    message: string
  ): Promise<void> {
    await this.create({
      userId,
      conveyorItemId: normalizeItemId(itemId),
      eventType: ConveyorEventType.STAGE_THINKING,
      stageNumber,
      agentName,
      details: { message },
    });
  }
}

export const conveyorLogsStorage = new ConveyorLogsStorage();
