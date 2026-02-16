import { db } from "../../db";
import {
  sceneCompositions,
  type SceneComposition,
  type InsertSceneComposition,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export class SceneCompositionsRepo {
  async getBySceneId(sceneId: string): Promise<SceneComposition | undefined> {
    const [row] = await db
      .select()
      .from(sceneCompositions)
      .where(eq(sceneCompositions.sceneId, sceneId))
      .limit(1);
    return row;
  }

  async create(data: InsertSceneComposition): Promise<SceneComposition> {
    const [row] = await db
      .insert(sceneCompositions)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    if (!row) throw new Error("Failed to create scene composition");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<SceneComposition, "id" | "sceneId" | "scriptId" | "createdAt">>
  ): Promise<SceneComposition | undefined> {
    const [updated] = await db
      .update(sceneCompositions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneCompositions.id, id))
      .returning();
    return updated;
  }

  async createOrUpdate(
    sceneId: string,
    scriptId: string,
    data: Partial<Omit<SceneComposition, "id" | "sceneId" | "scriptId" | "createdAt">>
  ): Promise<SceneComposition> {
    const existing = await this.getBySceneId(sceneId);
    if (existing) {
      const updated = await this.update(existing.id, data);
      return updated ?? existing;
    }
    return await this.create({
      sceneId,
      scriptId,
      ...data,
    });
  }

  async getByScriptId(scriptId: string): Promise<SceneComposition[]> {
    return await db
      .select()
      .from(sceneCompositions)
      .where(eq(sceneCompositions.scriptId, scriptId));
  }
}

export const sceneCompositionsRepo = new SceneCompositionsRepo();
