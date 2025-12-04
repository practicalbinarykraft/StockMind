/**
 * Conveyor Settings Storage
 * CRUD operations for user conveyor settings
 */
import { db } from "../db";
import {
  conveyorSettings,
  type ConveyorSettings,
  type InsertConveyorSettings,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface IConveyorSettingsStorage {
  getSettings(userId: string): Promise<ConveyorSettings | undefined>;
  createSettings(userId: string, data?: Partial<InsertConveyorSettings>): Promise<ConveyorSettings>;
  updateSettings(userId: string, data: Partial<ConveyorSettings>): Promise<ConveyorSettings | undefined>;
  getEnabledUsers(): Promise<ConveyorSettings[]>;
  incrementDailyCount(userId: string): Promise<void>;
  addCost(userId: string, cost: number): Promise<void>;
  resetDailyCounts(): Promise<void>;
  resetMonthlyCosts(): Promise<void>;
}

export class ConveyorSettingsStorage implements IConveyorSettingsStorage {
  async getSettings(userId: string): Promise<ConveyorSettings | undefined> {
    const [settings] = await db
      .select()
      .from(conveyorSettings)
      .where(eq(conveyorSettings.userId, userId));
    return settings;
  }

  async createSettings(
    userId: string,
    data?: Partial<InsertConveyorSettings>
  ): Promise<ConveyorSettings> {
    const [settings] = await db
      .insert(conveyorSettings)
      .values({ userId, ...data })
      .returning();
    return settings;
  }

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

  async getEnabledUsers(): Promise<ConveyorSettings[]> {
    return await db
      .select()
      .from(conveyorSettings)
      .where(eq(conveyorSettings.enabled, true));
  }

  async incrementDailyCount(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        itemsProcessedToday: sql`${conveyorSettings.itemsProcessedToday} + 1`,
        totalProcessed: sql`${conveyorSettings.totalProcessed} + 1`,
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  async addCost(userId: string, cost: number): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        currentMonthCost: sql`${conveyorSettings.currentMonthCost} + ${cost}`,
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  async resetDailyCounts(): Promise<void> {
    const resetTime = new Date();
    const result = await db
      .update(conveyorSettings)
      .set({
        itemsProcessedToday: 0,
        lastResetAt: resetTime,
      })
      .returning({ id: conveyorSettings.id });

    logger.info("[Conveyor Settings] Daily counts reset", {
      resetCount: result.length,
      resetTime: resetTime.toISOString(),
    });
  }

  /**
   * Check if the daily counter should be reset for a user
   * Returns true if reset was performed
   */
  async checkAndResetDailyCount(userId: string): Promise<boolean> {
    const settings = await this.getSettings(userId);
    if (!settings) return false;

    const now = new Date();
    const lastReset = new Date(settings.lastResetAt);

    // Check if lastResetAt was on a different day (compare dates without time)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastResetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());

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

  async resetMonthlyCosts(): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        currentMonthCost: '0',
        budgetResetAt: new Date(),
      });
  }

  async incrementPassed(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        totalPassed: sql`${conveyorSettings.totalPassed} + 1`,
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  async incrementFailed(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        totalFailed: sql`${conveyorSettings.totalFailed} + 1`,
      })
      .where(eq(conveyorSettings.userId, userId));
  }

  async incrementApproved(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        totalApproved: sql`${conveyorSettings.totalApproved} + 1`,
      })
      .where(eq(conveyorSettings.userId, userId));

    // Update approval rate
    await this.updateApprovalRate(userId);
  }

  async incrementRejected(userId: string): Promise<void> {
    await db
      .update(conveyorSettings)
      .set({
        totalRejected: sql`${conveyorSettings.totalRejected} + 1`,
      })
      .where(eq(conveyorSettings.userId, userId));

    // Update approval rate
    await this.updateApprovalRate(userId);
  }

  private async updateApprovalRate(userId: string): Promise<void> {
    const settings = await this.getSettings(userId);
    if (!settings) return;

    const total = settings.totalApproved + settings.totalRejected;
    if (total === 0) return;

    const rate = settings.totalApproved / total;
    await db
      .update(conveyorSettings)
      .set({ approvalRate: rate.toFixed(4) })
      .where(eq(conveyorSettings.userId, userId));
  }
}

export const conveyorSettingsStorage = new ConveyorSettingsStorage();
