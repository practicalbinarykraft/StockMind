import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { ProjectsService } from "./projects.service";
import {
  ProjectNotFoundError,
  ProjectForbiddenError,
  InvalidStageError,
  StageNavigationError,
  InstagramItemNotFoundError,
  InstagramItemAlreadyUsedError,
  InstagramTranscriptionRequiredError,
  NewsItemNotFoundError,
  NewsItemAlreadyUsedError,
} from "./projects.errors";
import {
  GetProjectsQueryDto,
  ProjectIdParamDto,
  ItemIdParamDto,
  CreateProjectDto,
  UpdateProjectDto,
  UpdateProjectStageDto,
  BatchCreateProjectsDto,
} from "./projects.dto";

const projectsService = new ProjectsService();

/**
 * Projects Controller
 * Работа с req/res, валидация входных данных, установка HTTP-статуса
 */
export const projectsController = {
  // ============================================================================
  // GET ALL PROJECTS
  // ============================================================================
  
  async getProjects(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { include } = GetProjectsQueryDto.parse(req.query);
      const projects = await projectsService.getAllProjects(userId, include);

      res.json(projects);
    } catch (error) {
      logger.error("Error fetching projects:", { error });
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  },

  // ============================================================================
  // GET PROJECT BY ID
  // ============================================================================
  
  async getProjectById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const project = await projectsService.getProjectById(id, userId);

      logger.info(`[Projects Controller] Returning project ${id} with currentStage: ${project.currentStage}`, {
        projectId: id,
        currentStage: project.currentStage,
        status: project.status
      });

      res.json(project);
    } catch (error) {
      logger.error("Error fetching project:", error);

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch project" });
    }
  },

  // ============================================================================
  // CREATE PROJECT
  // ============================================================================
  
  async createProject(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = CreateProjectDto.parse(req.body);
      const project = await projectsService.createProject(userId, validated);

      res.json(project);
    } catch (error: any) {
      logger.error("Error creating project:", { error });
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  },

  // ============================================================================
  // CREATE FROM INSTAGRAM
  // ============================================================================
  
  async createProjectFromInstagram(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { itemId } = ItemIdParamDto.parse(req.params);
      const project = await projectsService.createProjectFromInstagram(userId, itemId);

      res.json(project);
    } catch (error: any) {
      logger.error("Error creating project from Instagram:", { error });

      if (error instanceof InstagramItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof InstagramItemAlreadyUsedError) {
        return res.status(400).json({
          message: error.message,
          projectId: error.projectId
        });
      }
      if (error instanceof InstagramTranscriptionRequiredError) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to create project from Instagram Reel" });
    }
  },

  // ============================================================================
  // CREATE FROM NEWS
  // ============================================================================
  
  async createProjectFromNews(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { itemId } = ItemIdParamDto.parse(req.params);
      
      logger.info(`[Projects Controller] Creating project from news item ${itemId} for user ${userId}`);
      const project = await projectsService.createProjectFromNews(userId, itemId);
      logger.info(`[Projects Controller] Project created successfully: ${project.id}`);

      res.json(project);
    } catch (error: any) {
      logger.error(`[Projects Controller] Error creating project from news:`, {
        itemId: req.params.itemId,
        userId: getUserId(req),
        errorMessage: error.message,
        errorStack: error.stack
      });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof NewsItemAlreadyUsedError) {
        return res.status(400).json({
          message: error.message,
          projectId: error.projectId
        });
      }

      res.status(500).json({
        message: error.message || "Failed to create project from news item",
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      });
    }
  },

  // ============================================================================
  // UPDATE PROJECT
  // ============================================================================
  
  async updateProject(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const validated = UpdateProjectDto.parse(req.body);
      const project = await projectsService.updateProject(id, userId, validated);

      res.json(project);
    } catch (error) {
      logger.error("Error updating project:", { error });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to update project" });
    }
  },

  // ============================================================================
  // UPDATE PROJECT STAGE
  // ============================================================================
  
  async updateProjectStage(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const validated = UpdateProjectStageDto.parse(req.body);
      const project = await projectsService.updateProjectStage(id, userId, validated);

      res.json(project);
    } catch (error) {
      logger.error("Error updating project stage:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof InvalidStageError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof StageNavigationError) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to update project stage" });
    }
  },

  // ============================================================================
  // DELETE PROJECT (SOFT)
  // ============================================================================
  
  async deleteProject(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      await projectsService.deleteProject(id, userId);

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting project:", { error });
      res.status(500).json({ message: "Failed to delete project" });
    }
  },

  // ============================================================================
  // DELETE PROJECT (PERMANENT)
  // ============================================================================
  
  async permanentlyDeleteProject(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      await projectsService.permanentlyDeleteProject(id, userId);

      res.json({ success: true });
    } catch (error) {
      logger.error("Error permanently deleting project:", { error });
      res.status(500).json({ message: "Failed to permanently delete project" });
    }
  },

  // ============================================================================
  // BATCH CREATE
  // ============================================================================
  
  async batchCreateProjects(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = BatchCreateProjectsDto.parse(req.body);
      const result = await projectsService.batchCreateProjects(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in batch project creation:", { error });
      res.status(500).json({
        message: error.message || "Failed to create projects",
        created: 0,
        total: 0
      });
    }
  },
};
