/**
 * Утилита для проксирования URL медиафайлов HeyGen
 */

/**
 * Проксирует URL изображения через наш сервер
 * @param url - Исходный URL изображения
 * @returns Прокси URL или исходный URL, если он не с HeyGen CDN
 */
export function getProxiedImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined

  // Проксируем только URL с HeyGen CDN
  if (url.includes('heygen.ai') || url.includes('heygen.com')) {
    return `/api/heygen/image-proxy?url=${encodeURIComponent(url)}`
  }

  return url
}

/**
 * Проксирует URL видео через наш сервер
 * @param url - Исходный URL видео
 * @param download - Флаг для скачивания
 * @returns Прокси URL или исходный URL, если он не с HeyGen CDN
 */
export function getProxiedVideoUrl(url: string | undefined, download = false): string | undefined {
  if (!url) return undefined

  // Проксируем только URL с HeyGen CDN
  if (url.includes('heygen.ai') || url.includes('heygen.com')) {
    const params = new URLSearchParams({
      url: url,
      ...(download && { download: 'true' }),
    })
    return `/api/heygen/video-proxy?${params.toString()}`
  }

  return url
}
