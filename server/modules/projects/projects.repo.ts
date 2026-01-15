import { db } from "../../db";
import {
  projects,
  projectSteps,
  instagramItems,
  rssItems,
  scriptVersions,
  type Project,
  type ProjectStep,
  type InsertProject,
  type InsertProjectStep,
  type ScriptVersion,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Projects Repository
 * Прямое взаимодействие с БД, CRUD-операции, без бизнес-логики
 */
export class ProjectsRepo {
  // ============================================================================
  // PROJECTS
  // ============================================================================

  async getAll(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getById(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getByIdAndUserId(id: string, userId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  async create(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({ ...data, userId })
      .returning();
    return project;
  }

  async update(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return project;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await db
      .update(projects)
      .set({ status: 'deleted', deletedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async permanentDelete(id: string, userId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async createFromInstagramAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    instagramItemId: string
  ): Promise<Project> {
    return await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({ ...projectData, userId })
        .returning();

      await tx
        .insert(projectSteps)
        .values({ ...stepData, projectId: project.id });

      await tx
        .update(instagramItems)
        .set({ usedInProject: project.id })
        .where(eq(instagramItems.id, instagramItemId));

      return project;
    });
  }

  async createFromNewsAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    newsItemId: string,
    step3Data?: InsertProjectStep
  ): Promise<Project> {
    return await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({ ...projectData, userId })
        .returning();

      await tx
        .insert(projectSteps)
        .values({ ...stepData, projectId: project.id });

      if (step3Data) {
        await tx
          .insert(projectSteps)
          .values({ ...step3Data, projectId: project.id });
      }

      await tx
        .update(rssItems)
        .set({ usedInProject: project.id, userAction: 'selected' })
        .where(eq(rssItems.id, newsItemId));

      return project;
    });
  }

  // ============================================================================
  // PROJECT STEPS
  // ============================================================================

  async getProjectSteps(projectId: string): Promise<ProjectStep[]> {
    const allSteps = await db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.projectId, projectId))
      .orderBy(desc(projectSteps.updatedAt));

    // Group by stepNumber and keep only the latest (first) one for each
    const latestStepsMap = new Map<number, ProjectStep>();
    for (const step of allSteps) {
      if (!latestStepsMap.has(step.stepNumber)) {
        latestStepsMap.set(step.stepNumber, step);
      }
    }

    return Array.from(latestStepsMap.values()).sort((a, b) => a.stepNumber - b.stepNumber);
  }

  async createProjectStep(data: InsertProjectStep): Promise<ProjectStep> {
    const [step] = await db
      .insert(projectSteps)
      .values(data)
      .returning();
    return step;
  }

  async updateProjectStep(id: string, data: Partial<ProjectStep>): Promise<ProjectStep | undefined> {
    const [step] = await db
      .update(projectSteps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectSteps.id, id))
      .returning();
    return step;
  }

  // ============================================================================
  // SCRIPT VERSIONS
  // ============================================================================

  async getScriptVersions(projectId: string): Promise<ScriptVersion[]> {
    return await db
      .select()
      .from(scriptVersions)
      .where(eq(scriptVersions.projectId, projectId))
      .orderBy(desc(scriptVersions.versionNumber));
  }

  async getCurrentScriptVersion(projectId: string): Promise<ScriptVersion | undefined> {
    const [version] = await db
      .select()
      .from(scriptVersions)
      .where(and(eq(scriptVersions.projectId, projectId), eq(scriptVersions.isCurrent, true)))
      .limit(1);
    return version;
  }

  async createScriptVersionAtomic(data: any): Promise<ScriptVersion> {
    return await db.transaction(async (tx) => {
      await tx
        .update(scriptVersions)
        .set({ isCurrent: false })
        .where(eq(scriptVersions.projectId, data.projectId));
      
      const [newVersion] = await tx
        .insert(scriptVersions)
        .values(data)
        .returning();
      
      return newVersion;
    });
  }

  // ============================================================================
  // RSS ITEMS (для clearUsedInProject)
  // ============================================================================

  async clearRssItemsUsedInProject(projectId: string): Promise<void> {
    await db
      .update(rssItems)
      .set({ usedInProject: null, userAction: null })
      .where(eq(rssItems.usedInProject, projectId));
  }

  async updateRssItem(itemId: string, data: Partial<any>): Promise<void> {
    await db
      .update(rssItems)
      .set(data)
      .where(eq(rssItems.id, itemId));
  } // to do есть в news.repo

  // ============================================================================
  // INSTAGRAM ITEMS (для clearUsedInProject)
  // ============================================================================

  async clearInstagramItemsUsedInProject(projectId: string): Promise<void> {
    await db
      .update(instagramItems)
      .set({ usedInProject: null, userAction: null })
      .where(eq(instagramItems.usedInProject, projectId));
  }
}
