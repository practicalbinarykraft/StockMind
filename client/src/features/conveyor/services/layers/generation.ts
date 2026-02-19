/**
 * Генерация контента через Kie.ai и polling статуса
 */

import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/http'
import type { GenerationStatus, KieModel } from '../../types/layers'

/**
 * Запуск генерации изображения
 * POST /api/kie-ai/generate-image
 */
export async function generateImage(data: {
  prompt: string
  model: KieModel
  aspectRatio?: string
  resolution?: '1K' | '2K' | '4K'
  numImages?: number
}): Promise<{ jobId: string; type: 'image' | 'video' }> {
  const response = await apiRequest('POST', '/api/kie-ai/generate-image', data)
  const result = await response.json()
  const job = result.data || result
  return { jobId: job.id, type: job.type ?? 'image' }
}

/**
 * Запуск генерации видео
 * POST /api/kie-ai/generate-video
 */
export async function generateVideo(data: {
  prompt: string
  model: 'kling-ai-video'
  duration?: number
  aspectRatio?: '16:9' | '9:16'
}): Promise<{ jobId: string; type: 'image' | 'video' }> {
  const response = await apiRequest('POST', '/api/kie-ai/generate-video', data)
  const result = await response.json()
  const job = result.data || result
  return { jobId: job.id, type: job.type ?? 'video' }
}

/**
 * Конвертация изображения в видео
 * POST /api/kie-ai/image-to-video
 */
export async function imageToVideo(data: {
  imageUrl: string
  prompt?: string
  model: 'kling-ai-i2v'
  duration?: number
}): Promise<{ jobId: string; type: 'image' | 'video' }> {
  const response = await apiRequest('POST', '/api/kie-ai/image-to-video', data)
  const result = await response.json()
  const job = result.data || result
  return { jobId: job.id, type: job.type ?? 'video' }
}

/**
 * Получить статус генерации
 * GET /api/kie-ai/jobs/:jobId/status
 */
export async function getJobStatus(jobId: string): Promise<{
  status: GenerationStatus
  type?: 'image' | 'video'
  resultUrl?: string
  progress?: number
  errorMessage?: string
}> {
  const response = await apiRequest('GET', `/api/kie-ai/jobs/${jobId}/status`)
  const result = await response.json()
  return result.data || result
}

const MAX_POLL_ATTEMPTS = 200
const POLL_INTERVAL_MS = 3000

/**
 * Hook для polling статуса генерации
 * Автоматически опрашивает API каждые 3 секунды пока статус не станет 'ready' или 'failed'
 * Останавливается после MAX_POLL_ATTEMPTS попыток (~10 минут) для предотвращения бесконечного цикла
 */
export function useGenerationStatus(
  jobId: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['generation-status', jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'ready' || status === 'failed') {
        return false
      }
      if ((query.state.dataUpdateCount ?? 0) >= MAX_POLL_ATTEMPTS) {
        return false
      }
      return POLL_INTERVAL_MS
    },
    staleTime: 0,
    retry: 2,
  })
}
