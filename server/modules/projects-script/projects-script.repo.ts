import { db } from "../../db";
import { sceneRecommendations, type InsertSceneRecommendation, type SceneRecommendation } from "@shared/schema";

/**
 * Projects Script Repository
 * 
 * Содержит запросы к БД для работы с рекомендациями сцен.
 * Остальные методы (getProject, getProjectSteps, getUserApiKey) реализованы в других репозиториях:
 * - ProjectsRepo: getByIdAndUserId, getProjectSteps
 * - ApiKeysRepo: getUserApiKey
 */
export class ProjectsScriptRepo {
  /**
   * Создать массив рекомендаций для сцен
   */
  async createSceneRecommendations(data: InsertSceneRecommendation[]): Promise<SceneRecommendation[]> {
    if (data.length === 0) return [];

    return await db
      .insert(sceneRecommendations)
      .values(data)
      .returning();
  }
}
