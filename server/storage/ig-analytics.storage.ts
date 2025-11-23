// Instagram Analytics storage operations
import { db } from "../db";
import {
  igAccounts,
  igMedia,
  igMediaInsights,
  projects,
  projectVersionBindings,
  type IgAccount,
  type IgMedia,
  type InsertIgMedia,
  type IgMediaInsight,
  type InsertIgMediaInsight,
  type ProjectVersionBinding,
  type InsertProjectVersionBinding,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IIgAnalyticsStorage {
  getIgAccounts(userId: string): Promise<IgAccount[]>;
  getAllIgAccounts(): Promise<IgAccount[]>;
  getIgAccountById(id: string, userId: string): Promise<IgAccount | undefined>;
  createIgAccount(userId: string, data: Omit<IgAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IgAccount>;
  updateIgAccount(id: string, userId: string, data: Partial<IgAccount>): Promise<IgAccount | undefined>;
  deleteIgAccount(id: string, userId: string): Promise<void>;
  getIgMedia(accountId: string, filters?: { limit?: number; mediaType?: string }): Promise<IgMedia[]>;
  getIgMediaById(id: string, userId: string): Promise<IgMedia | undefined>;
  upsertIgMedia(data: InsertIgMedia): Promise<IgMedia>;
  updateIgMediaSync(id: string, status: string, error?: string | null, nextSyncAt?: Date | null): Promise<IgMedia | undefined>;
  getIgMediaInsights(igMediaId: string, limit?: number): Promise<IgMediaInsight[]>;
  createIgMediaInsight(data: InsertIgMediaInsight): Promise<IgMediaInsight>;
  createProjectVersionBinding(data: InsertProjectVersionBinding): Promise<ProjectVersionBinding>;
  deleteProjectVersionBinding(id: string, userId: string): Promise<void>;
  getProjectVersionBindings(projectId: string): Promise<ProjectVersionBinding[]>;
}

export class IgAnalyticsStorage implements IIgAnalyticsStorage {
  async getIgAccounts(userId: string): Promise<IgAccount[]> {
    return await db.select().from(igAccounts).where(eq(igAccounts.userId, userId)).orderBy(desc(igAccounts.createdAt));
  }

  async getAllIgAccounts(): Promise<IgAccount[]> {
    return await db.select().from(igAccounts).orderBy(desc(igAccounts.createdAt));
  }

  async getIgAccountById(id: string, userId: string): Promise<IgAccount | undefined> {
    const [account] = await db.select().from(igAccounts).where(and(eq(igAccounts.id, id), eq(igAccounts.userId, userId)));
    return account;
  }

  async createIgAccount(userId: string, data: Omit<IgAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IgAccount> {
    const [account] = await db.insert(igAccounts).values({ userId, ...data } as any).returning();
    return account;
  }

  async updateIgAccount(id: string, userId: string, data: Partial<IgAccount>): Promise<IgAccount | undefined> {
    const [account] = await db.update(igAccounts).set({ ...data, updatedAt: new Date() }).where(and(eq(igAccounts.id, id), eq(igAccounts.userId, userId))).returning();
    return account;
  }

  async deleteIgAccount(id: string, userId: string): Promise<void> {
    await db.delete(igAccounts).where(and(eq(igAccounts.id, id), eq(igAccounts.userId, userId)));
  }

  async getIgMedia(accountId: string, filters?: { limit?: number; mediaType?: string }): Promise<IgMedia[]> {
    const conditions = [eq(igMedia.igAccountId, accountId)];
    if (filters?.mediaType) conditions.push(eq(igMedia.mediaType, filters.mediaType));

    const baseQuery = db.select().from(igMedia).where(and(...conditions)).orderBy(desc(igMedia.publishedAt));
    if (filters?.limit) return await baseQuery.limit(filters.limit);
    return await baseQuery;
  }

  async getIgMediaById(id: string, userId: string): Promise<IgMedia | undefined> {
    const [media] = await db
      .select({ media: igMedia, account: igAccounts })
      .from(igMedia)
      .innerJoin(igAccounts, eq(igMedia.igAccountId, igAccounts.id))
      .where(and(eq(igMedia.id, id), eq(igAccounts.userId, userId)));
    return media?.media;
  }

  async upsertIgMedia(data: InsertIgMedia): Promise<IgMedia> {
    const [media] = await db.insert(igMedia).values(data).onConflictDoUpdate({
      target: igMedia.igMediaId,
      set: { caption: data.caption, thumbnailUrl: data.thumbnailUrl, updatedAt: new Date() },
    }).returning();
    return media;
  }

  async updateIgMediaSync(id: string, status: string, error?: string | null, nextSyncAt?: Date | null): Promise<IgMedia | undefined> {
    const updateData: Partial<IgMedia> = { syncStatus: status as any, lastSyncedAt: new Date(), updatedAt: new Date() };
    if (error !== undefined) updateData.syncError = error;
    if (nextSyncAt !== undefined) updateData.nextSyncAt = nextSyncAt;

    const [media] = await db.update(igMedia).set(updateData).where(eq(igMedia.id, id)).returning();
    return media;
  }

  async getIgMediaInsights(igMediaId: string, limit?: number): Promise<IgMediaInsight[]> {
    let query = db.select().from(igMediaInsights).where(eq(igMediaInsights.igMediaId, igMediaId)).orderBy(desc(igMediaInsights.collectedAt));
    if (limit) query = query.limit(limit) as any;
    return await query;
  }

  async createIgMediaInsight(data: InsertIgMediaInsight): Promise<IgMediaInsight> {
    const [insight] = await db.insert(igMediaInsights).values(data).returning();
    return insight;
  }

  async createProjectVersionBinding(data: InsertProjectVersionBinding): Promise<ProjectVersionBinding> {
    const [binding] = await db.insert(projectVersionBindings).values(data).returning();
    return binding;
  }

  async deleteProjectVersionBinding(id: string, userId: string): Promise<void> {
    const [binding] = await db
      .select({ binding: projectVersionBindings, project: projects })
      .from(projectVersionBindings)
      .innerJoin(projects, eq(projectVersionBindings.projectId, projects.id))
      .where(and(eq(projectVersionBindings.id, id), eq(projects.userId, userId)));

    if (!binding) throw new Error('Binding not found or access denied');
    await db.delete(projectVersionBindings).where(eq(projectVersionBindings.id, id));
  }

  async getProjectVersionBindings(projectId: string): Promise<ProjectVersionBinding[]> {
    return await db.select().from(projectVersionBindings).where(eq(projectVersionBindings.projectId, projectId)).orderBy(desc(projectVersionBindings.createdAt));
  }
}

export const igAnalyticsStorage = new IgAnalyticsStorage();
