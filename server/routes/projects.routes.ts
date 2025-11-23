import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { insertProjectSchema } from "@shared/schema";
import { ProjectService } from "../services/project-service";

/**
 * Projects routes
 * Handles CRUD operations for video projects
 */
export function registerProjectsRoutes(app: Express) {
  const projectService = new ProjectService(storage);

  // GET /api/projects - Get all projects with enriched data
  app.get("/api/projects", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const projects = await storage.getProjects(userId);

      // Enrich projects with auto-title and stats from steps
      const enrichedProjects = await Promise.all(projects.map(async (project) => {
        const steps = await storage.getProjectSteps(project.id);

        // Auto-generate title from Step 3 first scene if no title set
        let autoTitle = project.title;
        if (!autoTitle || autoTitle === "Untitled Project") {
          const step3 = steps.find(s => s.stepNumber === 3);
          const step3Data = step3?.data as any;
          if (step3Data?.scenes && step3Data.scenes.length > 0) {
            const firstSceneText = step3Data.scenes[0].text || "";
            autoTitle = firstSceneText.substring(0, 50) + (firstSceneText.length > 50 ? "..." : "");
          }
        }

        // Extract stats from steps
        const step3 = steps.find(s => s.stepNumber === 3);
        const step4 = steps.find(s => s.stepNumber === 4);
        const step5 = steps.find(s => s.stepNumber === 5);
        const step3Data = step3?.data as any;
        const step4Data = step4?.data as any;
        const step5Data = step5?.data as any;

        const stats = {
          scenesCount: step3Data?.scenes?.length || 0,
          duration: step5Data?.duration || step4Data?.duration || 0,
          format: step3Data?.selectedFormat || step3Data?.format || "unknown",
          thumbnailUrl: step5Data?.thumbnailUrl || null,
        };

        return {
          ...project,
          displayTitle: autoTitle || project.title || "Untitled Project",
          stats,
        };
      }));

      res.json(enrichedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // GET /api/projects/:id - Get specific project by ID
  app.get("/api/projects/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      const project = await storage.getProjectById(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // POST /api/projects - Create new blank project
  app.post("/api/projects", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const validated = insertProjectSchema.parse(req.body);
      const project = await projectService.createProject(userId, validated);
      res.json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  // POST /api/projects/from-instagram/:itemId - Create project from Instagram Reel
  app.post("/api/projects/from-instagram/:itemId", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { itemId } = req.params;

      const project = await projectService.createProjectFromInstagram(userId, itemId);
      console.log(`[Project] Created from Instagram Reel: ${project.id} (item: ${itemId})`);
      res.json(project);
    } catch (error: any) {
      console.error("Error creating project from Instagram:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        message: error.message || "Failed to create project from Instagram Reel",
        projectId: error.projectId
      });
    }
  });

  // POST /api/projects/from-news/:itemId - Create project from news item
  app.post("/api/projects/from-news/:itemId", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { itemId } = req.params;

      const project = await projectService.createProjectFromNews(userId, itemId);
      console.log(`[Project] Created from News: ${project.id} (item: ${itemId})`);
      return res.json(project);
    } catch (error: any) {
      console.error("Error creating project from news:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        message: error.message || "Failed to create project from news item",
        projectId: error.projectId
      });
    }
  });

  // PATCH /api/projects/:id - Update project details
  app.patch("/api/projects/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const project = await storage.updateProject(id, userId, req.body);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // PATCH /api/projects/:id/stage - Navigate to a completed stage (5-8 only)
  app.patch("/api/projects/:id/stage", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const { stage } = req.body;

      // Validate stage number
      if (typeof stage !== 'number' || stage < 5 || stage > 8) {
        return res.status(400).json({
          message: "Invalid stage. Only stages 5-8 can be navigated to."
        });
      }

      // Get current project
      const currentProject = await storage.getProject(id, userId);
      if (!currentProject) return res.status(404).json({ message: "Project not found" });

      // Can only navigate to completed stages (stage must be <= currentStage)
      if (stage > currentProject.currentStage) {
        return res.status(400).json({
          message: "Cannot navigate to a locked stage. Complete previous stages first."
        });
      }

      // Update the stage
      const project = await storage.updateProject(id, userId, { currentStage: stage });
      if (!project) return res.status(404).json({ message: "Project not found" });

      res.json(project);
    } catch (error) {
      console.error("Error updating project stage:", error);
      res.status(500).json({ message: "Failed to update project stage" });
    }
  });

  // DELETE /api/projects/:id - Soft delete project
  app.delete("/api/projects/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.deleteProject(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // DELETE /api/projects/:id/permanent - Permanent delete
  app.delete("/api/projects/:id/permanent", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.permanentlyDeleteProject(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error permanently deleting project:", error);
      res.status(500).json({ message: "Failed to permanently delete project" });
    }
  });
}
