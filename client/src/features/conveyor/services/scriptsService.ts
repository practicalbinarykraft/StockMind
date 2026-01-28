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
  
  // Маппинг полей с сервера на фронтенд формат
  const mappedScripts = Array.isArray(scripts) ? scripts.map((s: any) => {
    // Нормализуем sourceType: instagram остаётся instagram, всё остальное -> rss
    const normalizedSourceType = s.sourceType === 'instagram' ? 'instagram' : 'rss'
    
    return {
      ...s,
      // Маппинг полей для совместимости с UI компонентами
      newsTitle: s.newsTitle || s.title,
      sourceName: s.sourceName || s.sourceTitle || (normalizedSourceType === 'instagram' ? 'Instagram' : 'Новости'),
      score: s.score ?? s.aiScore ?? 0,
      // Нормализованный sourceType для фильтрации
      sourceType: normalizedSourceType,
    }
  }) : []
  
  return {
    items: mappedScripts,
    total: mappedScripts.length,
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
  
  // Маппинг полей с сервера на фронтенд формат
  const mappedScripts = Array.isArray(scripts) ? scripts.map((s: any) => {
    // Нормализуем sourceType: instagram остаётся instagram, всё остальное -> rss
    const normalizedSourceType = s.sourceType === 'instagram' ? 'instagram' : 'rss'
    
    return {
      ...s,
      // Маппинг полей для совместимости с UI компонентами
      newsTitle: s.newsTitle || s.title,
      sourceName: s.sourceName || s.sourceTitle || (normalizedSourceType === 'instagram' ? 'Instagram' : 'Новости'),
      score: s.score ?? s.aiScore ?? 0,
      // Нормализованный sourceType для фильтрации
      sourceType: normalizedSourceType,
    }
  }) : []
  
  return {
    items: mappedScripts,
    total: mappedScripts.length,
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
  
  // Маппинг полей auto_scripts на формат NewsScript для UI
  const mapAutoScriptToNewsScript = (s: any) => ({
    ...s,
    // Основные поля для отображения
    newsTitle: s.newsTitle || s.title,
    newsSource: s.newsSource || s.sourceType || s.formatName || 'Неизвестно',
    // Итерации (revisionCount + 1 для текущей версии)
    currentIteration: (s.revisionCount || 0) + 1,
    maxIterations: 3, // Константа для UI
    // Статус маппинг
    status: s.status === 'pending' ? 'pending' : 
            s.status === 'revision' ? 'in_progress' : 
            s.status === 'approved' ? 'completed' : 
            s.status === 'rejected' ? 'completed' : 'human_review',
    // Итерации для совместимости (пустой массив если нет)
    iterations: s.iterations || [],
    iterationsCount: (s.revisionCount || 0) + 1,
  })
  
  // Если это массив, преобразуем в нужный формат
  if (Array.isArray(scripts)) {
    return {
      items: scripts.map(mapAutoScriptToNewsScript),
      total: scripts.length,
    }
  }
  
  // Если уже объект с items, маппим items
  if (scripts.items && Array.isArray(scripts.items)) {
    return {
      ...scripts,
      items: scripts.items.map(mapAutoScriptToNewsScript),
    }
  }
  
  return scripts
}

/**
 * Получить один сценарий со всеми итерациями
 * Эндпоинт: GET /api/scripts/:id (для черновиков из библиотеки)
 */
export async function getScript(id: string): Promise<Script> {
  const response = await apiRequest('GET', `/api/scripts/${id}`)
  const data = await response.json()
  const script = data.data || data
  
  // Маппинг полей для совместимости с UI
  return {
    ...script,
    newsTitle: script.newsTitle || script.title,
    sourceName: script.sourceName || script.sourceTitle || script.sourceType || 'Неизвестно',
    score: script.score ?? script.aiScore ?? 0,
  }
}

/**
 * Получить auto-script по ID
 * Эндпоинт: GET /api/auto-scripts/:id
 */
export async function getAutoScript(id: string): Promise<Script> {
  const response = await apiRequest('GET', `/api/auto-scripts/${id}`)
  const data = await response.json()
  const script = data.data || data
  
  // Маппинг полей auto_script на формат Script для UI
  return {
    ...script,
    // Основные поля
    newsTitle: script.newsTitle || script.title,
    title: script.title,
    sourceName: script.sourceName || script.sourceType || script.formatName || 'Неизвестно',
    score: script.score ?? script.finalScore ?? 0,
    // Сцены уже в правильном формате
    scenes: script.scenes || [],
    // Статус
    status: script.status === 'pending' ? 'draft' : 
            script.status === 'approved' ? 'ready' : 
            script.status === 'revision' ? 'draft' : 'draft',
  }
}

/**
 * Универсальная функция получения скрипта
 * Сначала пробует scripts_library, затем auto_scripts
 */
export async function getScriptUniversal(id: string): Promise<Script> {
  try {
    // Сначала пробуем scripts_library
    return await getScript(id)
  } catch (error: any) {
    // Если 404, пробуем auto_scripts
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      return await getAutoScript(id)
    }
    throw error
  }
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
 * Обновить сценарий в scripts_library
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
 * Обновить auto-script
 * Эндпоинт: PATCH /api/auto-scripts/:id
 */
export async function updateAutoScript(
  id: string,
  updates: Partial<Script>
): Promise<Script> {
  const response = await apiRequest('PATCH', `/api/auto-scripts/${id}`, updates)
  const data = await response.json()
  return data.data || data
}

/**
 * Универсальная функция обновления скрипта
 * Сначала пробует scripts_library, затем auto_scripts
 */
export async function updateScriptUniversal(
  id: string,
  updates: Partial<Script>
): Promise<Script> {
  try {
    // Сначала пробуем scripts_library
    return await updateScript(id, updates)
  } catch (error: any) {
    // Если 404, пробуем auto_scripts
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      return await updateAutoScript(id, updates)
    }
    throw error
  }
}

