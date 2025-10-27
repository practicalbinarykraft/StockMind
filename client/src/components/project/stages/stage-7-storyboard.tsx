import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Film, CheckCircle2, ArrowLeft, AlertCircle, Sparkles, Play, Pause, Download, Loader2 } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import { useState, useRef, useEffect } from "react"

interface Stage7Props {
  project: Project
  step3Data: any // AI Analysis data
  step4Data: any // Voice data
  step5Data: any // Video data
  step7Data?: any // B-Roll data
}

interface BRollScene {
  sceneId: string
  shotInstructions: string
  aiPrompt: string
  taskId?: string
  status: 'idle' | 'generating' | 'completed' | 'failed'
  videoUrl?: string
  progress?: number
  error?: string
}

export function Stage7Storyboard({ project, step3Data, step4Data, step5Data, step7Data }: Stage7Props) {
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // B-Roll state
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0)
  const [shotInstructions, setShotInstructions] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [brollScenes, setBrollScenes] = useState<BRollScene[]>([])
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Fetch script history to get active version (candidate ?? current)
  const { data: scriptData } = useQuery({
    queryKey: ["/api/projects", project.id, "script-history"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/script-history`)
      if (!res.ok) throw new Error("Failed to fetch script history")
      const body = await res.json()
      return body.data ?? body
    }
  })

  // Determine active version: use candidate if exists, otherwise current
  const currentVersion = scriptData?.currentVersion
  const candidateVersion = scriptData?.versions?.find((v: any) => 
    v.isCandidate === true || v.is_candidate === true
  )
  const activeVersion = candidateVersion ?? currentVersion

  // Use active version scenes, fallback to step3Data for backwards compatibility
  const scenes = activeVersion?.scenes || step3Data?.scenes || []
  const finalScript = step4Data?.finalScript || ""
  const audioUrl = step4Data?.audioUrl
  const selectedVoice = step4Data?.selectedVoice
  const videoUrl = step5Data?.videoUrl
  const videoDuration = step5Data?.duration
  const thumbnailUrl = step5Data?.thumbnailUrl
  const selectedAvatar = step5Data?.selectedAvatar

  // Calculate timecodes
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Initialize B-Roll scenes from step7Data or create new
  useEffect(() => {
    if (step7Data?.brollScenes) {
      setBrollScenes(step7Data.brollScenes)
    } else if (scenesWithTimecodes.length > 0) {
      // Only initialize when scenes are loaded
      setBrollScenes(scenesWithTimecodes.map((scene: any, index: number) => ({
        sceneId: `scene-${index}`,
        shotInstructions: "",
        aiPrompt: "",
        status: 'idle' as const
      })))
    }
  }, [step7Data, scenesWithTimecodes.length])

  // Load selected scene data
  useEffect(() => {
    const currentScene = brollScenes[selectedSceneIndex]
    if (currentScene) {
      setShotInstructions(currentScene.shotInstructions || "")
      setAiPrompt(currentScene.aiPrompt || "")
    }
  }, [selectedSceneIndex, brollScenes])

  // Generate AI Prompt mutation
  const generatePromptMutation = useMutation({
    mutationFn: async () => {
      const sceneText = scenesWithTimecodes[selectedSceneIndex]?.text || ""
      const res = await apiRequest("POST", `/api/projects/${project.id}/broll/generate-prompt`, {
        shotInstructions,
        sceneText
      })
      return await res.json()
    },
    onSuccess: (data) => {
      setAiPrompt(data.aiPrompt)
      
      // Update brollScenes
      const updated = [...brollScenes]
      const currentScene = updated[selectedSceneIndex] || { sceneId: `scene-${selectedSceneIndex}`, status: 'idle' as const }
      updated[selectedSceneIndex] = {
        ...currentScene,
        shotInstructions,
        aiPrompt: data.aiPrompt
      }
      setBrollScenes(updated)
      
      toast({
        title: "Промпт сгенерирован",
        description: "AI создал описание для B-Roll видео",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сгенерировать промпт",
      })
    }
  })

  // Generate B-Roll mutation
  const generateBRollMutation = useMutation({
    mutationFn: async () => {
      const currentScene = brollScenes[selectedSceneIndex]
      if (!currentScene) {
        throw new Error("Scene not initialized")
      }
      const res = await apiRequest("POST", `/api/projects/${project.id}/broll/generate`, {
        sceneId: currentScene.sceneId,
        aiPrompt
      })
      return await res.json()
    },
    onSuccess: (data) => {
      const updated = [...brollScenes]
      const currentScene = updated[selectedSceneIndex] || { sceneId: `scene-${selectedSceneIndex}`, status: 'idle' as const }
      updated[selectedSceneIndex] = {
        ...currentScene,
        taskId: data.taskId,
        status: 'generating',
        progress: 0
      }
      setBrollScenes(updated)
      
      // Start polling
      startPolling(data.taskId)
      
      toast({
        title: "Генерация началась",
        description: "Kie.ai создаёт B-Roll видео...",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось начать генерацию",
      })
    }
  })

  const startPolling = (taskId: string) => {
    if (pollingInterval) clearInterval(pollingInterval)

    const sceneIndex = selectedSceneIndex // Capture current index

    const interval = setInterval(async () => {
      try {
        const res = await apiRequest("GET", `/api/projects/${project.id}/broll/status/${taskId}`)
        const status = await res.json()

        // Use functional update to avoid stale closure
        setBrollScenes(prev => {
          const updated = [...prev]
          const currentScene = updated[sceneIndex] || { sceneId: `scene-${sceneIndex}`, status: 'idle' as const }
          updated[sceneIndex] = {
            ...currentScene,
            status: status.status,
            progress: status.progress,
            videoUrl: status.videoUrl,
            error: status.error
          }

          // Save when completed/failed (with fresh data)
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval)
            setPollingInterval(null)
            
            // Save with updated data
            saveBRollData(updated).catch(err => {
              console.error('Save error:', err)
              toast({
                variant: "destructive",
                title: "Ошибка сохранения",
                description: "Не удалось сохранить B-Roll данные",
              })
            })
            
            if (status.status === 'completed') {
              toast({
                title: "B-Roll готов!",
                description: "Видео успешно сгенерировано",
              })
            }
          }

          return updated
        })
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 3000) // Poll every 3 seconds

    setPollingInterval(interval)
  }

  const saveBRollData = async (scenes: BRollScene[]) => {
    try {
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 7,
        data: { brollScenes: scenes },
        completedAt: new Date().toISOString()
      })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
    } catch (error) {
      console.error('Failed to save B-Roll data:', error)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [pollingInterval])

  // Back to Stage 6 mutation
  const backToStage6Mutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 6
      })
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
    }
  })

  // Complete project mutation
  const completeProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        status: 'completed',
        currentStage: 6
      })
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Проект завершён",
        description: "Ваш видео проект готов!",
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

  const handleDownloadVideo = () => {
    if (!videoUrl) return
    window.open(videoUrl, '_blank')
  }

  const handleDownloadAudio = () => {
    if (!audioUrl) return
    window.open(audioUrl, '_blank')
  }

  const currentBRollScene = brollScenes[selectedSceneIndex]
  const hasRequiredData = videoUrl || audioUrl || finalScript || scenes.length > 0

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Film className="h-7 w-7 text-chart-3" />
          <h1 className="text-2xl font-bold">B-Roll генерация</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Добавьте фоновое видео для каждой сцены (опционально)
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
        <div className="flex gap-6">
          {/* LEFT SIDE - Stage 6 Content (65%) */}
          <div className="flex-1 space-y-6" style={{ width: '65%' }}>
            {/* Timeline */}
            {scenesWithTimecodes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Timeline проекта</CardTitle>
                    {videoDuration && (
                      <Badge variant="secondary">
                        {formatTime(videoDuration)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scenesWithTimecodes.map((scene: any, index: number) => (
                      <div 
                        key={index} 
                        className={`flex items-start gap-4 p-3 rounded-md cursor-pointer transition-colors ${
                          selectedSceneIndex === index ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover-elevate'
                        }`}
                        onClick={() => setSelectedSceneIndex(index)}
                        data-testid={`scene-${index}`}
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
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadAudio}
                        data-testid="button-download-audio"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        MP3
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
                        {selectedAvatar || "Аватар"}
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleDownloadVideo}
                        data-testid="button-download-video"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        MP4
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT SIDE - B-Roll Panel (35%) */}
          <div className="space-y-4" style={{ width: '35%' }}>
            <Card>
              <CardHeader>
                <CardTitle>B-Roll генерация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scene Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Выбор сцены
                  </label>
                  <Select 
                    value={selectedSceneIndex.toString()} 
                    onValueChange={(v) => setSelectedSceneIndex(parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-scene">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scenesWithTimecodes.map((scene: any, index: number) => (
                        <SelectItem key={index} value={index.toString()}>
                          Сцена {index + 1} ({formatTime(scene.startTime)}-{formatTime(scene.endTime)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shot Instructions */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Инструкции съёмки
                  </label>
                  <Textarea
                    placeholder="Опишите желаемые кадры: крупный план, движение камеры, настроение..."
                    value={shotInstructions}
                    onChange={(e) => setShotInstructions(e.target.value)}
                    rows={4}
                    data-testid="input-shot-instructions"
                  />
                </div>

                {/* Generate AI Prompt Button */}
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => generatePromptMutation.mutate()}
                  disabled={!shotInstructions || generatePromptMutation.isPending}
                  data-testid="button-generate-prompt"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatePromptMutation.isPending ? "Генерация..." : "Сгенерировать AI промпт"}
                </Button>

                {/* AI Prompt Display */}
                {aiPrompt && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      AI Промпт (Kie.ai)
                    </label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {aiPrompt}
                    </div>
                  </div>
                )}

                {/* Generate B-Roll Button */}
                <Button
                  className="w-full gap-2"
                  onClick={() => generateBRollMutation.mutate()}
                  disabled={!aiPrompt || currentBRollScene?.status === 'generating' || generateBRollMutation.isPending}
                  data-testid="button-generate-broll"
                >
                  <Film className="h-4 w-4" />
                  {currentBRollScene?.status === 'generating' ? "Генерация..." : "Сгенерировать B-Roll"}
                </Button>

                {/* Status Display */}
                {currentBRollScene?.status === 'generating' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Генерация {currentBRollScene.progress || 0}%</span>
                  </div>
                )}

                {currentBRollScene?.status === 'completed' && currentBRollScene.videoUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-chart-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Готово!</span>
                    </div>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        src={currentBRollScene.videoUrl}
                        controls
                        className="w-full h-full"
                        data-testid="video-broll-preview"
                      />
                    </div>
                  </div>
                )}

                {currentBRollScene?.status === 'failed' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {currentBRollScene.error || "Ошибка генерации"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <Button 
          variant="outline" 
          size="lg" 
          className="gap-2"
          onClick={() => backToStage6Mutation.mutate()}
          disabled={backToStage6Mutation.isPending}
          data-testid="button-back-to-export"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к экспорту
        </Button>
        <Button 
          size="lg" 
          className="gap-2" 
          onClick={() => completeProjectMutation.mutate()}
          disabled={completeProjectMutation.isPending}
          data-testid="button-complete-project"
        >
          <CheckCircle2 className="h-4 w-4" />
          Завершить проект
        </Button>
      </div>
    </div>
  )
}
