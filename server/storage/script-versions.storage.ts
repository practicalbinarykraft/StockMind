// Script Versions storage operations
import { db } from "../db";
import { scriptVersions, type ScriptVersion, type InsertScriptVersion } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IScriptVersionsStorage {
  getScriptVersions(projectId: string): Promise<ScriptVersion[]>;
  getScriptVersionById(id: string): Promise<ScriptVersion | undefined>;
  // Removed: listScriptVersions, getCurrentScriptVersion, getLatestCandidateVersion, createScriptVersion, updateScriptVersionCurrent, createScriptVersionAtomic, promoteCandidate, rejectCandidate, findVersionByIdemKey, markVersionProvenance
  // Use modules/script-versions/script-versions.repo.ts instead
}

export class ScriptVersionsStorage implements IScriptVersionsStorage {
  async getScriptVersions(projectId: string): Promise<ScriptVersion[]> {
    return await db.select().from(scriptVersions).where(eq(scriptVersions.projectId, projectId)).orderBy(desc(scriptVersions.versionNumber));
  }

  async getScriptVersionById(id: string): Promise<ScriptVersion | undefined> {
    const [version] = await db.select().from(scriptVersions).where(eq(scriptVersions.id, id)).limit(1);
    return version;
  }
}

export const scriptVersionsStorage = new ScriptVersionsStorage();
