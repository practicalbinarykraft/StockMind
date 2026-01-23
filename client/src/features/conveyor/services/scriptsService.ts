/**
 * Сервис для работы со сценариями
 */

import type { NewsScript, NewsScriptListItem, AISettings, Script } from '../types'

// Типы ответов API
interface DraftsListResponse {
  items: Script[]
  total: number
  limit: number
  offset: number
}

interface NewsScriptsListResponse {
  items: NewsScriptListItem[]
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
 * Базовая функция для API запросов
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${endpoint}`

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const res = await fetch(url, defaultOptions)

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.message || `HTTP Error: ${res.status}`)
  }

  const response = await res.json()
  // Unwrap API format if needed: { success: true, data: {...} }
  return response.data || response
}

/**
 * Получить список черновиков (Script[])
 */
export async function getDrafts(params?: {
  limit?: number
  offset?: number
}): Promise<DraftsListResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set('status', 'draft')
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiRequest<DraftsListResponse>(`/scripts${query ? `?${query}` : ''}`)
}

/**
 * Получить список сценариев (NewsScript[] для completed/review)
 */
export async function getScripts(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<NewsScriptsListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiRequest<NewsScriptsListResponse>(`/scripts${query ? `?${query}` : ''}`)
}

/**
 * Получить один сценарий со всеми итерациями
 */
export async function getScript(id: string): Promise<Script> {
  return apiRequest<Script>(`/scripts/${id}`)
}

/**
 * Получить только итерации сценария
 */
export async function getScriptIterations(id: string): Promise<NewsScript['iterations']> {
  return apiRequest<NewsScript['iterations']>(`/scripts/${id}/iterations`)
}

/**
 * Обновить статус сценария (approve/reject)
 */
export async function updateScriptStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<Script> {
  return apiRequest<Script>(`/scripts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/**
 * Удалить сценарий
 */
export async function deleteScript(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/scripts/${id}`, { method: 'DELETE' })
}

/**
 * Запустить генерацию сценария для новости
 */
export async function startGeneration(newsId: string): Promise<GenerationStartResponse> {
  return apiRequest<GenerationStartResponse>('/generation/start', {
    method: 'POST',
    body: JSON.stringify({ newsId }),
  })
}

/**
 * Остановить генерацию
 */
export async function stopGeneration(scriptId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/generation/stop/${scriptId}`, {
    method: 'POST',
  })
}

/**
 * Перезапустить генерацию
 */
export async function retryGeneration(scriptId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/generation/retry/${scriptId}`, {
    method: 'POST',
  })
}

/**
 * Подключиться к SSE стриму генерации
 * @param scriptId - ID сценария
 * @param onEvent - callback для обработки событий
 * @param onError - callback для обработки ошибок
 * @returns функция для отключения
 */
export function subscribeToGeneration(
  scriptId: string,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(`/api/generation/stream/${scriptId}`)

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
  return apiRequest<AISettings>('/settings')
}

/**
 * Обновить настройки AI
 */
export async function updateAISettings(settings: Partial<AISettings>): Promise<AISettings> {
  return apiRequest<AISettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

/**
 * Добавить пример сценария
 */
export async function addExample(example: {
  filename: string
  content: string
}): Promise<{ id: string; filename: string; content: string }> {
  return apiRequest('/settings/examples', {
    method: 'POST',
    body: JSON.stringify(example),
  })
}

/**
 * Удалить пример сценария
 */
export async function deleteExample(exampleId: string): Promise<{ success: boolean }> {
  return apiRequest(`/settings/examples/${exampleId}`, { method: 'DELETE' })
}

// === API Keys ===

/**
 * Сохранить API ключ
 */
export async function saveApiKey(
  provider: 'anthropic' | 'deepseek',
  apiKey: string
): Promise<{ success: boolean; provider: string; last4: string }> {
  return apiRequest('/settings/api-key', {
    method: 'POST',
    body: JSON.stringify({ provider, apiKey }),
  })
}

/**
 * Удалить API ключ
 */
export async function deleteApiKey(
  provider: 'anthropic' | 'deepseek'
): Promise<{ success: boolean }> {
  return apiRequest(`/settings/api-key/${provider}`, { method: 'DELETE' })
}

/**
 * Протестировать API ключ
 */
export async function testApiKey(
  provider: 'anthropic' | 'deepseek'
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/settings/api-key/${provider}/test`, { method: 'POST' })
}

export const scriptsService = {
  getDrafts,
  getScripts,
  getScript,
  getScriptIterations,
  updateScriptStatus,
  deleteScript,
  startGeneration,
  stopGeneration,
  retryGeneration,
  subscribeToGeneration,
  getAISettings,
  updateAISettings,
  addExample,
  deleteExample,
  saveApiKey,
  deleteApiKey,
  testApiKey,
}
