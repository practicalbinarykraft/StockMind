import { useState, useEffect, useMemo } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Users, Search, CheckCircle2, Play, Pause, AlertCircle, User, Globe, ArrowRight } from "lucide-react"

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

interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error_message?: string
}

export function Stage5AvatarSelection({ project, stepData, step5Data }: Stage5Props) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [previewingAvatar, setPreviewingAvatar] = useState<string | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Get script and voice from Stage 4 data
  const script = stepData?.finalScript || ""
  const voiceId = stepData?.selectedVoice
  const audioUrl = stepData?.audioUrl  // Keep relative path for backend

  // Debug logs
  console.log("Stage 5 received stepData (step 4):", stepData)
  console.log("Stage 5 received step5Data (step 5):", step5Data)
  console.log("Script extracted:", script)

  // Fetch avatars from HeyGen
  const { data: avatars, isLoading, error } = useQuery<HeyGenAvatar[]>({
    queryKey: ["/api/heygen/avatars"],
    enabled: !!script, // Only fetch if we have a script
  })

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
      return await apiRequest("PUT", `/api/projects/${project.id}`, {
        currentStage: 6
      })
    },
    onSuccess: () => {
      // Dual invalidation to ensure UI refresh
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
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
    // Start polling with a local interval reference
    const intervalId = setInterval(async () => {
      try {
        const res = await apiRequest("GET", `/api/heygen/status/${videoId}`)
        const status = await res.json() as VideoStatus
        setVideoStatus(status)

        if (status.status === 'completed') {
          clearInterval(intervalId)
          setPollingInterval(null)
          console.log("Video completed:", status.video_url)
          await saveCompletedVideoToStepData(status)
        } else if (status.status === 'failed') {
          clearInterval(intervalId)
          setPollingInterval(null)
        }
      } catch (err) {
        console.error("Error checking video status:", err)
        clearInterval(intervalId)
        setPollingInterval(null)
      }
    }, 3000)

    setPollingInterval(intervalId)

    // Check status immediately (before first interval)
    try {
      const res = await apiRequest("GET", `/api/heygen/status/${videoId}`)
      const status = await res.json() as VideoStatus
      setVideoStatus(status)

      if (status.status === 'completed') {
        clearInterval(intervalId)
        setPollingInterval(null)
        await saveCompletedVideoToStepData(status)
      } else if (status.status === 'failed') {
        clearInterval(intervalId)
        setPollingInterval(null)
      }
    } catch (err) {
      console.error("Error checking initial video status:", err)
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
    const my = all.filter(avatar => !avatar.is_public)
    const pub = all.filter(avatar => avatar.is_public)
    return { myAvatars: my, publicAvatars: pub }
  }, [avatars])

  // Apply search filter
  const filteredMyAvatars = myAvatars.filter(avatar =>
    avatar.avatar_name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const filteredPublicAvatars = publicAvatars.filter(avatar =>
    avatar.avatar_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
    generateVideoMutation.mutate()
  }

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

      <div className="space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search avatars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-avatars"
              />
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
                      {videoStatus.status === 'pending' ? 'Initializing...' : 'Generating video...'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This may take 1-2 minutes. Please wait...
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
                        <video
                          src={videoStatus.video_url}
                          controls
                          className="w-full h-full"
                          data-testid="video-generated"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (videoStatus.video_url) {
                              window.open(videoStatus.video_url, '_blank')
                            }
                          }}
                          data-testid="button-download-video"
                        >
                          Download Video
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2 ml-auto"
                          onClick={() => continueToStage6Mutation.mutate()}
                          disabled={continueToStage6Mutation.isPending}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="aspect-video w-full mb-3" />
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-20" />
                </CardContent>
              </Card>
            ))}
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
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">My Avatars</h3>
                  <Badge variant="secondary">{filteredMyAvatars.length}</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMyAvatars.slice(0, 9).map(avatar => (
                    <Card
                      key={avatar.avatar_id}
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedAvatar === avatar.avatar_id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedAvatar(avatar.avatar_id)}
                      data-testid={`card-avatar-${avatar.avatar_id}`}
                    >
                      <CardHeader>
                        {avatar.preview_image_url ? (
                          <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                            <img
                              src={avatar.preview_image_url}
                              alt={avatar.avatar_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                            <Users className="h-16 w-16 text-muted-foreground" />
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
                  ))}
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPublicAvatars.slice(0, 9).map(avatar => (
                    <Card
                      key={avatar.avatar_id}
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedAvatar === avatar.avatar_id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedAvatar(avatar.avatar_id)}
                      data-testid={`card-avatar-${avatar.avatar_id}`}
                    >
                      <CardHeader>
                        {avatar.preview_image_url ? (
                          <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                            <img
                              src={avatar.preview_image_url}
                              alt={avatar.avatar_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                            <Users className="h-16 w-16 text-muted-foreground" />
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
                  ))}
                </div>
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
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
