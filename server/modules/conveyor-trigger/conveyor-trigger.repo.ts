import { db } from "../../db";
import {
  conveyorItems,
  conveyorSettings,
  type ConveyorItem,
  type ConveyorSettings,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Repository for Conveyor Trigger
 * Direct database interactions
 */
export class ConveyorTriggerRepo {
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
   * Update conveyor settings
   */
  async updateSettings(
    userId: string,
    data: Partial<ConveyorSettings>
  ): Promise<ConveyorSettings | undefined> {
    const [settings] = await db
      .update(conveyorSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conveyorSettings.userId, userId))
      .returning();
    return settings;
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
   * Increment retry count for item
   */
  async incrementRetry(id: string): Promise<ConveyorItem | undefined> {
    const [item] = await db
      .update(conveyorItems)
      .set({
        retryCount: sql`${conveyorItems.retryCount} + 1`,
        status: "processing",
        errorMessage: null,
      })
      .where(eq(conveyorItems.id, id))
      .returning();
    return item;
  }

  /**
   * Update conveyor item
   */
  async updateItem(
    id: string,
    data: Partial<ConveyorItem>
  ): Promise<ConveyorItem | undefined> {
    const [item] = await db
      .update(conveyorItems)
      .set(data)
      .where(eq(conveyorItems.id, id))
      .returning();
    return item;
  }
}
