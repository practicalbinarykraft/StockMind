import { db } from "../../db";
import {
  conveyorSettings,
  type ConveyorSettings,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

/**
 * Repository for Conveyor Settings
 * Direct database interactions
 */
export class ConveyorSettingsRepo {
  /**
   * Get settings for user
   */
  async getByUserId(userId: string): Promise<ConveyorSettings | undefined> {
    const [settings] = await db
      .select()
      .from(conveyorSettings)
      .where(eq(conveyorSettings.userId, userId));
    return settings;
  }

  /**
   * Create default settings for user
   */
  async create(userId: string, data?: Partial<ConveyorSettings>): Promise<ConveyorSettings> {
    const [settings] = await db
      .insert(conveyorSettings)
      .values({ userId, ...data })
      .returning();
    return settings;
  }

  /**
   * Update settings for user
   */
  async update(
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
   * Check and reset daily counter if needed
   * Returns true if reset was performed
   */
  async checkAndResetDailyCount(userId: string): Promise<boolean> {
    const settings = await this.getByUserId(userId);
    if (!settings) return false;

    const now = new Date();
    const lastReset = new Date(settings.lastResetAt);

    // Check if lastResetAt was on a different day (compare dates without time)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastResetDate = new Date(
      lastReset.getFullYear(),
      lastReset.getMonth(),
      lastReset.getDate()
    );

    if (nowDate.getTime() > lastResetDate.getTime()) {
      // It's a new day - reset the counter
      await db
        .update(conveyorSettings)
        .set({
          itemsProcessedToday: 0,
          lastResetAt: now,
        })
        .where(eq(conveyorSettings.userId, userId));

      logger.info("[Conveyor Settings] Daily count reset for user", {
        userId,
        previousCount: settings.itemsProcessedToday,
        resetTime: now.toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Increment daily count by 1
   */
  async incrementDailyCount(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        itemsProcessedToday: sql`${conveyorSettings.itemsProcessedToday} + 1`,
        totalProcessed: sql`${conveyorSettings.totalProcessed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  /**
   * Add cost to monthly total
   */
  async addCost(userId: string, cost: number): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        currentMonthCost: sql`${conveyorSettings.currentMonthCost} + ${cost}`,
        updatedAt: new Date(),
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  /**
   * Increment passed count
   */
  async incrementPassed(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        totalPassed: sql`${conveyorSettings.totalPassed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  /**
   * Increment failed count
   */
  async incrementFailed(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        totalFailed: sql`${conveyorSettings.totalFailed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conveyorSettings.userId, userId));
  }
}
