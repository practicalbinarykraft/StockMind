import { z } from 'zod';

// ============================================================================
// DTO для парсинга scriptId из параметров
// ============================================================================

export const ScriptIdParamDto = z.object({
  scriptId: z.string(),
});

export type ScriptIdParamDto = z.infer<typeof ScriptIdParamDto>;
