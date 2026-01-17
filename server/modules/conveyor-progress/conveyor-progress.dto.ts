import { z } from "zod";

/**
 * DTO: Route param for item ID
 */
export const ItemIdParamDto = z.object({
  id: z.string().min(1),
});

export type ItemIdParamDto = z.infer<typeof ItemIdParamDto>;
