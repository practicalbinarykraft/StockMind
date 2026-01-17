import { z } from "zod";

// DTO: Analyze script (POST /api/ai/analyze-script)
export const AnalyzeScriptDto = z.object({
  format: z.string().min(1, "Format is required"),
  content: z.string().min(1, "Content is required"),
});

// DTO: Score text (POST /api/ai/score-text)
export const ScoreTextDto = z.object({
  text: z.string().min(1, "Text is required"),
});

// Export types
export type AnalyzeScriptDto = z.infer<typeof AnalyzeScriptDto>;
export type ScoreTextDto = z.infer<typeof ScoreTextDto>;
