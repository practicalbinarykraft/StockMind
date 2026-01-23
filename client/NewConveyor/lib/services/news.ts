/**
 * Сервис для работы с новостями
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api'

// Типы
export interface NewsItem {
  id: string
  title: string
  content: string | null
  fullContent: string | null
  source: string | null
  sourceUrl: string | null
  url: string | null
  imageUrl: string | null
  aiScore: number | null
  aiComment: string | null
  status: 'new' | 'scored' | 'selected' | 'used' | 'dismissed'
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface RssSource {
  id: string
  name: string
  url: string
  isActive: boolean
  lastFetchedAt: string | null
  createdAt: string
}

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
  return apiGet<NewsListResponse>(`/news${query ? `?${query}` : ''}`)
}

/**
 * Получить одну новость
 */
export async function getNewsItem(id: string): Promise<NewsItem> {
  return apiGet<NewsItem>(`/news/${id}`)
}

/**
 * Обновить RSS фиды и получить новые новости
 */
export async function refreshNews(): Promise<RefreshResponse> {
  return apiPost<RefreshResponse>('/news/refresh')
}

/**
 * Проскорить новость через AI
 */
export async function scoreNews(id: string): Promise<ScoreResult> {
  return apiPost<ScoreResult>(`/news/${id}/score`)
}

/**
 * Проскорить все новые новости
 */
export async function scoreAllNews(): Promise<{ scored: number }> {
  return apiPost<{ scored: number }>('/news/score-all')
}

/**
 * Обновить статус новости
 */
export async function updateNewsStatus(
  id: string,
  status: 'selected' | 'dismissed'
): Promise<NewsItem> {
  return apiPatch<NewsItem>(`/news/${id}`, { status })
}

/**
 * Удалить новость
 */
export async function deleteNews(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/news/${id}`)
}

// === RSS SOURCES ===

/**
 * Получить список RSS источников
 */
export async function getSources(): Promise<RssSource[]> {
  return apiGet<RssSource[]>('/sources')
}

/**
 * Добавить RSS источник
 */
export async function addSource(source: {
  name: string
  url: string
}): Promise<RssSource> {
  return apiPost<RssSource>('/sources', source)
}

/**
 * Обновить RSS источник
 */
export async function updateSource(
  id: string,
  data: { name?: string; isActive?: boolean }
): Promise<RssSource> {
  return apiPatch<RssSource>(`/sources/${id}`, data)
}

/**
 * Удалить RSS источник
 */
export async function deleteSource(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/sources/${id}`)
}
