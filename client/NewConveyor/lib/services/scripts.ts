/**
 * Сервис для работы со сценариями
 */

import { apiGet, apiPost, apiPatch, apiDelete, API_BASE_URL } from './api'
import { NewsScript, AISettings } from '../../types'

// Типы ответов API
interface ScriptsListResponse {
  items: Array<NewsScript & { iterationsCount: number; lastScore: number | null }>
  total: number
  limit: number
  offset: number
}

interface GenerationStartResponse {
  scriptId: string
  message: string
}

// SSE Event types
export interface SSEEvent {
  event: string
  data: any
}

/**
 * Получить список сценариев
 */
export async function getScripts(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<ScriptsListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiGet<ScriptsListResponse>(`/scripts${query ? `?${query}` : ''}`)
}

/**
 * Получить один сценарий со всеми итерациями
 */
export async function getScript(id: string): Promise<NewsScript> {
  return apiGet<NewsScript>(`/scripts/${id}`)
}

/**
 * Получить только итерации сценария
 */
export async function getScriptIterations(id: string): Promise<NewsScript['iterations']> {
  return apiGet<NewsScript['iterations']>(`/scripts/${id}/iterations`)
}

/**
 * Обновить статус сценария (approve/reject)
 */
export async function updateScriptStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<NewsScript> {
  return apiPatch<NewsScript>(`/scripts/${id}`, { status })
}

/**
 * Удалить сценарий
 */
export async function deleteScript(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/scripts/${id}`)
}

/**
 * Запустить генерацию сценария для новости
 */
export async function startGeneration(newsId: string): Promise<GenerationStartResponse> {
  return apiPost<GenerationStartResponse>('/generation/start', { newsId })
}

/**
 * Остановить генерацию
 */
export async function stopGeneration(scriptId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/generation/stop/${scriptId}`)
}

/**
 * Перезапустить генерацию
 */
export async function retryGeneration(scriptId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/generation/retry/${scriptId}`)
}

/**
 * Подключиться к SSE стриму генерации
 * @param scriptId - ID сценария
 * @param onEvent - callback для обработки событий
 * @returns функция для отключения
 */
export function subscribeToGeneration(
  scriptId: string,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE_URL}/generation/stream/${scriptId}`)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onEvent(data)
    } catch (e) {
      console.error('Ошибка парсинга SSE события:', e)
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE ошибка:', error)
    if (onError) {
      onError(new Error('SSE connection error'))
    }
    eventSource.close()
  }

  // Возвращаем функцию для отключения
  return () => {
    eventSource.close()
  }
}

/**
 * Получить настройки AI
 */
export async function getAISettings(): Promise<AISettings> {
  return apiGet<AISettings>('/settings')
}

/**
 * Обновить настройки AI
 */
export async function updateAISettings(settings: Partial<AISettings>): Promise<AISettings> {
  return apiPatch<AISettings>('/settings', settings)
}

/**
 * Добавить пример сценария
 */
export async function addExample(example: {
  filename: string
  content: string
}): Promise<{ id: string; filename: string; content: string }> {
  return apiPost('/settings/examples', example)
}

/**
 * Удалить пример сценария
 */
export async function deleteExample(exampleId: string): Promise<{ success: boolean }> {
  return apiDelete(`/settings/examples/${exampleId}`)
}

// === API Keys ===

/**
 * Сохранить API ключ
 */
export async function saveApiKey(
  provider: 'anthropic' | 'deepseek',
  apiKey: string
): Promise<{ success: boolean; provider: string; last4: string }> {
  return apiPost('/settings/api-key', { provider, apiKey })
}

/**
 * Удалить API ключ
 */
export async function deleteApiKey(
  provider: 'anthropic' | 'deepseek'
): Promise<{ success: boolean }> {
  return apiDelete(`/settings/api-key/${provider}`)
}

/**
 * Протестировать API ключ
 */
export async function testApiKey(
  provider: 'anthropic' | 'deepseek'
): Promise<{ success: boolean; message: string }> {
  return apiPost(`/settings/api-key/${provider}/test`)
}
