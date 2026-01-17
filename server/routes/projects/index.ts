import type { Express } from "express"
import { registerProjectsCrudRoutes } from "../../modules/projects/projects.routes"
import { registerAnalyzeSourceRoute } from "../../modules/projects-analyze/projects-analyze.routes"
import { registerGenerateScriptRoute } from "../../modules/projects-script/projects-script.routes"

/**
 * Projects routes
 * Handles CRUD operations and analysis for video projects
 */
export function registerProjectsRoutes(app: Express) {
  registerProjectsCrudRoutes(app)
  registerAnalyzeSourceRoute(app)
  registerGenerateScriptRoute(app)
}
