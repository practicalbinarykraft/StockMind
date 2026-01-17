import { z } from "zod";

/**
 * DTO: Query params for event history
 */
export const GetEventHistoryQueryDto = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val), 100) : 50)),
});

export type GetEventHistoryQueryDto = z.infer<typeof GetEventHistoryQueryDto>;
