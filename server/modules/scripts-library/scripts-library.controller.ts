import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { scriptsLibraryService } from "./scripts-library.service";
import {
  GetScriptsQueryDto,
  ScriptIdParamDto,
  ArticleIdParamDto,
  CreateScriptDto,
  UpdateScriptDto,
  StartProductionDto,
  GenerateScriptFromArticleDto,
  GenerateVariantsDto,
} from "./scripts-library.dto";
import {
  ScriptNotFoundError,
  ScriptValidationError,
  NoApiKeyConfiguredError,
  ArticleNotFoundError,
} from "./scripts-library.errors";

/**
 * Controller for Scripts Library
 * Handles req/res, validation, HTTP status codes
 */
export const scriptsLibraryController = {
  /**
   * GET /api/scripts
   * Get all scripts for current user with optional filters
   */
  async getScripts(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const filters = GetScriptsQueryDto.parse(req.query);
      const scripts = await scriptsLibraryService.getScripts(userId, filters);

      return apiResponse.ok(res, scripts);
    } catch (error: any) {
      logger.error("Error fetching scripts", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * GET /api/scripts/:id
   * Get a single script by ID
   */
  async getScriptById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      const script = await scriptsLibraryService.getScriptById(id, userId);

      return apiResponse.ok(res, script);
    } catch (error: any) {
      if (error instanceof ScriptNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("Error fetching script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/scripts
   * Create a new script
   */
  async createScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const data = CreateScriptDto.parse(req.body);
      const script = await scriptsLibraryService.createScript(userId, data);

      return apiResponse.ok(res, script);
    } catch (error: any) {
      if (error instanceof ScriptValidationError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error creating script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * PATCH /api/scripts/:id
   * Update a script
   */
  async updateScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      const data = UpdateScriptDto.parse(req.body);

      const script = await scriptsLibraryService.updateScript(id, userId, data);

      return apiResponse.ok(res, script);
    } catch (error: any) {
      if (error instanceof ScriptNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("Error updating script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * DELETE /api/scripts/:id
   * Delete a script
   */
  async deleteScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      await scriptsLibraryService.deleteScript(id, userId);

      return apiResponse.ok(res, { message: "Script deleted" });
    } catch (error: any) {
      if (error instanceof ScriptNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("Error deleting script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/scripts/:id/analyze
   * Analyze a script using AI
   */
  async analyzeScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      const script = await scriptsLibraryService.analyzeScript(id, userId);

      return apiResponse.ok(res, script);
    } catch (error: any) {
      if (error instanceof ScriptNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      if (error instanceof NoApiKeyConfiguredError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error analyzing script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/scripts/:id/start-production
   * Start production from script (create project starting at Stage 4)
   */
  async startProduction(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      const { skipToStage } = StartProductionDto.parse(req.body);

      const project = await scriptsLibraryService.startProduction(
        id,
        userId,
        skipToStage
      );

      return apiResponse.ok(res, project);
    } catch (error: any) {
      if (error instanceof ScriptNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("Error starting production", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/articles/:id/generate-script
   * Generate script from article and save to library
   */
  async generateScriptFromArticle(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: articleId } = ArticleIdParamDto.parse(req.params);
      const { format, saveToLibrary } = GenerateScriptFromArticleDto.parse(
        req.body
      );

      const result = await scriptsLibraryService.generateScriptFromArticle(
        articleId,
        userId,
        format,
        saveToLibrary
      );

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof ArticleNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      if (error instanceof NoApiKeyConfiguredError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error generating script from article", {
        error: error.message,
      });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/scripts/generate-variants
   * Generate script variants from source text using AI
   */
  async generateVariants(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { sourceText, prompt, format, lengthOption } = GenerateVariantsDto.parse(
        req.body
      );

      const result = await scriptsLibraryService.generateVariants(
        userId,
        sourceText,
        format,
        prompt,
        lengthOption
      );

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof ScriptValidationError) {
        return apiResponse.badRequest(res, error.message);
      }

      if (error instanceof NoApiKeyConfiguredError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error generating script variants", {
        error: error.message,
      });
      return apiResponse.serverError(res, error.message);
    }
  },
};
