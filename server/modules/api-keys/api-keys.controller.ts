import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiKeysService } from "./api-keys.service";
import { ApiKeyNotFoundError } from "./api-keys.errors";
import { ApiKeyIdParamDto, CreateApiKeyDto } from "./api-keys.dto";


export const apiKeysController = {
    async createApiKey(req: Request, res: Response) {
        let userId: string | null = null;
        try {
          userId = getUserId(req);
          if (!userId) return res.status(401).json({ message: "Unauthorized" }); // middleware
    
          const validated = CreateApiKeyDto.parse(req.body);
          const apiKey = await apiKeysService.create(validated, userId);          
    
          res.json(apiKey);
        } catch (error: any) {
          // ⚠️ SECURITY: Never log API keys or sensitive error details
          logger.error("Error creating API key", {
            userId,
            provider: req.body?.provider,
            errorType: error.constructor?.name,
            // Deliberately NOT logging error.message or req.body which contains the API key
          });
          res.status(400).json({ message: "Failed to create API key" });
        }
    },

    async getApiKeys(req: Request, res: Response) {
        let userId: string | null = null;
        try {
            userId = getUserId(req);
            if (!userId) return res.status(401).json({ message: "Unauthorized" }); // middleware

            const apiKeys = await apiKeysService.getApiKeys(userId);
   
            res.json(apiKeys);
        } catch (error: any) {
            // ⚠️ SECURITY: Never log API keys or sensitive error details
            logger.error("Error fetching API keys", {
                userId,
                errorType: error.constructor?.name,
                // Deliberately NOT logging error.message which might contain sensitive data
            });
            res.status(500).json({ message: "Failed to fetch API keys" });
        }
    },

    async deleteApiKey(req: Request, res: Response) {
        let userId: string | null = null;
        try {
            userId = getUserId(req);
            if (!userId) return res.status(401).json({ message: "Unauthorized" }); // middleware

            const { id } = ApiKeyIdParamDto.parse(req.params);
            const apiKey = await apiKeysService.deleteApiKey(id, userId);

            res.json({ success: true });
        } catch (error: any) {
            logger.error("Error deleting API key", {
                userId,
                errorType: error.constructor?.name,
            });
            res.status(500).json({ message: "Failed to delete API key" });
        }
    },

    async testApiKey(req: Request, res: Response) {
        let userId: string | null = null;
        const { id } = ApiKeyIdParamDto.parse(req.params);
        try {
            userId = getUserId(req);
            if (!userId) return res.status(401).json({ message: "Unauthorized" }); // middleware

            const result = await apiKeysService.testApiKey(id, userId);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error: any) {
            logger.error("Error testing API key", {
                userId,
                errorType: error.constructor?.name,
            });

            if (error instanceof ApiKeyNotFoundError) {
                return res.status(404).json({
                    message: error.message
                })
            }

            res.status(500).json({
                success: false,
                message: error.message || "Failed to test API key"
            });
        } // to do error middleware
    }
}