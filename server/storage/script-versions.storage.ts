// Script Versions storage operations
import { db } from "../db";
import { scriptVersions, type ScriptVersion, type InsertScriptVersion } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IScriptVersionsStorage {
  getScriptVersions(projectId: string): Promise<ScriptVersion[]>;
  listScriptVersions(projectId: string): Promise<ScriptVersion[]>;
  getCurrentScriptVersion(projectId: string): Promise<ScriptVersion | undefined>;
  getScriptVersionById(id: string): Promise<ScriptVersion | undefined>;
  getLatestCandidateVersion(projectId: string): Promise<ScriptVersion | undefined>;
  createScriptVersion(data: InsertScriptVersion): Promise<ScriptVersion>;
  updateScriptVersionCurrent(projectId: string, versionId: string): Promise<void>;
  createScriptVersionAtomic(data: InsertScriptVersion): Promise<ScriptVersion>;
  promoteCandidate(projectId: string, candidateId: string): Promise<void>;
  rejectCandidate(projectId: string, candidateId: string): Promise<void>;
  findVersionByIdemKey(projectId: string, idemKey: string): Promise<ScriptVersion[]>;
  markVersionProvenance(versionId: string, prov: any): Promise<void>;
}

export class ScriptVersionsStorage implements IScriptVersionsStorage {
  async getScriptVersions(projectId: string): Promise<ScriptVersion[]> {
    return await db.select().from(scriptVersions).where(eq(scriptVersions.projectId, projectId)).orderBy(desc(scriptVersions.versionNumber));
  }

  async listScriptVersions(projectId: string): Promise<ScriptVersion[]> {
    return await db.select().from(scriptVersions).where(eq(scriptVersions.projectId, projectId)).orderBy(desc(scriptVersions.versionNumber));
  }

  async getCurrentScriptVersion(projectId: string): Promise<ScriptVersion | undefined> {
    const [version] = await db.select().from(scriptVersions).where(and(eq(scriptVersions.projectId, projectId), eq(scriptVersions.isCurrent, true))).limit(1);
    return version;
  }

  async getScriptVersionById(id: string): Promise<ScriptVersion | undefined> {
    const [version] = await db.select().from(scriptVersions).where(eq(scriptVersions.id, id)).limit(1);
    return version;
  }

  async getLatestCandidateVersion(projectId: string): Promise<ScriptVersion | undefined> {
    const [version] = await db.select().from(scriptVersions).where(and(eq(scriptVersions.projectId, projectId), eq(scriptVersions.isCandidate, true))).orderBy(desc(scriptVersions.createdAt)).limit(1);
    return version;
  }

  async createScriptVersion(data: InsertScriptVersion): Promise<ScriptVersion> {
    const [version] = await db.insert(scriptVersions).values(data).returning();
    return version;
  }

  async updateScriptVersionCurrent(projectId: string, versionId: string): Promise<void> {
    await db.update(scriptVersions).set({ isCurrent: false }).where(eq(scriptVersions.projectId, projectId));
    await db.update(scriptVersions).set({ isCurrent: true }).where(eq(scriptVersions.id, versionId));
  }

  async createScriptVersionAtomic(data: InsertScriptVersion): Promise<ScriptVersion> {
    return await db.transaction(async (tx) => {
      await tx.update(scriptVersions).set({ isCurrent: false }).where(eq(scriptVersions.projectId, data.projectId));
      const [newVersion] = await tx.insert(scriptVersions).values(data).returning();
      return newVersion;
    });
  }

  async promoteCandidate(projectId: string, candidateId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(scriptVersions).set({ isCurrent: false }).where(and(eq(scriptVersions.projectId, projectId), eq(scriptVersions.isCurrent, true)));
      await tx.update(scriptVersions).set({ isCurrent: true, isCandidate: false }).where(eq(scriptVersions.id, candidateId));
    });
  }

  async rejectCandidate(projectId: string, candidateId: string): Promise<void> {
    await db.update(scriptVersions).set({ isCandidate: false, isRejected: true }).where(and(eq(scriptVersions.id, candidateId), eq(scriptVersions.projectId, projectId)));
  }

  async findVersionByIdemKey(projectId: string, idemKey: string): Promise<ScriptVersion[]> {
    return await db.select().from(scriptVersions).where(and(eq(scriptVersions.projectId, projectId), sql`${scriptVersions.provenance}::jsonb ->> 'idempotencyKey' = ${idemKey}`)).limit(1);
  }

  async markVersionProvenance(versionId: string, prov: any): Promise<void> {
    await db.execute(sql`
      UPDATE script_versions
      SET provenance = COALESCE(provenance, '{}'::jsonb) || ${JSON.stringify(prov)}::jsonb
      WHERE id = ${versionId}
    `);
  }
}

export const scriptVersionsStorage = new ScriptVersionsStorage();
