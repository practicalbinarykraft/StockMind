/**
 * Кнопка скачивания с состояниями
 * ≤60 строк
 */

import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface DownloadButtonProps {
  onDownload: () => void
  isDownloading?: boolean
  disabled?: boolean
  label?: string
}

export function DownloadButton({
  onDownload,
  isDownloading = false,
  disabled = false,
  label = 'Скачать',
}: DownloadButtonProps) {
  return (
    <Button
      onClick={onDownload}
      disabled={disabled || isDownloading}
      className="w-full"
      size="lg"
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Скачивание...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  )
}
