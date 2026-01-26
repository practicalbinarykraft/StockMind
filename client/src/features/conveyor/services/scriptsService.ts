/**
 * Сервис для работы со сценариями
 */

import { apiRequest } from '@/shared/api/http'
import type { NewsScript, NewsScriptListItem, AISettings, Script, Scene } from '../types'

// Типы ответов API
interface DraftsListResponse {
  items: Script[]
  total?: number
  limit?: number
  offset?: number
}

interface NewsScriptsListResponse {
  items: NewsScriptListItem[]
  total?: number
  limit?: number
  offset?: number
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
 * Получить список черновиков (Script[])
 * Эндпоинт: GET /api/scripts?status=draft
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
  const response = await apiRequest('GET', `/api/scripts${query ? `?${query}` : ''}`)
  const result = await response.json()
  const scripts = result.data || result
  
  // Сервер возвращает массив скриптов, преобразуем в нужный формат
  return {
    items: Array.isArray(scripts) ? scripts : [],
    total: Array.isArray(scripts) ? scripts.length : 0,
  }
}

/**
 * Получить список готовых сценариев (Script[])
 * Эндпоинт: GET /api/scripts?status=ready
 */
export async function getReadyScripts(params?: {
  limit?: number
  offset?: number
}): Promise<DraftsListResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set('status', 'ready')
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  const response = await apiRequest('GET', `/api/scripts${query ? `?${query}` : ''}`)
  const result = await response.json()
  const scripts = result.data || result
  
  // Сервер возвращает массив скриптов, преобразуем в нужный формат
  return {
    items: Array.isArray(scripts) ? scripts : [],
    total: Array.isArray(scripts) ? scripts.length : 0,
  }
}

/**
 * Получить список сценариев (NewsScript[] для completed/review)
 * Эндпоинт: GET /api/auto-scripts?status={status}
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
  const response = await apiRequest('GET', `/api/auto-scripts${query ? `?${query}` : ''}`)
  const result = await response.json()
  const scripts = result.data || result
  
  // Если это массив, преобразуем в нужный формат
  if (Array.isArray(scripts)) {
    return {
      items: scripts,
      total: scripts.length,
    }
  }
  
  // Если уже объект с items, возвращаем как есть
  return scripts
}

/**
 * Получить один сценарий со всеми итерациями
 * Эндпоинт: GET /api/scripts/:id (для черновиков из библиотеки)
 */
export async function getScript(id: string): Promise<Script> {
  const response = await apiRequest('GET', `/api/scripts/${id}`)
  const data = await response.json()
  return data.data || data
}

/**
 * Получить только итерации сценария
 * Эндпоинт: GET /api/auto-scripts/:id/versions
 */
export async function getScriptIterations(id: string): Promise<NewsScript['iterations']> {
  const response = await apiRequest('GET', `/api/auto-scripts/${id}/versions`)
  const data = await response.json()
  return data.data || data
}

/**
 * Обновить статус сценария (approve/reject)
 * Эндпоинт: POST /api/auto-scripts/:id/approve или /api/auto-scripts/:id/reject
 */
export async function updateScriptStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<Script> {
  const endpoint = status === 'approved' ? 'approve' : 'reject'
  const response = await apiRequest('POST', `/api/auto-scripts/${id}/${endpoint}`)
  const data = await response.json()
  return data.data || data
}

/**
 * Обновить сценарий (универсальная функция)
 * Эндпоинт: PATCH /api/scripts/:id (для черновиков из библиотеки)
 */
export async function updateScript(
  id: string,
  updates: Partial<Script>
): Promise<Script> {
  const response = await apiRequest('PATCH', `/api/scripts/${id}`, updates)
  const data = await response.json()
  return data.data || data
}

/**
 * Удалить сценарий
 * Эндпоинт: DELETE /api/auto-scripts/:id
 */
export async function deleteScript(id: string): Promise<{ success: boolean }> {
  await apiRequest('DELETE', `/api/auto-scripts/${id}`)
  return { success: true }
}

/**
 * Запустить генерацию сценария для новости
 * ⚠️ ЭНДПОИНТ НЕ СУЩЕСТВУЕТ: POST /api/generation/start
 * TODO: Реализовать на сервере
 */
export async function startGeneration(newsId: string): Promise<GenerationStartResponse> {
  const response = await apiRequest('POST', '/api/generation/start', { newsId })
  const data = await response.json()
  return data.data || data
}

/**
 * Остановить генерацию
 * ⚠️ ЭНДПОИНТ НЕ СУЩЕСТВУЕТ: POST /api/generation/stop/:scriptId
 * TODO: Реализовать на сервере
 */
export async function stopGeneration(scriptId: string): Promise<{ success: boolean }> {
  const response = await apiRequest('POST', `/api/generation/stop/${scriptId}`)
  const data = await response.json()
  return data.data || data
}

/**
 * Перезапустить генерацию
 * ⚠️ ЭНДПОИНТ НЕ СУЩЕСТВУЕТ: POST /api/generation/retry/:scriptId
 * TODO: Реализовать на сервере
 */
