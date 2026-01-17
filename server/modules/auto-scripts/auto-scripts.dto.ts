import { z } from "zod";
import { RejectionCategory } from "@shared/schema";

/**
 * DTO: Get scripts query params
 */
export const GetScriptsQueryDto = z.object({
  status: z.string().optional(),
});

/**
 * DTO: Script ID param
 */
export const ScriptIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Reject script
 */
export const RejectScriptDto = z.object({
  reason: z.string().min(1).max(500),
  category: z.enum([
    RejectionCategory.TOO_LONG,
    RejectionCategory.TOO_SHORT,
    RejectionCategory.BORING_INTRO,
    RejectionCategory.WEAK_CTA,
    RejectionCategory.TOO_FORMAL,
    RejectionCategory.TOO_CASUAL,
    RejectionCategory.BORING_TOPIC,
    RejectionCategory.WRONG_TONE,
    RejectionCategory.NO_HOOK,
    RejectionCategory.TOO_COMPLEX,
    RejectionCategory.OFF_TOPIC,
    RejectionCategory.OTHER,
  ]),
});

/**
 * DTO: Revise script
 */
export const ReviseScriptDto = z.object({
  feedbackText: z
    .string()
    .trim()
    .min(1, "Введите текст рецензии")
    .max(3000, "Текст слишком длинный (макс. 3000 символов)"),
  selectedSceneIds: z
    .union([z.array(z.number()), z.null()])
    .optional()
    .transform((val) => {
      // Convert null to undefined, keep array as is
      if (val === null || val === undefined) return undefined;
      return val;
    }),
});

/**
 * DTO: Feedback history query
 */
export const FeedbackHistoryQueryDto = z.object({
  limit: z.string().optional(),
});

export type GetScriptsQueryDto = z.infer<typeof GetScriptsQueryDto>;
export type ScriptIdParamDto = z.infer<typeof ScriptIdParamDto>;
export type RejectScriptDto = z.infer<typeof RejectScriptDto>;
export type ReviseScriptDto = z.infer<typeof ReviseScriptDto>;
export type FeedbackHistoryQueryDto = z.infer<typeof FeedbackHistoryQueryDto>;
