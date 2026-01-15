import { z } from "zod";

// DTO: Project ID params
export const ProjectIdParamDto = z.object({
  id: z.string().min(1, "Project ID is required"),
});

// DTO: Generate AI prompt (POST /api/projects/:id/broll/generate-prompt)
export const GeneratePromptBodyDto = z.object({
  shotInstructions: z.string().min(1, "Shot instructions are required"),
  sceneText: z.string().optional(),
});

// DTO: Generate B-roll video (POST /api/projects/:id/broll/generate)
export const GenerateBrollBodyDto = z.object({
  sceneId: z.string().optional(),
  aiPrompt: z.string().min(1, "AI prompt is required"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
});

// DTO: B-roll status params (GET /api/projects/:id/broll/status/:taskId)
export const BrollStatusParamsDto = z.object({
  id: z.string().min(1, "Project ID is required"),
  taskId: z.string().min(1, "Task ID is required"),
});

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type GeneratePromptBodyDto = z.infer<typeof GeneratePromptBodyDto>;
export type GenerateBrollBodyDto = z.infer<typeof GenerateBrollBodyDto>;
export type BrollStatusParamsDto = z.infer<typeof BrollStatusParamsDto>;
