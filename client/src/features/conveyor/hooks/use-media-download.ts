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

      // Создаем временную ссылку для скачивания
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.target = '_blank'
      
      // Добавляем в DOM, кликаем и удаляем
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Небольшая задержка для UI-фидбека
      await new Promise(resolve => setTimeout(resolve, 500))
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
