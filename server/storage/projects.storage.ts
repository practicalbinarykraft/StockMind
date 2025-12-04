// Projects storage operations
import { db } from "../db";
import {
  projects,
  projectSteps,
  instagramItems,
  rssItems,
  type Project,
  type InsertProject,
  type InsertProjectStep,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Projects storage interface
 */
export interface IProjectsStorage {
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string, userId: string): Promise<Project | undefined>;
  getProjectById(id: string): Promise<Project | undefined>;
  createProject(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project>;
  updateProject(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<void>;
  permanentlyDeleteProject(id: string, userId: string): Promise<void>;
  createProjectFromInstagramAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    instagramItemId: string
  ): Promise<Project>;
  createProjectFromNewsAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    newsItemId: string
  ): Promise<Project>;
}

/**
 * Projects storage implementation
 * Handles project operations
 */
export class ProjectsStorage implements IProjectsStorage {
  /**
   * Get all projects for a user
   */
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  /**
   * Get a project by ID with user verification
   */
  async getProject(id: string, userId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  /**
   * Get a project by ID without user verification
   * Used for ownership validation
   */
  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({ ...data, userId })
      .returning();
    return project;
  }

  /**
   * Update a project
   */
  async updateProject(
    id: string,
    userId: string,
    data: Partial<Project>
  ): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return project;
  }

  /**
   * Soft delete a project
   * Marks the project as deleted instead of removing it
   * Also clears usedInProject for all related RSS items
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Mark project as deleted
      await tx
        .update(projects)
        .set({ status: 'deleted', deletedAt: new Date() })
        .where(and(eq(projects.id, id), eq(projects.userId, userId)));
      
      // Clear usedInProject for all RSS items that were used in this project
      await tx
        .update(rssItems)
        .set({ usedInProject: null, userAction: null })
        .where(eq(rssItems.usedInProject, id));
      
      // Clear usedInProject for all Instagram items that were used in this project
      await tx
        .update(instagramItems)
        .set({ usedInProject: null, userAction: null })
        .where(eq(instagramItems.usedInProject, id));
    });
  }

  /**
   * Permanently delete a project
   * Also clears usedInProject for all related RSS and Instagram items
   */
  async permanentlyDeleteProject(id: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear usedInProject for all RSS items that were used in this project
      await tx
        .update(rssItems)
        .set({ usedInProject: null, userAction: null })
        .where(eq(rssItems.usedInProject, id));
      
      // Clear usedInProject for all Instagram items that were used in this project
      await tx
        .update(instagramItems)
        .set({ usedInProject: null, userAction: null })
        .where(eq(instagramItems.usedInProject, id));
      
      // Delete the project
      await tx
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    });
  }

  /**
   * Create a project from Instagram content atomically
   * Creates project, project step, and updates Instagram item in a transaction
   */
  async createProjectFromInstagramAtomic(
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

  /**
   * Create a project from news content atomically
   * Creates project, project step, and updates RSS item in a transaction
   */
  async createProjectFromNewsAtomic(
    userId: string,
    projectData: Omit<InsertProject, 'userId'>,
    stepData: InsertProjectStep,
    newsItemId: string,
    step3Data?: InsertProjectStep
  ): Promise<Project> {
    return await db.transaction(async (tx) => {
      try {
        console.log(`[ProjectsStorage] Creating project atomically for news item ${newsItemId}`, {
          hasStep3Data: !!step3Data,
          step3DataStepNumber: step3Data?.stepNumber
        });

        // CRITICAL: Log what we're inserting
        console.log(`[ProjectsStorage] Inserting project with currentStage: ${projectData.currentStage}`, {
          currentStage: projectData.currentStage,
          title: projectData.title,
          sourceType: projectData.sourceType
        });

        const [project] = await tx
          .insert(projects)
          .values({ ...projectData, userId })
          .returning();

        console.log(`[ProjectsStorage] Project created: ${project.id}`, {
          returnedCurrentStage: project.currentStage,
          expectedCurrentStage: projectData.currentStage,
          match: project.currentStage === projectData.currentStage
        });

        await tx
          .insert(projectSteps)
          .values({ ...stepData, projectId: project.id });

        console.log(`[ProjectsStorage] Step 2 created for project ${project.id}`);

        // Create Step 3 if step3Data is provided (contains cached analysis)
        if (step3Data) {
          console.log(`[ProjectsStorage] Creating Step 3 with data:`, {
            stepNumber: step3Data.stepNumber,
            hasSourceAnalysis: !!step3Data.data?.sourceAnalysis,
            hasRecommendedFormat: !!step3Data.data?.recommendedFormat,
            dataKeys: step3Data.data ? Object.keys(step3Data.data) : []
          });
          
          const [createdStep3] = await tx
            .insert(projectSteps)
            .values({ ...step3Data, projectId: project.id })
            .returning();
          
          console.log(`[ProjectsStorage] Step 3 created successfully:`, {
            stepId: createdStep3.id,
            stepNumber: createdStep3.stepNumber,
            hasData: !!createdStep3.data,
            dataKeys: createdStep3.data ? Object.keys(createdStep3.data) : []
          });
        } else {
          console.log(`[ProjectsStorage] No step3Data provided, skipping Step 3 creation`);
        }

        await tx
          .update(rssItems)
          .set({ usedInProject: project.id, userAction: 'selected' })
          .where(eq(rssItems.id, newsItemId));

        console.log(`[ProjectsStorage] RSS item ${newsItemId} marked as used in project ${project.id}`);

        // CRITICAL: Log the returned project's currentStage
        console.log(`[ProjectsStorage] Returning project with currentStage: ${project.currentStage}`, {
          projectId: project.id,
          currentStage: project.currentStage,
          status: project.status
        });

        return project;
      } catch (error: any) {
        console.error(`[ProjectsStorage] Error in createProjectFromNewsAtomic:`, {
          newsItemId,
          userId,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetail: error.detail,
          errorStack: error.stack
        });
        throw error;
      }
    });
  }
}

export const projectsStorage = new ProjectsStorage();
