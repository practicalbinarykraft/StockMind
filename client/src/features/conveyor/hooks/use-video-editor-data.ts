/**
 * Хук для загрузки данных видео-редактора
 */

import { useQuery } from '@tanstack/react-query'
import { useScript } from './use-scripts'
import { scriptMediaService } from '../services/scriptMediaService'

/**
 * Хук для получения данных скрипта и медиа
 */
export function useVideoEditorData(scriptId: string) {
  // Загрузка скрипта
  const scriptQuery = useScript(scriptId)
  
  // Загрузка медиа
  const mediaQuery = useQuery({
    queryKey: ['script-media', scriptId],
    queryFn: () => scriptMediaService.getMedia(scriptId),
    enabled: !!scriptId,
    // Автообновление каждые 5 секунд при генерации видео
    refetchInterval: (query) => {
      if (query.state.data?.videoStatus === 'generating') {
        return 5000 // 5 секунд при генерации
      }
      return false // Отключить polling когда не генерируется
    },
  })
  
  // Загрузка статуса медиа
  const statusQuery = useQuery({
    queryKey: ['script-media-status', scriptId],
    queryFn: () => scriptMediaService.getMediaStatus(scriptId),
    enabled: !!scriptId,
    // ОТКЛЮЧАЕМ автоматический polling - он управляется в use-video-generation.ts
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000, // 30 секунд - данные считаются свежими
  })
  
  return {
    script: scriptQuery.data,
    scriptLoading: scriptQuery.isLoading,
    scriptError: scriptQuery.error,
    
    media: mediaQuery.data,
    mediaLoading: mediaQuery.isLoading,
    mediaError: mediaQuery.error,
    
    status: statusQuery.data,
    statusLoading: statusQuery.isLoading,
    statusError: statusQuery.error,
    
    isLoading: scriptQuery.isLoading || mediaQuery.isLoading || statusQuery.isLoading,
    hasError: !!scriptQuery.error || !!mediaQuery.error || !!statusQuery.error,
    
    refetchMedia: mediaQuery.refetch,
    refetchStatus: statusQuery.refetch,
  }
}
