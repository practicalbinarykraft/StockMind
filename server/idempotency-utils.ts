import { createHash } from 'crypto';

/**
 * Generate idempotency key for video generation requests
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
  
  return createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32); // Use first 32 chars for brevity
}
