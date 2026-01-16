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
  getProject(id: string, userId: string): Promise<Project | undefined>;
  // Removed: getProjects, getProjectById, createProject, updateProject, deleteProject, permanentlyDeleteProject, createProjectFromInstagramAtomic, createProjectFromNewsAtomic
  // Use modules/projects/projects.repo.ts instead
}

/**
 * Projects storage implementation
 * Handles project operations
 */
export class ProjectsStorage implements IProjectsStorage {
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
}

export const projectsStorage = new ProjectsStorage();
