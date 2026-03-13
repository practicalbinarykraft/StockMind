import type { Express } from "express"
import { registerProjectsCrudRoutes } from "../../modules/projects/projects.routes"

/**
 * Projects routes
 * Handles CRUD operations for video projects
 */
export function registerProjectsRoutes(app: Express) {
  registerProjectsCrudRoutes(app)
}
