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
  })
  
  // Загрузка статуса медиа
  const statusQuery = useQuery({
    queryKey: ['script-media-status', scriptId],
    queryFn: () => scriptMediaService.getMediaStatus(scriptId),
    enabled: !!scriptId,
    refetchInterval: (query) => {
      // Polling если видео генерируется
      const data = query.state.data
      return data && data.videoStatus === 'generating' ? 5000 : false
    },
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
