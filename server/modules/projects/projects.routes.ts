import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { projectsController } from "./projects.controller";
import type { Express } from "express";

const router = Router();

// GET /api/projects - Get all projects with enriched data
router.get("/", requireAuth, projectsController.getProjects);

// GET /api/projects/:id - Get specific project by ID
router.get("/:id", requireAuth, projectsController.getProjectById);

// POST /api/projects - Create new blank project
router.post("/", requireAuth, projectsController.createProject);

// POST /api/projects/from-instagram/:itemId - Create project from Instagram Reel
router.post("/from-instagram/:itemId", requireAuth, projectsController.createProjectFromInstagram);

// POST /api/projects/from-news/:itemId - Create project from news item
router.post("/from-news/:itemId", requireAuth, projectsController.createProjectFromNews);

// POST /api/projects/batch-create - Create multiple projects from article IDs
router.post("/batch-create", requireAuth, projectsController.batchCreateProjects);

// PATCH /api/projects/:id - Update project details
router.patch("/:id", requireAuth, projectsController.updateProject);

// PATCH /api/projects/:id/stage - Navigate to a completed stage
router.patch("/:id/stage", requireAuth, projectsController.updateProjectStage);

// DELETE /api/projects/:id - Soft delete project
router.delete("/:id", requireAuth, projectsController.deleteProject);

// DELETE /api/projects/:id/permanent - Permanent delete
router.delete("/:id/permanent", requireAuth, projectsController.permanentlyDeleteProject);

export function registerProjectsCrudRoutes(app: Express) {
  app.use('/api/projects', router);
}
