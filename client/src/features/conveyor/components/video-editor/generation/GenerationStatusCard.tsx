/**
 * Карточка с прогрессом генерации контента
 * Отображает статус, прогресс и результат генерации
 */

import { useEffect, useRef } from 'react'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { CheckCircle2, XCircle, Loader2, Download, X } from 'lucide-react'
import { useCompositionStore } from '../../../stores/composition'
import { useGenerationStatus } from '../../../services/layers/generation'
import { apiRequest } from '@/shared/api/http'
import type { GenerationStatus, ContentType } from '../../../types/layers'

interface GenerationStatusCardProps {
  status: GenerationStatus
  jobId?: string
  resultUrl?: string
  contentType?: ContentType
  layerType: 'background' | 'overlay'
  sceneId: string
}

export function GenerationStatusCard({
  status,
  jobId,
  resultUrl,
  contentType,
  layerType,
  sceneId,
}: GenerationStatusCardProps) {
  const updateBackgroundLayer = useCompositionStore((state) => state.updateBackgroundLayer)
  const updateOverlayLayer = useCompositionStore((state) => state.updateOverlayLayer)
  const scriptId = useCompositionStore((state) => state.scriptId)

  const isPollingActive = status === 'processing' || status === 'pending'
  const { data: statusData, isError: isQueryError } = useGenerationStatus(jobId, isPollingActive)

  const prevStatusRef = useRef<string | undefined>(undefined)
  const prevResultUrlRef = useRef<string | undefined>(undefined)

  /**
   * Сохраняет sourceUrl и contentType в БД через PATCH API,
   * чтобы данные были доступны на странице экспорта.
   */
  const persistLayerToBackend = (layerId: string, sourceUrl: string, ct: string) => {
    if (!scriptId) return
    apiRequest('PATCH', `/api/scripts/${scriptId}/layers/${layerId}`, {
      contentType: ct,
      sourceUrl,
    }).catch((err) => {
      console.error('Failed to persist layer sourceUrl to backend:', err)
    })
  }

  useEffect(() => {
    if (!jobId) return

    if (isQueryError && isPollingActive) {
      const updateLayer = layerType === 'background' ? updateBackgroundLayer : updateOverlayLayer
      updateLayer(sceneId, {
        generationStatus: 'failed' as GenerationStatus,
      })
      return
    }

    if (!statusData) return

    const statusChanged = prevStatusRef.current !== statusData.status
    const resultUrlChanged = statusData.resultUrl && prevResultUrlRef.current !== statusData.resultUrl

    if (!statusChanged && !resultUrlChanged) return

    prevStatusRef.current = statusData.status
    prevResultUrlRef.current = statusData.resultUrl

    const updateLayer = layerType === 'background' ? updateBackgroundLayer : updateOverlayLayer
    const updates: Record<string, unknown> = {
      generationStatus: statusData.status,
    }

    if (statusData.resultUrl) {
      updates.sourceUrl = statusData.resultUrl
    }
    if (statusData.type) {
      updates.contentType = statusData.type
    }

    updateLayer(sceneId, updates)

    // Получаем layerId из стора для сохранения в БД
    if (statusData.resultUrl) {
      const scenes = useCompositionStore.getState().scenes
      const scene = scenes.get(sceneId)
      const layer = layerType === 'background' ? scene?.layers.background : scene?.layers.overlay
      if (layer?.id) {
        persistLayerToBackend(layer.id, statusData.resultUrl, statusData.type || (layerType === 'background' ? 'image' : 'image'))
      }
    }
  }, [statusData, isQueryError, jobId, isPollingActive, layerType, sceneId, scriptId, updateBackgroundLayer, updateOverlayLayer])

  const isVideo = contentType === 'video' || (resultUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) != null)

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'В очереди на генерацию...'
      case 'processing':
        return 'Генерация контента...'
      case 'ready':
        return 'Генерация завершена'
      case 'failed':
        return 'Ошибка генерации'
    }
  }

  const handleDismiss = () => {
    const updateLayer = layerType === 'background' ? updateBackgroundLayer : updateOverlayLayer
    updateLayer(sceneId, {
      generationStatus: undefined,
      generationJobId: undefined,
    })
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Статус */}
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="font-medium text-sm">{getStatusText()}</p>
          {jobId && (
            <p className="text-xs text-muted-foreground">Job ID: {jobId}</p>
          )}
        </div>
        {(status === 'ready' || status === 'failed') && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Прогресс бар для processing */}
      {(status === 'pending' || status === 'processing') && (
        <Progress value={status === 'pending' ? 10 : 50} className="w-full" />
      )}

      {/* Ошибка */}
      {status === 'failed' && (
        <Alert variant="destructive">
          <AlertDescription>
            {statusData?.errorMessage
              ? `Ошибка: ${statusData.errorMessage}`
              : 'Не удалось сгенерировать контент. Попробуйте еще раз или измените промпт.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Результат */}
      {status === 'ready' && resultUrl && (
        <div className="space-y-3">
          <div className="aspect-video rounded-md overflow-hidden border">
            {isVideo ? (
              <video src={resultUrl} className="w-full h-full object-cover" controls />
            ) : (
              <img src={resultUrl} alt="Generated content" className="w-full h-full object-cover" />
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="default" className="flex-1" onClick={handleDismiss}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Применено к слою
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href={resultUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Информация */}
      <div className="text-xs text-muted-foreground">
        {status === 'processing' && (
          <p>
            Генерация может занять от 30 секунд до нескольких минут в зависимости от модели.
          </p>
        )}
      </div>
    </Card>
  )
}
