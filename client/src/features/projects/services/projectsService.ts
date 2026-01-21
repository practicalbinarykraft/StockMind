import { apiRequest } from "@/shared/api"
import type { Project } from "@shared/schema"

export const projectsService = {
  /**
   * Get all projects with optional includes
   */
  getAll: async (includes?: string[]): Promise<any[]> => {
    const includeParam = includes ? `?include=${includes.join(',')}` : ''
    const res = await apiRequest("GET", `/api/projects${includeParam}`)
    if (!res.ok) throw new Error("Failed to fetch projects")
    return res.json()
  },

  /**
   * Get a single project by ID
   */
  getById: async (id: string): Promise<Project> => {
    const res = await apiRequest("GET", `/api/projects/${id}`)
    if (!res.ok) throw new Error("Failed to fetch project")
    return res.json()
  },

  /**
   * Create a new project
   */
  create: async (data: Partial<Project>): Promise<Project> => {
    const res = await apiRequest("POST", "/api/projects", data)
    if (!res.ok) throw new Error("Failed to create project")
    return res.json()
  },

  /**
   * Update a project
   */
  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const res = await apiRequest("PATCH", `/api/projects/${id}`, data)
    if (!res.ok) throw new Error("Failed to update project")
    return res.json()
  },

  /**
   * Soft delete a project (moves to deleted status)
   */
  delete: async (id: string): Promise<void> => {
    const res = await apiRequest("DELETE", `/api/projects/${id}`)
    if (!res.ok) throw new Error("Failed to delete project")
  },

  /**
   * Permanently delete a project
   */
  permanentDelete: async (id: string): Promise<void> => {
    const res = await apiRequest("DELETE", `/api/projects/${id}/permanent`)
    if (!res.ok) throw new Error("Failed to permanently delete project")
  },

  /**
   * Restore a deleted project
   */
  restore: async (id: string): Promise<Project> => {
    return projectsService.update(id, {
      status: 'draft',
      deletedAt: null
    })
  },

  /**
   * Rename a project
   */
  rename: async (id: string, title: string): Promise<Project> => {
    return projectsService.update(id, { title })
  },
}
