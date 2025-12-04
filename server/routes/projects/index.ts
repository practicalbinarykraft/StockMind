import type { Express } from "express"
import { registerProjectsCrudRoutes } from "./crud.routes"
import { registerAnalyzeSourceRoute } from "./analyze-source.routes"
import { registerGenerateScriptRoute } from "./generate-script.routes"

/**
 * Projects routes
 * Handles CRUD operations and analysis for video projects
 */
export function registerProjectsRoutes(app: Express) {
  registerProjectsCrudRoutes(app)
  registerAnalyzeSourceRoute(app)
  registerGenerateScriptRoute(app)
}
