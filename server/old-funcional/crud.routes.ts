import type { Express, Request, Response } from "express"
import { storage } from "../../storage"
import { requireAuth } from "../../middleware/jwt-auth"
import { getUserId } from "../../utils/route-helpers"
import { insertProjectSchema } from "@shared/schema"
import { ProjectService } from "../../services/project-service"
import { logger } from "../../lib/logger"

export function registerProjectsCrudRoutes(app: Express) {
  const projectService = new ProjectService(storage)

  // GET /api/projects - Get all projects with enriched data
  // Supports ?include=steps,currentVersion query param for batch loading
  app.get("/api/projects", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })

      const includeParam = (req.query.include as string) || ""
      const includes = includeParam.split(",").map(s => s.trim()).filter(Boolean)
      const includeSteps = includes.includes("steps")
      const includeCurrentVersion = includes.includes("currentVersion")

      const projects = await storage.getProjects(userId)

      // Batch fetch all steps (already needed for stats computation anyway)
      const allProjectSteps = await Promise.all(
        projects.map(p => storage.getProjectSteps(p.id))
      )
      const stepsMap = new Map(projects.map((p, i) => [p.id, allProjectSteps[i]]))

      // Batch fetch current versions if requested
      let versionsMap = new Map<string, any>()
      if (includeCurrentVersion) {
        const allVersions = await Promise.all(
          projects.map(p => storage.getScriptVersions(p.id))
        )
        versionsMap = new Map(projects.map((p, i) => {
          const versions = allVersions[i]
          const current = versions.find(v => v.isCurrent) || versions[0] || null
          return [p.id, current]
        }))
      }

      const enrichedProjects = projects.map((project) => {
        const steps = stepsMap.get(project.id) || []

        let autoTitle = project.title
        if (!autoTitle || autoTitle === "Untitled Project") {
          const step3 = steps.find(s => s.stepNumber === 3)
          const step3Data = step3?.data as any
          if (step3Data?.scenes && step3Data.scenes.length > 0) {
            const firstSceneText = step3Data.scenes[0].text || ""
            autoTitle = firstSceneText.substring(0, 50) + (firstSceneText.length > 50 ? "..." : "")
          }
        }

        const step3 = steps.find(s => s.stepNumber === 3)
        const step4 = steps.find(s => s.stepNumber === 4)
        const step5 = steps.find(s => s.stepNumber === 5)
        const step3Data = step3?.data as any
        const step4Data = step4?.data as any
        const step5Data = step5?.data as any

        let formatValue = step3Data?.selectedFormat || step3Data?.format || "unknown"
        if (typeof formatValue === 'object' && formatValue !== null) {
          formatValue = formatValue.formatId || formatValue.format || "unknown"
        }
        formatValue = typeof formatValue === 'string' ? formatValue : "unknown"

        const stats = {
          scenesCount: step3Data?.scenes?.length || 0,
          duration: step5Data?.duration || step4Data?.duration || 0,
          format: formatValue,
          thumbnailUrl: step5Data?.thumbnailUrl || null,
        } // to do протестировать, возможно убрать stats - слишком затратно

        const result: any = {
          ...project,
          displayTitle: autoTitle || project.title || "Untitled Project",
          stats,
        }

        if (includeSteps) {
          result.steps = steps
        }

        if (includeCurrentVersion) {
          result.currentVersion = versionsMap.get(project.id) || null
        }

        return result
      })

      res.json(enrichedProjects)
    } catch (error) {
      logger.error("Error fetching projects:", { error })
      res.status(500).json({ message: "Failed to fetch projects" })
    }
  })

  // GET /api/projects/:id - Get specific project by ID
  app.get("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { id } = req.params

      const project = await storage.getProjectById(id)
      if (!project) return res.status(404).json({ message: "Project not found" })
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" })

      logger.info(`[Projects Route] Returning project ${id} with currentStage: ${project.currentStage}`, {
        projectId: id,
        currentStage: project.currentStage,
        status: project.status
      })

      res.json(project)
    } catch (error) {
      logger.error("Error fetching project:", error)
      res.status(500).json({ message: "Failed to fetch project" })
    }
  })

  // POST /api/projects - Create new blank project
  app.post("/api/projects", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const validated = insertProjectSchema.parse(req.body)
      const project = await projectService.createProject(userId, validated)
      res.json(project)
    } catch (error: any) {
      logger.error("Error creating project:", { error })
      res.status(400).json({ message: error.message || "Failed to create project" })
    }
  })

  // POST /api/projects/from-instagram/:itemId - Create project from Instagram Reel
  app.post("/api/projects/from-instagram/:itemId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { itemId } = req.params

      const project = await projectService.createProjectFromInstagram(userId, itemId)
      logger.info(`[Project] Created from Instagram Reel: ${project.id} (item: ${itemId})`)
      res.json(project)
    } catch (error: any) {
      logger.error("Error creating project from Instagram:", { error })
      const statusCode = error.statusCode || 500
      res.status(statusCode).json({
        message: error.message || "Failed to create project from Instagram Reel",
        projectId: error.projectId
      })
    }
  })

  // POST /api/projects/from-news/:itemId - Create project from news item
  app.post("/api/projects/from-news/:itemId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { itemId } = req.params

      logger.info(`[Projects Route] Creating project from news item ${itemId} for user ${userId}`)
      const project = await projectService.createProjectFromNews(userId, itemId)
      logger.info(`[Projects Route] Project created successfully: ${project.id} (item: ${itemId})`)
      return res.json(project)
    } catch (error: any) {
      logger.error(`[Projects Route] Error creating project from news:`, {
        itemId: req.params.itemId,
        userId: getUserId(req),
        errorMessage: error.message,
        errorStatus: error.statusCode,
        errorStack: error.stack
      })
      const statusCode = error.statusCode || 500
      res.status(statusCode).json({
        message: error.message || "Failed to create project from news item",
        projectId: error.projectId,
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      })
    }
  })

  // PATCH /api/projects/:id - Update project details
  app.patch("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { id } = req.params
      const project = await storage.updateProject(id, userId, req.body)
      if (!project) return res.status(404).json({ message: "Project not found" })
      res.json(project)
    } catch (error) {
      logger.error("Error updating project:", { error })
      res.status(500).json({ message: "Failed to update project" })
    }
  })

  // PATCH /api/projects/:id/stage - Navigate to a completed stage
  app.patch("/api/projects/:id/stage", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { id } = req.params
      const { stage } = req.body

      if (typeof stage !== 'number' || stage < 1 || stage > 8) {
        return res.status(400).json({
          message: "Invalid stage. Stage must be between 1 and 8."
        })
      }

      const currentProject = await storage.getProject(id, userId)
      if (!currentProject) return res.status(404).json({ message: "Project not found" })

      const steps = await storage.getProjectSteps(id)

      const isStepCompleted = (stepNumber: number) => {
        const step = steps.find(s => s.stepNumber === stepNumber)
        return !!(step?.completedAt || step?.data || step?.skipReason)
      }

      const maxReachedStage = steps.length > 0
        ? Math.max(
            currentProject.currentStage,
            ...steps
              .filter(s => s.completedAt || s.data || s.skipReason)
              .map(s => s.stepNumber)
          )
        : currentProject.currentStage

      const canNavigate =
        stage === currentProject.currentStage ||
        isStepCompleted(stage) ||
        stage <= maxReachedStage

      if (!canNavigate) {
        return res.status(400).json({
          message: "Cannot navigate to a locked stage. Complete previous stages first."
        })
      }

      if (stage < currentProject.currentStage) {
        logger.info(`[Stage Navigation] User ${userId} navigated back to stage ${stage} from stage ${currentProject.currentStage}`, {
          projectId: id,
          fromStage: currentProject.currentStage,
          toStage: stage,
          maxReachedStage,
        })
      }

      const project = await storage.updateProject(id, userId, { currentStage: stage })
      if (!project) return res.status(404).json({ message: "Project not found" })

      res.json(project)
    } catch (error) {
      logger.error("Error updating project stage:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      res.status(500).json({ message: "Failed to update project stage" })
    }
  })

  // DELETE /api/projects/:id - Soft delete project
  app.delete("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { id } = req.params
      await storage.deleteProject(id, userId)
      res.json({ success: true })
    } catch (error) {
      logger.error("Error deleting project:", { error })
      res.status(500).json({ message: "Failed to delete project" })
    }
  })

  // DELETE /api/projects/:id/permanent - Permanent delete
  app.delete("/api/projects/:id/permanent", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { id } = req.params
      await storage.permanentlyDeleteProject(id, userId)
      res.json({ success: true })
    } catch (error) {
      logger.error("Error permanently deleting project:", { error })
      res.status(500).json({ message: "Failed to permanently delete project" })
    }
  })

  // POST /api/projects/batch-create - Create multiple projects from article IDs
  app.post("/api/projects/batch-create", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })

      const { articleIds } = req.body

      if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
        return res.status(400).json({ message: "articleIds array is required" })
      }

      const createdProjects = []
      const errors = []

      for (const articleId of articleIds) {
        try {
          const project = await projectService.createProjectFromNews(userId, articleId)
          createdProjects.push(project)
          logger.info(`[Batch Create] Created project ${project.id} from article ${articleId}`)
        } catch (error: any) {
          logger.error(`[Batch Create] Failed to create project from article ${articleId}:`, { error })
          errors.push({
            articleId,
            error: error.message || "Failed to create project"
          })
        }
      }

      return res.json({
        success: true,
        created: createdProjects.length,
        total: articleIds.length,
        projects: createdProjects,
        errors: errors.length > 0 ? errors : undefined
      })
    } catch (error: any) {
      logger.error("Error in batch project creation:", { error })
      res.status(500).json({
        message: error.message || "Failed to create projects",
        created: 0,
        total: 0
      })
    }
  })
}
