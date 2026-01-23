/**
 * Сервис для работы с новостями
 */

import type { NewsItem, RssSource } from '../types'

// Типы ответов API
interface NewsListResponse {
  items: NewsItem[]
  total: number
}

interface RefreshResponse {
  added: number
}

interface ScoreResult {
  score: number
  comment: string
  breakdown: {
    facts: number
    relevance: number
    audience: number
    interest: number
  }
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

// === NEWS ===

/**
 * Получить список новостей
 */
export async function getNews(params?: {
  status?: string
  source?: string
  limit?: number
  offset?: number
}): Promise<NewsListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.source) searchParams.set('source', params.source)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiRequest<NewsListResponse>(`/news${query ? `?${query}` : ''}`)
}

/**
 * Получить одну новость
 */
export async function getNewsItem(id: string): Promise<NewsItem> {
  return apiRequest<NewsItem>(`/news/${id}`)
}

/**
 * Обновить RSS фиды и получить новые новости
 */
export async function refreshNews(): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/news/refresh', { method: 'POST' })
}

/**
 * Проскорить новость через AI
 */
export async function scoreNews(id: string): Promise<ScoreResult> {
  return apiRequest<ScoreResult>(`/news/${id}/score`, { method: 'POST' })
}

/**
 * Проскорить все новые новости
 */
export async function scoreAllNews(): Promise<{ scored: number }> {
  return apiRequest<{ scored: number }>('/news/score-all', { method: 'POST' })
}

/**
 * Обновить статус новости
 */
export async function updateNewsStatus(
  id: string,
  status: 'selected' | 'dismissed'
): Promise<NewsItem> {
  return apiRequest<NewsItem>(`/news/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/**
 * Удалить новость
 */
export async function deleteNews(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/news/${id}`, { method: 'DELETE' })
}

// === RSS SOURCES ===

/**
 * Получить список RSS источников
 */
export async function getSources(): Promise<RssSource[]> {
  return apiRequest<RssSource[]>('/sources')
}

/**
 * Добавить RSS источник
 */
export async function addSource(source: {
  name: string
  url: string
}): Promise<RssSource> {
  return apiRequest<RssSource>('/sources', {
    method: 'POST',
    body: JSON.stringify(source),
  })
}

/**
 * Обновить RSS источник
 */
export async function updateSource(
  id: string,
  data: { name?: string; isActive?: boolean }
): Promise<RssSource> {
  return apiRequest<RssSource>(`/sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Удалить RSS источник
 */
export async function deleteSource(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/sources/${id}`, { method: 'DELETE' })
}

export const newsService = {
  getNews,
  getNewsItem,
  refreshNews,
  scoreNews,
  scoreAllNews,
  updateNewsStatus,
  deleteNews,
  getSources,
  addSource,
  updateSource,
  deleteSource,
}
