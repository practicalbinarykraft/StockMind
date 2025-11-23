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
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    await db
      .update(projects)
      .set({ status: 'deleted', deletedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  /**
   * Permanently delete a project
   */
  async permanentlyDeleteProject(id: string, userId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
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
    newsItemId: string
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
        .update(rssItems)
        .set({ usedInProject: project.id, userAction: 'selected' })
        .where(eq(rssItems.id, newsItemId));

      return project;
    });
  }
}

export const projectsStorage = new ProjectsStorage();
