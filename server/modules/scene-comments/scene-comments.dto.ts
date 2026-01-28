import { z } from "zod";

/**
 * DTO для создания комментария к сцене
 */
export const CreateSceneCommentDto = z.object({
  scriptId: z.string(),
  scriptType: z.enum(['library', 'auto']),
  sceneId: z.string(),
  sceneIndex: z.number().int().min(0),
  commentText: z.string().min(1),
  commentType: z.enum(['prompt', 'note', 'feedback']).default('prompt'),
});

export type CreateSceneCommentDto = z.infer<typeof CreateSceneCommentDto>;

/**
 * DTO для получения комментариев по скрипту
 */
export const GetScriptCommentsDto = z.object({
  scriptId: z.string(),
});

export type GetScriptCommentsDto = z.infer<typeof GetScriptCommentsDto>;

/**
 * DTO для получения комментариев по сцене
 */
export const GetSceneCommentsDto = z.object({
  scriptId: z.string(),
  sceneId: z.string(),
});

export type GetSceneCommentsDto = z.infer<typeof GetSceneCommentsDto>;

/**
 * DTO для удаления комментария
 */
export const DeleteCommentDto = z.object({
  id: z.string(),
});

export type DeleteCommentDto = z.infer<typeof DeleteCommentDto>;
