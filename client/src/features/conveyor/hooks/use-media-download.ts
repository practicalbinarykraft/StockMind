/**
 * Хук для скачивания медиа-файлов
 */

import { useState } from 'react'

interface UseMediaDownloadReturn {
  isDownloading: boolean
  downloadError: string | null
  downloadFile: (url: string, filename: string) => Promise<void>
}

function isSameOrigin(url: string): boolean {
  return url.startsWith('/') || url.startsWith(window.location.origin)
}

export function useMediaDownload(): UseMediaDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const downloadFile = async (url: string, filename: string) => {
    if (!url) {
      setDownloadError('URL is required')
      return
    }

    try {
      setIsDownloading(true)
      setDownloadError(null)

      if (isSameOrigin(url)) {
        // Same-origin: use <a> link click (reliable, handles redirects natively)
        const check = await fetch(url, {
          method: 'HEAD',
          credentials: 'include',
        }).catch(() => null)

        if (check && !check.ok) {
          throw new Error(
            check.status === 401
              ? 'Необходима авторизация'
              : `Ошибка сервера (${check.status})`,
          )
        }

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // Cross-origin: fetch blob (needed for CORS bypass via server proxy)
        const response = await fetch(url, { credentials: 'include' })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        window.URL.revokeObjectURL(blobUrl)
      }
    } catch (err) {
      console.error('Download failed:', err)
      setDownloadError(err instanceof Error ? err.message : 'Ошибка скачивания')
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    isDownloading,
    downloadError,
    downloadFile,
  }
}
