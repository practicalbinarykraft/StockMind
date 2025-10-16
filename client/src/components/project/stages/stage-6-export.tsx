import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Download, CheckCircle2, Film, AlertCircle, Camera, Play, Pause } from "lucide-react"
import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import html2canvas from "html2canvas"

interface Stage6Props {
  project: Project
  step3Data: any // AI Analysis data
  step4Data: any // Voice data
  step5Data: any // Video data
}

export function Stage6FinalExport({ project, step3Data, step4Data, step5Data }: Stage6Props) {
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const screenshotRef = useRef<HTMLDivElement>(null)

  // Extract data from each step
  const scenes = step3Data?.scenes || []
  const finalScript = step4Data?.finalScript || ""
  const audioUrl = step4Data?.audioUrl
  const selectedVoice = step4Data?.selectedVoice
  const videoUrl = step5Data?.videoUrl
  const videoDuration = step5Data?.duration
  const thumbnailUrl = step5Data?.thumbnailUrl
  const selectedAvatar = step5Data?.selectedAvatar

  // Calculate timecodes based on video duration and number of scenes
  const scenesWithTimecodes = scenes.map((scene: any, index: number) => {
    if (!videoDuration || scenes.length === 0) return { ...scene, startTime: 0, endTime: 0, duration: 0 }
    
    const sceneDuration = videoDuration / scenes.length
    const startTime = index * sceneDuration
    const endTime = (index + 1) * sceneDuration
    
    return {
      ...scene,
      startTime,
      endTime,
      duration: sceneDuration
    }
  })

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Complete project mutation
  const completeProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, { 
        status: 'completed' 
      })
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Проект завершён",
        description: "Ваш видеопроект успешно завершён!",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось завершить проект",
      })
    }
  })

  // Continue to Storyboard mutation
  const continueToStoryboardMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 7
      })
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
    }
  })

  const handleDownloadVideo = () => {
    if (!videoUrl) return
    window.open(videoUrl, '_blank')
  }

  const handleDownloadAudio = () => {
    if (!audioUrl) return
    window.open(audioUrl, '_blank')
  }

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const handleSaveScreenshot = async () => {
    if (!screenshotRef.current) return
    
    try {
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#000000',
        scale: 2, // Higher quality
      })
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `reelrepurposer-${project.id}-timeline.png`
        link.click()
        URL.revokeObjectURL(url)
        
        toast({
          title: "Скриншот сохранён",
          description: "Timeline и сценарий сохранены в изображение",
        })
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось создать скриншот",
      })
    }
  }

  const hasRequiredData = videoUrl || audioUrl || finalScript || scenes.length > 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="h-8 w-8 text-chart-2" />
          <h1 className="text-3xl font-bold">Результат</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Итоговый пайплайн вашего видео проекта
        </p>
      </div>

      {!hasRequiredData ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Данные не найдены. Пожалуйста, завершите предыдущие этапы.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {/* Screenshot Section - Timeline and Script */}
          <div ref={screenshotRef} className="space-y-6">
            {/* Timeline with Timecodes */}
            {scenesWithTimecodes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Timeline проекта</CardTitle>
                    {videoDuration && (
                      <Badge variant="secondary" className="text-base">
                        Длительность: {formatTime(videoDuration)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scenesWithTimecodes.map((scene: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-4 p-3 rounded-md bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium mb-1">
                            Сцена {index + 1}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {formatTime(scene.startTime)} - {formatTime(scene.endTime)} ({Math.round(scene.duration)}s)
                          </div>
                          <div className="text-sm">{scene.text}</div>
                        </div>
                        {scene.score !== undefined && (
                          <Badge 
                            variant="outline"
                            className={
                              scene.score >= 90 ? "border-chart-2 text-chart-2" :
                              scene.score >= 70 ? "border-chart-3 text-chart-3" :
                              scene.score >= 50 ? "border-chart-4 text-chart-4" :
                              "border-chart-5 text-chart-5"
                            }
                          >
                            {scene.score}/100
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Script */}
            {finalScript && (
              <Card>
                <CardHeader>
                  <CardTitle>Сценарий</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {finalScript}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Аудио</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={toggleAudioPlayback}
                      data-testid="button-play-audio"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {selectedVoice || "Загруженный аудио"}
                      </div>
                      {videoDuration && (
                        <div className="text-xs text-muted-foreground">
                          {videoDuration.toFixed(1)}s
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadAudio}
                      data-testid="button-download-audio"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать MP3
                    </Button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Player */}
          {videoUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Видео с аватаром</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                      poster={thumbnailUrl}
                      data-testid="video-final"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Аватар: {selectedAvatar || "Неизвестно"}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleDownloadVideo}
                      data-testid="button-download-video"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать MP4
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={handleSaveScreenshot}
              data-testid="button-screenshot"
            >
              <Camera className="h-5 w-5" />
              Сохранить скриншот
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={() => continueToStoryboardMutation.mutate()}
              disabled={continueToStoryboardMutation.isPending}
              data-testid="button-stage7"
            >
              <Film className="h-5 w-5" />
              Добавить раскадровку
            </Button>
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={() => completeProjectMutation.mutate()}
              disabled={completeProjectMutation.isPending}
              data-testid="button-complete"
            >
              <CheckCircle2 className="h-5 w-5" />
              Завершить проект
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
