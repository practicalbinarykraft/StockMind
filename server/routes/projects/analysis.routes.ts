// Re-export from refactored modules
// This file is kept for backwards compatibility
import type { Express } from "express"
import { registerAnalyzeSourceRoute } from "./analyze-source.routes"
import { registerGenerateScriptRoute } from "./generate-script.routes"

export function registerProjectsAnalysisRoutes(app: Express) {
  registerAnalyzeSourceRoute(app)
  registerGenerateScriptRoute(app)
}
