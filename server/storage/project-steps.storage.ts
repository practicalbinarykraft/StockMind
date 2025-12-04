// Project Steps storage operations
import { db } from "../db";
import { projectSteps, type ProjectStep, type InsertProjectStep } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Project Steps storage interface
 */
export interface IProjectStepsStorage {
  getProjectSteps(projectId: string): Promise<ProjectStep[]>;
  createProjectStep(data: InsertProjectStep): Promise<ProjectStep>;
  updateProjectStep(id: string, data: Partial<ProjectStep>): Promise<ProjectStep | undefined>;
}

/**
 * Project Steps storage implementation
 * Handles project steps operations
 */
export class ProjectStepsStorage implements IProjectStepsStorage {
  /**
   * Get all project steps for a project
   * Returns only the latest version of each step number
   */
  async getProjectSteps(projectId: string): Promise<ProjectStep[]> {
    // Get all steps first
    const allSteps = await db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.projectId, projectId))
      .orderBy(desc(projectSteps.updatedAt));

    console.log(`[ProjectStepsStorage] Found ${allSteps.length} steps for project ${projectId}:`, {
      stepNumbers: allSteps.map(s => s.stepNumber),
      hasStep3: allSteps.some(s => s.stepNumber === 3),
      step3Data: allSteps.find(s => s.stepNumber === 3)?.data
    });

    // Group by stepNumber and keep only the latest (first) one for each
    const latestStepsMap = new Map<number, ProjectStep>();
    for (const step of allSteps) {
      if (!latestStepsMap.has(step.stepNumber)) {
        latestStepsMap.set(step.stepNumber, step);
      }
    }

    // Convert back to array and sort by stepNumber
    const result = Array.from(latestStepsMap.values()).sort((a, b) => a.stepNumber - b.stepNumber);
    
    console.log(`[ProjectStepsStorage] Returning ${result.length} unique steps:`, {
      stepNumbers: result.map(s => s.stepNumber),
      hasStep3: result.some(s => s.stepNumber === 3)
    });
    
    return result;
  }

  /**
   * Create a new project step
   * Uses upsert logic to update existing step with same projectId and stepNumber
   */
  async createProjectStep(data: InsertProjectStep): Promise<ProjectStep> {
    const [step] = await db
      .insert(projectSteps)
      .values(data)
      .onConflictDoUpdate({
        target: [projectSteps.projectId, projectSteps.stepNumber],
        set: {
          data: sql`excluded.data`,
          completedAt: sql`excluded.completed_at`,
          updatedAt: new Date()
        }
      })
      .returning();
    return step;
  }

  /**
   * Update a project step
   */
  async updateProjectStep(
    id: string,
    data: Partial<ProjectStep>
  ): Promise<ProjectStep | undefined> {
    const [step] = await db
      .update(projectSteps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectSteps.id, id))
      .returning();
    return step;
  }
}

export const projectStepsStorage = new ProjectStepsStorage();
