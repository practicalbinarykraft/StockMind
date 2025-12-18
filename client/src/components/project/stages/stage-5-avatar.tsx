import { useState, useEffect, useMemo } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import { Users, Search, CheckCircle2, Play, Pause, AlertCircle, User, Globe, ArrowRight, FastForward, ImageOff, Download, Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { useAvatarImages, useProxiedVideo } from "./stage-5/hooks"

interface Stage5Props {
  project: Project
  stepData: any  // Step 4 data (voice, script, audio)
  step5Data?: any  // Step 5 data (video status, videoId, videoUrl)
}

interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  gender?: string
  preview_image_url?: string
  preview_video_url?: string
  is_public?: boolean
}

interface AvatarsResponse {
  avatars: HeyGenAvatar[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}

interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error_message?: string
}

export function Stage5AvatarSelection({ project, stepData, step5Data }: Stage5Props) {
  const { toast } = useToast()
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [previewingAvatar, setPreviewingAvatar] = useState<string | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  
  // Pagination state for display (9 per page in UI)
  const [myAvatarsPage, setMyAvatarsPage] = useState(0)
  const [publicAvatarsPage, setPublicAvatarsPage] = useState(0)
  const AVATARS_PER_PAGE = 9
  
  // Server pagination state (120 per request)
  const [serverPage, setServerPage] = useState(0)
  const [allLoadedAvatars, setAllLoadedAvatars] = useState<HeyGenAvatar[]>([])
  const [hasMorePages, setHasMorePages] = useState(true)

  // Hook for proxied video loading with loading state
  const {
    videoUrl: proxiedVideoUrl,
    isLoading: isVideoLoading,
    isLoaded: isVideoLoaded,
    hasError: hasVideoError,
    errorMessage: videoErrorMessage,
    onVideoLoaded,
    onVideoError,
    downloadVideo
  } = useProxiedVideo(videoStatus?.video_url)

  // Get script and voice from Stage 4 data
  const script = stepData?.finalScript || ""
  const voiceId = stepData?.selectedVoice
  const audioUrl = stepData?.audioUrl  // Keep relative path for backend

  // Debug logs
  console.log("Stage 5 received stepData (step 4):", stepData)
  console.log("Stage 5 received step5Data (step 5):", step5Data)
  console.log("Script extracted:", script)

  // Fetch step data to check if already skipped
  const { data: step5DataFromApi } = useQuery({
    queryKey: ["/api/projects", project.id, "steps", 5],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/steps`)
      if (!res.ok) throw new Error("Failed to fetch steps")
      const steps = await res.json()
      const step5 = steps.find((s: any) => s.stepNumber === 5)
      return step5 ?? null
    }
  })
  
  // Check if step is already skipped or completed
  const isStepSkipped = !!step5DataFromApi?.skipReason
  const isStepCompleted = !!step5DataFromApi?.completedAt

  // Fetch initial avatars from HeyGen with aggressive caching
  const { data: avatarsResponse, isLoading, error, refetch: refetchAvatars } = useQuery<AvatarsResponse>({
    queryKey: ["/api/heygen/avatars", serverPage],
    queryFn: async () => {
      const response = await fetch(`/api/heygen/avatars?page=${serverPage}&limit=30`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch avatars')
      }
      return response.json()
    },
    enabled: !!script, // Only fetch if we have a script
    staleTime: 1000 * 60 * 60 * 6, // 6 hours - avatars don't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
    retry: 0, // Don't retry - HeyGen API is very slow, single timeout is enough
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if cached
  })

  // Accumulate all loaded avatars from all pages
  useEffect(() => {
    if (avatarsResponse?.avatars) {
      setAllLoadedAvatars(prev => {
        // If it's page 0 (refresh), replace all
        if (serverPage === 0) {
          return avatarsResponse.avatars
        }
        // Otherwise, append new avatars (avoid duplicates)
        const newAvatars = avatarsResponse.avatars.filter(
          newAvatar => !prev.some(existing => existing.avatar_id === newAvatar.avatar_id)
        )
        return [...prev, ...newAvatars]
      })
      setHasMorePages(avatarsResponse.pagination.hasNextPage)
    }
  }, [avatarsResponse, serverPage])

  // Use accumulated avatars for display
  const avatars = allLoadedAvatars

  // Save selected avatar mutation (for persistence)
  const saveSelectedAvatarMutation = useMutation({
    mutationFn: async (avatarId: string) => {
      return await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 5,
        data: {
          selectedAvatar: avatarId,
          // Preserve existing data
          ...(step5Data?.videoId && { videoId: step5Data.videoId }),
          ...(step5Data?.videoUrl && { videoUrl: step5Data.videoUrl }),
          ...(step5Data?.status && { status: step5Data.status })
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps", 5] })
    }
  })

  // Handle avatar selection with auto-save
  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId)
    // Auto-save selection (debounced by mutation)
    saveSelectedAvatarMutation.mutate(avatarId)
  }

  // Restore selected avatar from saved data
  useEffect(() => {
    if (step5Data?.selectedAvatar && !selectedAvatar) {
      setSelectedAvatar(step5Data.selectedAvatar)
    }
  }, [step5Data?.selectedAvatar, selectedAvatar])

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAvatar || !script) return null
      
      const res = await apiRequest(
        "POST",
        "/api/heygen/generate",
        { avatarId: selectedAvatar, script, audioUrl, voiceId }
      )
      const response = await res.json() as { videoId: string }
      return response
    },
    onSuccess: async (data) => {
      console.log("Video generation started:", data)
      if (data?.videoId) {
        setGeneratedVideoId(data.videoId)
        setVideoStatus({ status: 'pending' })
        
        // Save videoId to DB immediately
        await saveVideoIdToStepData(data.videoId, selectedAvatar!)
        
        // Start polling
        pollVideoStatus(data.videoId)
      }
    },
    onError: (error: any) => {
      console.error("Video generation failed:", error)
      setVideoStatus({ status: 'failed', error_message: error.message })
    }
  })

  // Continue to next stage mutation
  const continueToStage6Mutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 6
      })
    },
    onSuccess: async () => {
      // Force refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
    }
  })

  const saveVideoIdToStepData = async (videoId: string, avatarId: string) => {
    // Save videoId immediately when generation starts
    try {
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 5,
        data: {
          videoId: videoId,
          selectedAvatar: avatarId,
          status: 'generating'
        }
      })
      console.log("Video ID saved to step 5:", videoId)
    } catch (err) {
      console.error("Failed to save video ID:", err)
    }
  }

  const saveCompletedVideoToStepData = async (status: VideoStatus) => {
    if (status.status !== 'completed' || !status.video_url) return

    // Update with completed video data
    // Use step5Data values as fallback if state is null (e.g. after page reload)
    try {
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 5,
        data: {
          videoUrl: status.video_url,
          thumbnailUrl: status.thumbnail_url,
          duration: status.duration,
          selectedAvatar: selectedAvatar || step5Data?.selectedAvatar,
          videoId: generatedVideoId || step5Data?.videoId,
          status: 'completed'
        }
      })
      console.log("Completed video data saved to step 5")
    } catch (err) {
      console.error("Failed to save completed video data:", err)
    }
  }

  const pollVideoStatus = async (videoId: string) => {
    console.log(`🎬 Starting polling for video: ${videoId}`)
    
    let pollCount = 0
    const MAX_POLLS = 20 // 20 polls * 30 seconds = 10 minutes max
    const POLL_INTERVAL = 30000 // 30 seconds (reduced to avoid server overload)
    
    // Start polling with a local interval reference
    const intervalId = setInterval(async () => {
      pollCount++
      
      // Safety timeout: stop polling after max attempts
      if (pollCount > MAX_POLLS) {
        console.error(`⏰ Polling timeout after ${MAX_POLLS} attempts`)
        clearInterval(intervalId)
        setPollingInterval(null)
        setVideoStatus(prevStatus => ({
          ...prevStatus,
          status: 'failed',
          error_message: 'Video generation timeout (10 min). Please check HeyGen dashboard or try again later.'
        }))
        return
      }
      
      try {
        console.log(`🔄 Polling video status for: ${videoId} (attempt ${pollCount}/${MAX_POLLS})`)
        const res = await apiRequest("GET", `/api/heygen/status/${videoId}`)
        const response = await res.json() as { success?: boolean; data?: VideoStatus } | VideoStatus
        // Handle both new format { success: true, data: {...} } and old format
        const status = (response as any).data || response as VideoStatus
        console.log(`📊 Video status received:`, status)
        
        // Validate status object
        if (!status || typeof status.status !== 'string') {
          console.error("❌ Invalid status response:", status)
          return // Continue polling, maybe next time will be valid
        }
        
        // Use functional update to avoid stale closure
        setVideoStatus(prevStatus => {
          console.log(`Previous status:`, prevStatus, `New status:`, status)
          return status
        })

        if (status.status === 'completed') {
          console.log("✅ Video generation completed!")
          clearInterval(intervalId)
          setPollingInterval(null)
          await saveCompletedVideoToStepData(status)
          
          // Invalidate queries to refresh UI
          await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
        } else if (status.status === 'failed') {
          console.error("❌ Video generation failed:", status.error_message)
          clearInterval(intervalId)
          setPollingInterval(null)
        } else {
          console.log(`⏳ Video still processing... status: ${status.status}`)
        }
      } catch (err: any) {
        console.error("❌ Error checking video status:", err)
        // Don't stop polling on network errors, but log them
        // Only stop if we get a definitive error response
        if (err.status === 404 || err.status === 400) {
          console.error("❌ Video not found or invalid, stopping polling")
          clearInterval(intervalId)
          setPollingInterval(null)
          setVideoStatus(prevStatus => ({
            ...prevStatus,
            status: 'failed',
            error_message: err.message || 'Video generation failed. Please try again.'
          }))
        }
      }
    }, POLL_INTERVAL)

    setPollingInterval(intervalId)

    // Check status immediately (before first interval)
    try {
      console.log(`🔍 Checking initial video status for: ${videoId}`)
      const res = await apiRequest("GET", `/api/heygen/status/${videoId}`)
      const response = await res.json() as { success?: boolean; data?: VideoStatus } | VideoStatus
      // Handle both new format { success: true, data: {...} } and old format
      const status = (response as any).data || response as VideoStatus
      console.log(`📊 Initial video status:`, status)
      
      setVideoStatus(status)

      if (status.status === 'completed') {
        console.log("✅ Video already completed!")
        clearInterval(intervalId)
        setPollingInterval(null)
        await saveCompletedVideoToStepData(status)
        await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      } else if (status.status === 'failed') {
        console.error("❌ Video generation failed:", status.error_message)
        clearInterval(intervalId)
        setPollingInterval(null)
      }
    } catch (err) {
      console.error("❌ Error checking initial video status:", err)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [pollingInterval])

  // Restore polling on mount if there's an unfinished video
  useEffect(() => {
    const savedVideoId = step5Data?.videoId
    const savedStatus = step5Data?.status
    const savedVideoUrl = step5Data?.videoUrl
    const savedAvatar = step5Data?.selectedAvatar
    
    console.log("DEBUG: step5Data =", step5Data)
    console.log("DEBUG: savedVideoUrl =", savedVideoUrl)
    console.log("DEBUG: savedStatus =", savedStatus)

    // If we have a videoId but no completed video, resume polling
    if (savedVideoId && (!savedVideoUrl || savedStatus === 'generating')) {
      console.log("Resuming video generation polling for:", savedVideoId)
      setGeneratedVideoId(savedVideoId)
      setVideoStatus({ status: 'pending' })
      
      // Restore avatar selection from saved data
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar)
      }
      
      pollVideoStatus(savedVideoId)
    } else if (savedVideoUrl && savedStatus === 'completed') {
      // If video is already completed, show it
      console.log("Loading completed video from saved data")
      setGeneratedVideoId(savedVideoId)
      
      // Restore avatar selection
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar)
      }
      
      setVideoStatus({
        status: 'completed',
        video_url: savedVideoUrl,
        thumbnail_url: step5Data?.thumbnailUrl,
        duration: step5Data?.duration
      })
    }
  }, [step5Data]) // Re-run when step5Data changes

  // Group avatars by category
  const { myAvatars, publicAvatars } = useMemo(() => {
    const all = avatars || []
    const my = all.filter((avatar: HeyGenAvatar) => !avatar.is_public)
    const pub = all.filter((avatar: HeyGenAvatar) => avatar.is_public)
    return { myAvatars: my, publicAvatars: pub }
  }, [avatars])

  // Apply search filter
  const filteredMyAvatars = myAvatars.filter((avatar: HeyGenAvatar) =>
    avatar.avatar_name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const filteredPublicAvatars = publicAvatars.filter((avatar: HeyGenAvatar) =>
    avatar.avatar_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate pagination
  const myAvatarsTotalPages = Math.ceil(filteredMyAvatars.length / AVATARS_PER_PAGE)
  const publicAvatarsTotalPages = Math.ceil(filteredPublicAvatars.length / AVATARS_PER_PAGE)
  
  // Get current page items - only load images for visible avatars
  const currentMyAvatars = filteredMyAvatars.slice(
    myAvatarsPage * AVATARS_PER_PAGE,
    (myAvatarsPage + 1) * AVATARS_PER_PAGE
  )
  
  const currentPublicAvatars = filteredPublicAvatars.slice(
    publicAvatarsPage * AVATARS_PER_PAGE,
    (publicAvatarsPage + 1) * AVATARS_PER_PAGE
  )

  // Combine visible avatars from both tabs for image loading
  const visibleAvatars = useMemo(() => {
    return [...currentMyAvatars, ...currentPublicAvatars]
  }, [currentMyAvatars, currentPublicAvatars])

  // Prepare image URLs for the hook - ONLY for visible avatars on current pages
  const imageUrlsForHook = useMemo(() => {
    if (!avatars) return []
    return visibleAvatars.map(avatar => ({
      id: avatar.avatar_id,
      url: avatar.preview_image_url
    }))
  }, [avatars, visibleAvatars])

  // Use avatar images hook for proxy loading and tracking
  // Limit to actual visible avatars (max 18)
  const {
    getProxiedUrl,
    isImageFailed,
    markLoaded,
    markError,
    allImagesLoaded,
    loadingProgress
  } = useAvatarImages(imageUrlsForHook, { preloadCount: Math.min(imageUrlsForHook.length, 18) })

  // Reset pages when search changes
  useEffect(() => {
    setMyAvatarsPage(0)
    setPublicAvatarsPage(0)
  }, [searchTerm])

  const handlePreview = (avatarId: string, previewUrl?: string) => {
    if (!previewUrl) return

    // Toggle preview
    if (previewingAvatar === avatarId) {
      setPreviewingAvatar(null)
      setPreviewVideoUrl(null)
    } else {
      // Set new preview
      setPreviewingAvatar(avatarId)
      setPreviewVideoUrl(previewUrl)
    }
  }

  const handleCreateVideo = async () => {
    // Validate required data before generation
    if (!selectedAvatar) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пожалуйста, выберите аватар для создания видео"
      })
      return
    }
    
    if (!script) {
      toast({
        variant: "destructive", 
        title: "Ошибка",
        description: "Скрипт не найден. Пожалуйста, завершите предыдущие этапы"
      })
      return
    }
    
    if (!audioUrl && !voiceId) {
      toast({
        variant: "destructive",
        title: "Ошибка", 
        description: "Аудио или голос не найдены. Пожалуйста, завершите этап 4"
      })
      return
    }
    
    generateVideoMutation.mutate()
  }

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/steps/5/skip`, {
        reason: "custom_video"
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      
      toast({
        title: "Этап пропущен",
        description: "Переходим к следующему этапу...",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось пропустить этап",
      })
    }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-chart-4" />
          <h1 className="text-3xl font-bold">Avatar Selection</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Choose an avatar to present your video
        </p>
      </div>

      {/* Skip Step Alert - Always show */}
      <Alert className="mb-6" data-testid="alert-skip-stage5">
        <FastForward className="h-4 w-4" />
        <div className="flex-1">
          <h5 className="font-semibold mb-1">Пропустить видео?</h5>
          <AlertDescription className="mb-3">
            Если у вас уже есть своё видео, вы можете пропустить этот этап
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => skipStepMutation.mutate()}
            disabled={skipStepMutation.isPending}
            data-testid="button-skip-stage5"
          >
            <FastForward className="h-4 w-4 mr-2" />
            {skipStepMutation.isPending ? "Пропускаем..." : "Пропустить - у меня своё видео"}
          </Button>
        </div>
      </Alert>

      <div className="space-y-6">
        {/* Search and Refresh */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search avatars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-avatars"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  // Reset to first page and clear accumulated avatars
                  setServerPage(0)
                  setAllLoadedAvatars([])
                  setHasMorePages(true)
                  queryClient.invalidateQueries({ queryKey: ["/api/heygen/avatars"] })
                  refetchAvatars()
                  toast({
                    title: "Обновление списка аватаров",
                    description: "Загружаем актуальный список с HeyGen...",
                  })
                }}
                disabled={isLoading}
                data-testid="button-refresh-avatars"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video Generation Progress */}
        {videoStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Video Generation</CardTitle>
            </CardHeader>
            <CardContent>
              {videoStatus.status === 'pending' || videoStatus.status === 'processing' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm">
                      {videoStatus.status === 'pending' ? 'Initializing video generation...' : 'HeyGen is generating your video...'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Video generation typically takes 2-5 minutes. Status is checked every 30 seconds.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    You can safely leave this page - progress will be saved automatically.
                  </p>
                </div>
              ) : videoStatus.status === 'completed' ? (
                <div className="space-y-3">
                  <Alert className="border-primary">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      Video generation complete! Duration: {videoStatus.duration?.toFixed(1)}s
                    </AlertDescription>
                  </Alert>
                  {videoStatus.video_url && (
                    <div className="space-y-3">
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        {/* Loading overlay */}
                        {isVideoLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">Loading video...</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Error state */}
                        {hasVideoError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                            <div className="flex flex-col items-center gap-2 text-center p-4">
                              <AlertCircle className="h-8 w-8 text-destructive" />
                              <span className="text-sm text-destructive">{videoErrorMessage || 'Failed to load video'}</span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.location.reload()}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Video player */}
                        {proxiedVideoUrl && (
                          <video
                            src={proxiedVideoUrl}
                            controls
                            preload="metadata"
                            className="w-full h-full"
                            onLoadedData={onVideoLoaded}
                            onError={() => onVideoError('Video playback error')}
                            data-testid="video-generated"
                          />
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadVideo(`heygen-video-${generatedVideoId || 'export'}.mp4`)}
                          disabled={!isVideoLoaded}
                          data-testid="button-download-video"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Video
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2 ml-auto"
                          onClick={() => continueToStage6Mutation.mutate()}
                          disabled={continueToStage6Mutation.isPending || !isVideoLoaded}
                          data-testid="button-continue-stage6"
                        >
                          Continue to Final Export
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : videoStatus.status === 'failed' ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {videoStatus.error_message || 'Video generation failed. Please try again.'}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Preview Video */}
        {previewVideoUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Avatar Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  key={previewVideoUrl}
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  onEnded={() => {
                    setPreviewingAvatar(null)
                    setPreviewVideoUrl(null)
                  }}
                  data-testid="video-avatar-preview"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avatars Grid */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Loading avatars...</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="aspect-video w-full mb-3 animate-pulse" />
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-avatars">
              {(error as any)?.message || "Failed to load avatars. Please check your HeyGen API key in Settings."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* My Avatars */}
            {filteredMyAvatars.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">All Avatars</h3>
                  <Badge variant="secondary">{filteredMyAvatars.length}</Badge>
                  {!allImagesLoaded && currentMyAvatars.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading images {loadingProgress.loaded}/{loadingProgress.total}
                    </span>
                  )}
                </div>
                
                {/* Pagination controls */}
                {myAvatarsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyAvatarsPage(p => Math.max(0, p - 1))}
                      disabled={myAvatarsPage === 0}
                      className="gap-1"
                      data-testid="button-my-avatars-prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {myAvatarsPage + 1} of {myAvatarsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyAvatarsPage(p => Math.min(myAvatarsTotalPages - 1, p + 1))}
                      disabled={myAvatarsPage >= myAvatarsTotalPages - 1}
                      className="gap-1"
                      data-testid="button-my-avatars-next"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {currentMyAvatars.map((avatar: HeyGenAvatar) => {
                    const proxiedUrl = getProxiedUrl(avatar.avatar_id)
                    const isFailed = isImageFailed(avatar.avatar_id)
                    const imageState = loadingProgress.loaded === loadingProgress.total ? 'loaded' : 'loading'
                    
                    return (
                      <Card
                        key={avatar.avatar_id}
                        className={`cursor-pointer transition-all hover-elevate ${
                          selectedAvatar === avatar.avatar_id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleAvatarSelect(avatar.avatar_id)}
                        data-testid={`card-avatar-${avatar.avatar_id}`}
                      >
                        <CardHeader>
                          {proxiedUrl && !isFailed ? (
                            <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                              <img
                                src={proxiedUrl}
                                alt={avatar.avatar_name}
                                className="w-full h-full object-contain"
                                loading="eager"
                                onLoad={() => markLoaded(avatar.avatar_id)}
                                onError={() => markError(avatar.avatar_id)}
                              />
                              {imageState === 'loading' && (
                                <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                              {isFailed ? (
                                <ImageOff className="h-12 w-12 text-muted-foreground" />
                              ) : (
                                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{avatar.avatar_name}</CardTitle>
                            {selectedAvatar === avatar.avatar_id && (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary">
                              {avatar.gender || "Unknown"}
                            </Badge>
                            {avatar.preview_video_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePreview(avatar.avatar_id, avatar.preview_video_url)
                                }}
                                data-testid={`button-preview-${avatar.avatar_id}`}
                              >
                                {previewingAvatar === avatar.avatar_id ? (
                                  <>
                                    <Pause className="h-3 w-3 mr-1" />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Preview
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Public Avatars */}
            {filteredPublicAvatars.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-chart-4" />
                  <h3 className="text-lg font-semibold">Public Avatars</h3>
                  <Badge variant="secondary">{filteredPublicAvatars.length}</Badge>
                  {!allImagesLoaded && currentPublicAvatars.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading images {loadingProgress.loaded}/{loadingProgress.total}
                    </span>
                  )}
                </div>
                
                {/* Pagination controls */}
                {publicAvatarsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPublicAvatarsPage(p => Math.max(0, p - 1))}
                      disabled={publicAvatarsPage === 0}
                      className="gap-1"
                      data-testid="button-public-avatars-prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {publicAvatarsPage + 1} of {publicAvatarsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPublicAvatarsPage(p => Math.min(publicAvatarsTotalPages - 1, p + 1))}
                      disabled={publicAvatarsPage >= publicAvatarsTotalPages - 1}
                      className="gap-1"
                      data-testid="button-public-avatars-next"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {currentPublicAvatars.map((avatar: HeyGenAvatar) => {
                    const proxiedUrl = getProxiedUrl(avatar.avatar_id)
                    const isFailed = isImageFailed(avatar.avatar_id)
                    const imageState = loadingProgress.loaded === loadingProgress.total ? 'loaded' : 'loading'
                    
                    return (
                      <Card
                        key={avatar.avatar_id}
                        className={`cursor-pointer transition-all hover-elevate ${
                          selectedAvatar === avatar.avatar_id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleAvatarSelect(avatar.avatar_id)}
                        data-testid={`card-avatar-${avatar.avatar_id}`}
                      >
                        <CardHeader>
                          {proxiedUrl && !isFailed ? (
                            <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                              <img
                                src={proxiedUrl}
                                alt={avatar.avatar_name}
                                className="w-full h-full object-contain"
                                loading="eager"
                                onLoad={() => markLoaded(avatar.avatar_id)}
                                onError={() => markError(avatar.avatar_id)}
                              />
                              {imageState === 'loading' && (
                                <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                              {isFailed ? (
                                <ImageOff className="h-12 w-12 text-muted-foreground" />
                              ) : (
                                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{avatar.avatar_name}</CardTitle>
                            {selectedAvatar === avatar.avatar_id && (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary">
                              {avatar.gender || "Unknown"}
                            </Badge>
                            {avatar.preview_video_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePreview(avatar.avatar_id, avatar.preview_video_url)
                                }}
                                data-testid={`button-preview-${avatar.avatar_id}`}
                              >
                                {previewingAvatar === avatar.avatar_id ? (
                                  <>
                                    <Pause className="h-3 w-3 mr-1" />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Preview
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Load More Button */}
            {hasMorePages && avatars && avatars.length > 0 && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setServerPage(prev => prev + 1)}
                  disabled={isLoading}
                  className="gap-2"
                  data-testid="button-load-more-avatars"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      Загрузить еще 30 аватаров {avatarsResponse && (`осталось ${avatarsResponse?.pagination.total - filteredMyAvatars.length}`)})
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* No Results */}
            {filteredMyAvatars.length === 0 && filteredPublicAvatars.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No avatars found</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            {!script ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No script found. Please complete previous stages first.
                </AlertDescription>
              </Alert>
            ) : !audioUrl && !voiceId ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No audio or voice found. Please generate or upload audio in Stage 4 first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {!selectedAvatar && (
                  <p className="text-sm text-muted-foreground text-center">
                    Select an avatar above to create your video
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleCreateVideo}
                  disabled={!selectedAvatar || generateVideoMutation.isPending}
                  data-testid="button-create-video"
                >
                  {generateVideoMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Creating Video...
                    </>
                  ) : (
                    <>
                      <Users className="h-5 w-5" />
                      Create Video with Selected Avatar
                    </>
                  )}
                </Button>
                {selectedAvatar && (
                  <p className="text-xs text-muted-foreground text-center">
                    Using {audioUrl ? "uploaded audio" : "voice generation"} • Avatar will be saved automatically
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
