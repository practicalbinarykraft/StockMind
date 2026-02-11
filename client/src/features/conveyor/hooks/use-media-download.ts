/**
 * Хук для скачивания медиа-файлов
 * ≤100 строк
 */

import { useState } from 'react'

interface UseMediaDownloadReturn {
  isDownloading: boolean
  downloadError: string | null
  downloadFile: (url: string, filename: string) => Promise<void>
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

      // Скачиваем файл через fetch для обхода CORS
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Получаем blob
      const blob = await response.blob()

      // Создаем URL для blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Создаем временную ссылку для скачивания
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      
      // Добавляем в DOM, кликаем и удаляем
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Освобождаем blob URL
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
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
