import { z } from "zod";

/**
 * DTO: Query params for items list
 */
export const GetItemsQueryDto = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val), 100) : 50)),
});

/**
 * DTO: Route param for item ID
 */
export const ItemIdParamDto = z.object({
  id: z.string().min(1),
});

export type GetItemsQueryDto = z.infer<typeof GetItemsQueryDto>;
export type ItemIdParamDto = z.infer<typeof ItemIdParamDto>;
