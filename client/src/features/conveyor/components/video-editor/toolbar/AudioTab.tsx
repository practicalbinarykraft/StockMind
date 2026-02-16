/**
 * Вкладка для настройки аудио
 * Поддерживает загрузку аудио и разделение на сцены
 */

import { useState, useRef } from 'react'
import { useCompositionStore, selectCurrentScene } from '../../../stores/composition'
import { useSplitAudioByScenes, useDeleteSceneAudio } from '../../../services/layers/hooks'
import { useToast } from '@/shared/hooks/use-toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { Upload, Scissors, Play, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Progress } from '@/shared/ui/progress'

export function AudioTab() {
  const currentScene = useCompositionStore(selectCurrentScene)
  const scriptId = useCompositionStore((state) => state.scriptId)
  const uploadFile = useCompositionStore((state) => state.uploadFile)
  const { toast } = useToast()
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const splitAudioMutation = useSplitAudioByScenes()
  const deleteAudioMutation = useDeleteSceneAudio()

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки аудио
      </div>
    )
  }

  const handleUploadAudio = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !currentScene || !scriptId) return

      setIsUploading(true)
      try {
        // Симуляция прогресса
        for (let i = 0; i <= 90; i += 10) {
          setUploadProgress(i)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        
        // Загружаем файл через store (который использует backend API)
        // Здесь нужно загрузить аудио для всего проекта, а не для слоя
        // Это требует отдельного API endpoint
        await uploadFile(currentScene.id, 'background', file)
        
        setUploadProgress(100)
        
        toast({
          title: 'Аудио загружено',
          description: 'Аудиофайл успешно загружен',
        })
      } catch (error) {
        console.error('Upload failed:', error)
        toast({
          title: 'Ошибка загрузки',
          description: error instanceof Error ? error.message : 'Не удалось загрузить аудио',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    }

    input.click()
  }

  const handleSplitAudio = async () => {
    if (!currentScene?.audioUrl || !scriptId) {
      toast({
        title: 'Нет аудио',
        description: 'Сначала загрузите аудиофайл',
        variant: 'destructive',
      })
      return
    }

    try {
      await splitAudioMutation.mutateAsync({
        scriptId,
        audioUrl: currentScene.audioUrl,
      })
      
      toast({
        title: 'Аудио разделено',
        description: 'Аудио успешно разделено на части для каждой сцены',
      })
    } catch (error) {
      console.error('Split failed:', error)
      toast({
        title: 'Ошибка разделения',
        description: error instanceof Error ? error.message : 'Не удалось разделить аудио',
        variant: 'destructive',
      })
    }
  }

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
    }
  }

  const handleDeleteAudio = async () => {
    if (!currentScene || !scriptId) return

    try {
      await deleteAudioMutation.mutateAsync({
        scriptId,
        sceneId: currentScene.id,
      })
      
      toast({
        title: 'Аудио удалено',
        description: 'Аудио сцены успешно удалено',
      })
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: 'Ошибка удаления',
        description: error instanceof Error ? error.message : 'Не удалось удалить аудио',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Загрузка аудио для проекта */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Аудио проекта</h3>
          <p className="text-sm text-muted-foreground">
            Загрузите аудиофайл для всего проекта
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleUploadAudio}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Загрузка...' : 'Загрузить аудио'}
        </Button>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-xs text-center text-muted-foreground">
              Загрузка: {uploadProgress}%
            </p>
          </div>
        )}

        {/* Отображение загруженного аудио */}
        {currentScene?.audioUrl && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Загружено аудио</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAudio}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
            <audio
              ref={audioRef}
              src={currentScene.audioUrl}
              className="w-full h-8"
              controls
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Разделение аудио на сцены */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Разделение по сценам</h3>
          <p className="text-sm text-muted-foreground">
            Автоматически разделить аудио на части для каждой сцены
          </p>
        </div>

        <Alert>
          <AlertDescription>
            Аудио будет разделено на части в соответствии с длительностью каждой сцены.
            Это действие создаст отдельные аудиофайлы для каждой сцены.
          </AlertDescription>
        </Alert>

        <Button
          variant="default"
          className="w-full"
          onClick={handleSplitAudio}
          disabled={splitAudioMutation.isPending || !currentScene?.audioUrl}
        >
          <Scissors className="h-4 w-4 mr-2" />
          {splitAudioMutation.isPending ? 'Разделение...' : 'Разделить по сценам'}
        </Button>
      </div>

      <Separator />

      {/* Аудио текущей сцены */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Аудио сцены</h3>
          <p className="text-sm text-muted-foreground">
            Аудиофайл для текущей сцены
          </p>
        </div>

        {currentScene.audioUrl ? (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label>Аудио загружено</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayAudio}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDeleteAudio}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* HTML5 audio player */}
            <audio 
              ref={audioRef}
              src={currentScene.audioUrl} 
              controls 
              className="w-full" 
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6 border border-dashed rounded-lg">
            Аудио не загружено
          </div>
        )}
      </div>

      <Separator />

      {/* Информация */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Поддерживаемые форматы</h4>
        <p className="text-xs text-muted-foreground">
          MP3, WAV, OGG, AAC, FLAC
        </p>
      </div>
    </div>
  )
}
