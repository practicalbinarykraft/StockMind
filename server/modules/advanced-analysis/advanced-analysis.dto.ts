import { z } from "zod";

// DTO: Analyze news (POST /api/analyze/advanced/news)
export const AnalyzeAdvancedNewsDto = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

// DTO: Analyze reel (POST /api/analyze/advanced/reel)
export const AnalyzeAdvancedReelDto = z.object({
  transcription: z.string().min(1, "Transcription is required"),
  caption: z.string().optional(),
});

// DTO: Analyze script (POST /api/analyze/advanced/script)
export const AnalyzeAdvancedScriptDto = z.object({
  text: z.string().min(1, "Text is required"),
  format: z.string().optional(),
  scenes: z.array(z.any()).optional(),
});

// DTO: Compare analysis (POST /api/analyze/compare)
export const CompareAnalysisDto = z.object({
  type: z.enum(["news", "reel"], {
    errorMap: () => ({ message: "Type must be 'news' or 'reel'" })
  }),
  // For news
  title: z.string().optional(),
  content: z.string().optional(),
  // For reel
  transcription: z.string().optional(),
  caption: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === "news") {
      return !!data.title && !!data.content;
    }
    if (data.type === "reel") {
      return !!data.transcription;
    }
    return false;
  },
  {
    message: "Invalid data for the specified type",
  }
);

// Export types
export type AnalyzeAdvancedNewsDto = z.infer<typeof AnalyzeAdvancedNewsDto>;
export type AnalyzeAdvancedReelDto = z.infer<typeof AnalyzeAdvancedReelDto>;
export type AnalyzeAdvancedScriptDto = z.infer<typeof AnalyzeAdvancedScriptDto>;
export type CompareAnalysisDto = z.infer<typeof CompareAnalysisDto>;
