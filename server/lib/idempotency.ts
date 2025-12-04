import crypto from "node:crypto";

export const makeIdemKey = () => crypto.randomUUID();

export const clampIdemKey = (key?: string) =>
  key && key.length <= 64 ? key : undefined;

/**
 * Generate stable idempotency key for video generation requests
 * Used to prevent duplicate video generation jobs
 */
export function generateIdempotencyKey(params: {
  projectId: string;
  sceneId?: string | null;
  prompt: string;
  model?: string;
  aspectRatio?: string;
}): string {
  const { projectId, sceneId, prompt, model, aspectRatio } = params;
  
  // Create a stable hash based on all request parameters
  const data = JSON.stringify({
    projectId,
    sceneId: sceneId || 'none',
    prompt: prompt.trim().toLowerCase(),
    model: model || 'default',
    aspectRatio: aspectRatio || 'default',
  });
  
  return crypto.createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32); // Use first 32 chars for brevity
}
