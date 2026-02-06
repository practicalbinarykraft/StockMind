/**
 * Карточка с информацией о медиа-файле
 * ≤80 строк
 */

import { Card, CardContent } from '@/shared/ui/card'
import { FileAudio, FileVideo } from 'lucide-react'

interface MediaInfoCardProps {
  type: 'audio' | 'video'
  filename?: string
  filesize?: number
  duration?: number
  generatedAt?: string
}

export function MediaInfoCard({
  type,
  filename,
  filesize,
  duration,
  generatedAt,
}: MediaInfoCardProps) {
  const Icon = type === 'audio' ? FileAudio : FileVideo

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 space-y-2 text-sm">
            {filename && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Файл:</span>
                <span className="font-medium">{filename}</span>
              </div>
            )}
            
            {filesize !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Размер:</span>
                <span className="font-medium">{formatFileSize(filesize)}</span>
              </div>
            )}
            
            {duration !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Длительность:</span>
                <span className="font-medium">{formatDuration(duration)}</span>
              </div>
            )}
            
            {generatedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Создано:</span>
                <span className="font-medium">{formatDate(generatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
