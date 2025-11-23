import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { insertProjectStepSchema, projectSteps } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * Project Steps routes
 * Handles project workflow step tracking and management
 */
export function registerProjectStepsRoutes(app: Express) {
  /**
   * GET /api/projects/:id/steps
   * Gets all steps for a project
   * Returns array of project steps with their completion status
   */
  app.get("/api/projects/:id/steps", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const steps = await storage.getProjectSteps(id);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching project steps:", error);
      res.status(500).json({ message: "Failed to fetch project steps" });
    }
  });

  /**
   * POST /api/projects/:id/steps
   * Creates a new project step
   * Body: { stepNumber, data, skipReason?, completedAt? }
   */
  app.post("/api/projects/:id/steps", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validated = insertProjectStepSchema.parse({
        ...req.body,
        projectId: id,
      });
      const step = await storage.createProjectStep(validated);
      res.json(step);
    } catch (error: any) {
      console.error("Error creating project step:", error);
      res.status(400).json({ message: error.message || "Failed to create project step" });
    }
  });

  /**
   * POST /api/projects/:id/steps/:stepNumber/skip
   * Skips a project step (only stages 4 and 5 can be skipped)
   * Body: { reason? }
   * Stage 4: Voice Generation
   * Stage 5: Avatar Selection
   */
  app.post("/api/projects/:id/steps/:stepNumber/skip", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id, stepNumber } = req.params;
      const { reason } = req.body;

      // Validate stepNumber
      const step = parseInt(stepNumber, 10);
      if (isNaN(step) || step < 1 || step > 8) {
        return res.status(400).json({ message: "Invalid step number" });
      }

      // Only stages 4 (Voice) and 5 (Avatar) can be skipped
      if (step !== 4 && step !== 5) {
        return res.status(400).json({
          message: "Only Voice Generation (4) and Avatar Selection (5) stages can be skipped"
        });
      }

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if user is at this stage or has already passed it
      if (project.currentStage !== step && project.currentStage < step) {
        return res.status(400).json({
          message: "Can only skip the current stage or previously completed stages"
        });
      }

      // Create or update the step as skipped
      const existingSteps = await storage.getProjectSteps(id);
      const existingStep = existingSteps.find(s => s.stepNumber === step);

      if (existingStep) {
        // Update existing step with skip reason
        await db
          .update(projectSteps)
          .set({
            skipReason: reason || 'Skipped by user',
            completedAt: existingStep.completedAt || new Date(),
            updatedAt: new Date(),
          })
          .where(eq(projectSteps.id, existingStep.id));
      } else {
        // Create new step with skip reason
        await storage.createProjectStep({
          projectId: id,
          stepNumber: step,
          data: {},
          skipReason: reason || 'Skipped by user',
          completedAt: new Date(),
        });
      }

      // Auto-advance to next stage if this was the current stage
      if (project.currentStage === step) {
        await storage.updateProject(id, userId, {
          currentStage: step + 1,
        });
      }

      // Fetch updated project and steps
      const updatedProject = await storage.getProject(id, userId);
      const updatedSteps = await storage.getProjectSteps(id);

      res.json({
        project: updatedProject,
        steps: updatedSteps,
      });
    } catch (error: any) {
      console.error("Error skipping step:", error);
      res.status(500).json({ message: error.message || "Failed to skip step" });
    }
  });
}
