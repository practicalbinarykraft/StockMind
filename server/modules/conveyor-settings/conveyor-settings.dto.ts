import { z } from "zod";

/**
 * DTO: Update conveyor settings
 */
export const UpdateSettingsDto = z.object({
  enabled: z.boolean().optional(),
  sourceTypes: z.array(z.enum(["news", "instagram"])).optional(),
  sourceIds: z.array(z.string()).optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  excludeKeywords: z.array(z.string()).optional().nullable(),
  maxAgeDays: z.number().int().min(1).max(30).optional(),
  minScoreThreshold: z.number().int().min(50).max(95).optional(),
  dailyLimit: z.number().int().min(1).max(50).optional(),
  monthlyBudgetLimit: z.string().optional(), // decimal as string
});

export type UpdateSettingsDto = z.infer<typeof UpdateSettingsDto>;
