/**
 * Базовая конфигурация API
 */

// URL бэкенда - в production заменить на реальный
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/**
 * Базовый fetch с обработкой ошибок
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP Error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Ошибка соединения с сервером. Проверьте что бэкенд запущен.')
    }
    throw error
  }
}

/**
 * GET запрос
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' })
}

/**
 * POST запрос
 */
export function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PATCH запрос
 */
export function apiPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE запрос
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' })
}
