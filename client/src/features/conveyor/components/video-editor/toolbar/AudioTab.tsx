/**
 * Вкладка для настройки аудио
 * Поддерживает генерацию аудио (ElevenLabs TTS), загрузку и разделение на сцены
 */

import { useState, useRef } from 'react'
import { useLocation } from 'wouter'
import { useCompositionStore, selectCurrentScene } from '../../../stores/composition'
import { useSplitAudioByScenes, useDeleteSceneAudio } from '../../../services/layers/hooks'
import { useToast } from '@/shared/hooks/use-toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { Badge } from '@/shared/ui/badge'
import { Upload, Scissors, Play, Trash2, Mic, ExternalLink, CheckCircle, Volume2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Progress } from '@/shared/ui/progress'
import type { ScriptMedia } from '../../../services/scriptMediaService'

interface AudioTabProps {
  scriptId?: string
  media?: ScriptMedia | null
}

export function AudioTab({ scriptId: propScriptId, media }: AudioTabProps) {
  const [, navigate] = useLocation()
  const currentScene = useCompositionStore(selectCurrentScene)
  const storeScriptId = useCompositionStore((state) => state.scriptId)
  const uploadFile = useCompositionStore((state) => state.uploadFile)
  const { toast } = useToast()
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const generatedAudioRef = useRef<HTMLAudioElement>(null)
  
  const splitAudioMutation = useSplitAudioByScenes()
  const deleteAudioMutation = useDeleteSceneAudio()

  const effectiveScriptId = propScriptId || storeScriptId

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки аудио
      </div>
    )
  }

  const handleNavigateToAudioPage = () => {
    if (effectiveScriptId) {
      navigate(`/conveyor/video-editor/${effectiveScriptId}/audio`)
    }
  }

  const handleUploadAudio = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !currentScene || !effectiveScriptId) return

      setIsUploading(true)
      try {
        for (let i = 0; i <= 90; i += 10) {
          setUploadProgress(i)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        
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
    if (!currentScene?.audioUrl || !effectiveScriptId) {
      toast({
        title: 'Нет аудио',
        description: 'Сначала загрузите аудиофайл',
        variant: 'destructive',
      })
      return
    }

    try {
      await splitAudioMutation.mutateAsync({
        scriptId: effectiveScriptId,
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
    if (!currentScene || !effectiveScriptId) return

    try {
      await deleteAudioMutation.mutateAsync({
        scriptId: effectiveScriptId,
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
      {/* Генерация аудио через ElevenLabs TTS */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Генерация аудио</h3>
          <p className="text-sm text-muted-foreground">
            Сгенерируйте озвучку через ElevenLabs TTS
          </p>
        </div>

        {/* Если аудио уже сгенерировано — показываем его */}
        {media?.audioUrl ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Сгенерированное аудио</span>
              </div>
              <Badge variant="default" className="gap-1 text-xs">
                <CheckCircle className="h-3 w-3" />
                Готово
              </Badge>
            </div>

            {media.selectedVoice && (
              <p className="text-xs text-muted-foreground">
                Голос: {media.selectedVoice}
              </p>
            )}

            <audio
              ref={generatedAudioRef}
              src={media.audioUrl}
              controls
              className="w-full"
            />

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleNavigateToAudioPage}
            >
              <Mic className="h-4 w-4 mr-2" />
              Изменить аудио
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            className="w-full"
            onClick={handleNavigateToAudioPage}
          >
            <Mic className="h-4 w-4 mr-2" />
            Сгенерировать аудио (ElevenLabs)
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Загрузка аудио вручную */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Загрузка аудио</h3>
          <p className="text-sm text-muted-foreground">
            Загрузите аудиофайл вручную
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
          disabled={splitAudioMutation.isPending || (!currentScene?.audioUrl && !media?.audioUrl)}
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