/**
 * Создать скрипт в библиотеке
 * Эндпоинт: POST /api/scripts
 */
export async function createScriptInLibrary(data: Partial<Script>): Promise<Script> {
  const response = await apiRequest('POST', '/api/scripts', data)
  const result = await response.json()
  return result.data || result
}

/**
 * Сохранить auto_script в библиотеку (scripts_library)
 * Если скрипт уже в библиотеке - обновляет, иначе создаёт новый
 */
export async function saveAutoScriptToLibrary(
  autoScriptId: string,
  status: 'draft' | 'ready' | 'completed'
): Promise<Script> {
  // Получаем auto_script
  const autoScript = await getAutoScript(autoScriptId)
  
  // Создаём новую запись в scripts_library
  const libraryScript = await createScriptInLibrary({
    title: autoScript.title || autoScript.newsTitle,
    status: status,
    scenes: autoScript.scenes || [],
    fullText: autoScript.scenes?.map((s: any) => s.text).join('\n') || '',
    format: (autoScript as any).formatId || (autoScript as any).formatName || undefined,
    aiScore: autoScript.score ?? (autoScript as any).finalScore ?? 0,
    sourceType: (autoScript as any).sourceType || 'rss',
    sourceId: autoScriptId,
    sourceTitle: autoScript.title || autoScript.newsTitle,
  })
  
  return libraryScript
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
 * Использует универсальные функции для работы с scripts_library и auto_scripts
 */
export async function updateScene(
  scriptId: string,
  sceneId: string,
  updates: Partial<Scene>
): Promise<Script> {
  // Сначала получаем текущий скрипт (универсальная функция)
  const script = await getScriptUniversal(scriptId)
  
  // Обновляем нужную сцену
  const updatedScenes = script.scenes.map(scene =>
    scene.id === sceneId ? { ...scene, ...updates } : scene
  )
  
  // Отправляем обновленный скрипт (универсальная функция)
  return updateScriptUniversal(scriptId, { scenes: updatedScenes })
}

// === Scene Comments ===

/**
 * Сохранить комментарий к сцене
 */
export async function saveSceneComment(data: {
  scriptId: string
  scriptType: 'library' | 'auto'
  sceneId: string
  sceneIndex: number
  commentText: string
  commentType?: 'prompt' | 'note' | 'feedback'
}): Promise<any> {
  const response = await apiRequest('POST', '/api/scene-comments', data)
  const result = await response.json()
  return result.data || result
}

/**
 * Получить комментарии для сценария
 */
export async function getScriptComments(scriptId: string): Promise<any[]> {
  const response = await apiRequest('GET', `/api/scene-comments/${scriptId}`)
  const result = await response.json()
  return result.data || result
}

/**
 * Получить комментарии для конкретной сцены
 */
export async function getSceneComments(scriptId: string, sceneId: string): Promise<any[]> {
  const response = await apiRequest('GET', `/api/scene-comments/${scriptId}/scenes/${sceneId}`)
  const result = await response.json()
  return result.data || result
}

export const scriptsService = {
  getDrafts,
  getReadyScripts,
  getScripts,
  getScript,
  getAutoScript,
  getScriptUniversal,
  getScriptIterations,
  updateScriptStatus,
  updateScript,
  updateAutoScript,
  updateScriptUniversal,
  createScriptInLibrary,
  saveAutoScriptToLibrary,
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
  saveSceneComment,
  getScriptComments,
  getSceneComments,
}
