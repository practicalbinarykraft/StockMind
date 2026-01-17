import { db } from "../../db";
import { conveyorItems, conveyorLogs, type ConveyorItem, type ConveyorLog } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Repository for Conveyor Progress
 * Direct database interactions
 */
export class ConveyorProgressRepo {
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
   * Get logs for a specific conveyor item
   */
  async getLogsByItem(itemId: string): Promise<ConveyorLog[]> {
    return await db
      .select()
      .from(conveyorLogs)
      .where(eq(conveyorLogs.conveyorItemId, itemId));
  }
}
