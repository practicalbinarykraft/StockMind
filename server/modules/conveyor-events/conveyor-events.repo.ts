import { db } from "../../db";
import { conveyorLogs, type ConveyorLog } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * Repository for Conveyor Events
 * Direct database interactions
 */
export class ConveyorEventsRepo {
  /**
   * Get recent thinking/event logs for user
   */
  async getRecentThinking(userId: string, limit: number): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(
        and(
          eq(conveyorLogs.userId, userId),
          sql`${conveyorLogs.eventType} IN ('stage_thinking', 'agent_message', 'stage_started', 'stage_completed')`
        )
      )
      .orderBy(desc(conveyorLogs.createdAt))
      .limit(limit);
  }
}