export async function retryGeneration(scriptId: string): Promise<{ success: boolean }> {
  const response = await apiRequest('POST', `/api/generation/retry/${scriptId}`)
  const data = await response.json()
  return data.data || data
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
 * Эндпоинт: GET /api/ai-settings
 */
export async function getAISettings(): Promise<AISettings> {
  const response = await apiRequest('GET', '/api/ai-settings')
  const data = await response.json()
  return data.data || data
}

/**
 * Обновить настройки AI
 * Эндпоинт: PUT /api/ai-settings
 */
export async function updateAISettings(settings: Partial<AISettings>): Promise<AISettings> {
  const response = await apiRequest('PUT', '/api/ai-settings', settings)
  const data = await response.json()
  return data.data || data
}

/**
 * Добавить пример сценария
 * ⚠️ ЭНДПОИНТ НЕ СУЩЕСТВУЕТ: POST /api/settings/examples
 * TODO: Реализовать на сервере
 */
export async function addExample(example: {
  filename: string
  content: string
}): Promise<{ id: string; filename: string; content: string }> {
  const response = await apiRequest('POST', '/api/settings/examples', example)
  const data = await response.json()
  return data.data || data
}

/**
 * Удалить пример сценария
 * ⚠️ ЭНДПОИНТ НЕ СУЩЕСТВУЕТ: DELETE /api/settings/examples/:exampleId
 * TODO: Реализовать на сервере
 */
export async function deleteExample(exampleId: string): Promise<{ success: boolean }> {
  await apiRequest('DELETE', `/api/settings/examples/${exampleId}`)
  return { success: true }
}

// === API Keys ===

/**
 * Сохранить API ключ
 * Эндпоинт: POST /api/settings/api-keys
 */
export async function saveApiKey(
  provider: 'anthropic' | 'deepseek',
  apiKey: string
): Promise<{ success: boolean; provider: string; last4: string }> {
  const response = await apiRequest('POST', '/api/settings/api-keys', { provider, apiKey })
  const data = await response.json()
  return { success: true, provider: data.provider, last4: data.last4 }
}

/**
 * Удалить API ключ
 * Эндпоинт: DELETE /api/settings/api-keys/:id
 * Сначала нужно получить ID ключа
 */
export async function deleteApiKey(
  provider: 'anthropic' | 'deepseek'
): Promise<{ success: boolean }> {
  // Get all keys first to find the ID
  const keysResponse = await apiRequest('GET', '/api/settings/api-keys')
  const keysData = await keysResponse.json()
  const keys = keysData.data || keysData
  const key = keys.find((k: any) => k.provider === provider)
  
  if (!key) {
    throw new Error(`API ключ для провайдера ${provider} не найден`)
  }
  
  await apiRequest('DELETE', `/api/settings/api-keys/${key.id}`)
  return { success: true }
}

/**
 * Протестировать API ключ
 * Эндпоинт: POST /api/settings/api-keys/:id/test
 */
export async function testApiKey(
  provider: 'anthropic' | 'deepseek'
): Promise<{ success: boolean; message: string }> {
  // Get all keys first to find the ID
  const keysResponse = await apiRequest('GET', '/api/settings/api-keys')
  const keysData = await keysResponse.json()
  const keys = keysData.data || keysData
  const key = keys.find((k: any) => k.provider === provider)
  
  if (!key) {
    throw new Error(`API ключ для провайдера ${provider} не найден`)
  }
  
  const response = await apiRequest('POST', `/api/settings/api-keys/${key.id}/test`)
  const data = await response.json()
  return data.data || data
}

/**
 * Генерация вариантов сценария
 * Эндпоинт: POST /api/scripts/generate-variants
 */
export async function generateVariants(data: {
  sourceText: string
  prompt?: string
  format: string
  lengthOption?: 'keep' | 'increase' | 'decrease'
}): Promise<{
  scenes: Array<{ id: string; type: string; text: string }>
  variants: Record<number, Array<{ id: string; text: string; score?: number }>>
}> {
  const response = await apiRequest('POST', '/api/scripts/generate-variants', data)
  const result = await response.json()
  return result.data || result
}

/**
 * Обновить сцену сценария
 * Использует PATCH /api/auto-scripts/:id для обновления сцен
 */
export async function updateScene(
  scriptId: string,
  sceneId: string,
  updates: Partial<Scene>
): Promise<Script> {
  // Сначала получаем текущий скрипт
  const script = await getScript(scriptId)
  
  // Обновляем нужную сцену
  const updatedScenes = script.scenes.map(scene =>
    scene.id === sceneId ? { ...scene, ...updates } : scene
  )
  
  // Отправляем обновленный скрипт
  return updateScript(scriptId, { scenes: updatedScenes })
}

export const scriptsService = {
  getDrafts,
  getReadyScripts,
  getScripts,
  getScript,
  getScriptIterations,
  updateScriptStatus,
  updateScript,
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
  generateVariants,
  updateScene,
}
