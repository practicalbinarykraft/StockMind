/**
 * Утилита для выполнения API запросов с обработкой ошибок соединения
 */

export interface ApiError {
  message: string
  code?: string
  requestId?: string
  status?: number
}

export interface ApiResponse<T> {
  data: T
  error?: ApiError
}

/**
 * Класс для обработки ошибок API
 */
export class ApiException extends Error {
  code?: string
  requestId?: string
  status?: number

  constructor(message: string, code?: string, requestId?: string, status?: number) {
    super(message)
    this.name = 'ApiException'
    this.code = code
    this.requestId = requestId
    this.status = status
  }
}

/**
 * Проверяет, является ли ошибка ошибкой соединения
 */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof ApiException) {
    return error.status === undefined || error.status === 0 || error.code === 'NETWORK_ERROR'
  }
  if (error instanceof Error) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('Network request failed')
  }
  return false
}

/**
 * Выполняет API запрос с обработкой ошибок
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

    // Проверяем статус ответа
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const requestId = response.headers.get('X-Request-ID') || 
                       errorData.requestId || 
                       generateRequestId()
      
      throw new ApiException(
        errorData.message || `Ошибка запроса: ${response.statusText}`,
        errorData.code || 'API_ERROR',
        requestId,
        response.status
      )
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    // Обработка ошибок сети
    if (error instanceof ApiException) {
      throw error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const requestId = generateRequestId()
      throw new ApiException(
        'Ошибка соединения. Проверьте подключение к интернету или VPN.',
        'NETWORK_ERROR',
        requestId,
        0
      )
    }

    // Неизвестная ошибка
    const requestId = generateRequestId()
    throw new ApiException(
      error instanceof Error ? error.message : 'Неизвестная ошибка',
      'UNKNOWN_ERROR',
      requestId
    )
  }
}

/**
 * Генерирует уникальный ID для запроса
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * GET запрос
 */
export async function get<T>(url: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'GET' })
}

/**
 * POST запрос
 */
export async function post<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT запрос
 */
export async function put<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE запрос
 */
export async function del<T>(url: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' })
}

