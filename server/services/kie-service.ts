import axios from 'axios'
import { logger } from '../lib/logger'

const KIE_API_BASE = 'https://api.kie.ai'

export interface KieVideoRequest {
  prompt: string
  model?: string
  aspectRatio?: string
  requestId?: string
}

export interface KieVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  progress?: number
  error?: string
}

export async function generateKieVideo(
  apiKey: string,
  request: KieVideoRequest
): Promise<string> {
  const model = request.model || 'veo3_fast'

  logger.info('[Kie.ai] Generating B-Roll video', { model, prompt: request.prompt.slice(0, 80) })

  const payload: Record<string, unknown> = {
    prompt: request.prompt,
    model,
    aspect_ratio: request.aspectRatio || '9:16',
  }

  const response = await axios.post(
    `${KIE_API_BASE}/api/v1/veo/generate`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    },
  )

  const result = response.data
  if (result.code !== 200) {
    throw new Error(result.msg || `Kie.ai API error code ${result.code}`)
  }

  const taskId = result.data?.taskId
  if (!taskId) {
    throw new Error('No taskId returned from Kie.ai')
  }

  logger.info(`[Kie.ai] B-Roll generation started: ${taskId}`)
  return taskId
}

/**
 * Maps Veo3 successFlag to our internal status.
 * 0 = generating, 1 = success, 2 = failed, 3 = generation failed
 */
function mapVeoStatus(successFlag: number): KieVideoStatus['status'] {
  switch (successFlag) {
    case 1: return 'completed'
    case 2:
    case 3: return 'failed'
    default: return 'processing'
  }
}

export async function getKieVideoStatus(
  apiKey: string,
  taskId: string
): Promise<KieVideoStatus> {
  const response = await axios.get(
    `${KIE_API_BASE}/api/v1/veo/record-info`,
    {
      params: { taskId },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    },
  )

  const result = response.data
  if (result.code !== 200) {
    throw new Error(result.msg || `Kie.ai API error code ${result.code}`)
  }

  const data = result.data
  const status = mapVeoStatus(data.successFlag ?? 0)
  const videoUrl = data.response?.resultUrls?.[0]

  return {
    status,
    videoUrl,
    error: data.errorMessage || undefined,
  }
}
