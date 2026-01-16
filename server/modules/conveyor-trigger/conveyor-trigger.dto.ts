import { z } from "zod";

/**
 * DTO: Request body for processing specific item
 */
export const ProcessItemDto = z.object({
  sourceType: z.enum(["news", "instagram"]),
  sourceItemId: z.string().min(1),
});

/**
 * DTO: Route param for item ID
 */
export const ItemIdParamDto = z.object({
  id: z.string().min(1),
});

export type ProcessItemDto = z.infer<typeof ProcessItemDto>;
export type ItemIdParamDto = z.infer<typeof ItemIdParamDto>;
