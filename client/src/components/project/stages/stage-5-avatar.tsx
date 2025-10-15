import { useState, useEffect } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Users, Search, CheckCircle2, Play, Pause, AlertCircle } from "lucide-react"

interface Stage5Props {
  project: Project
  stepData: any
}

interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  gender?: string
  preview_image_url?: string
  preview_video_url?: string
}

interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error_message?: string
}

export function Stage5AvatarSelection({ project, stepData }: Stage5Props) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [previewingAvatar, setPreviewingAvatar] = useState<string | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Get script from Stage 4 data (or Stage 3 if no Stage 4)
  const script = stepData[4]?.finalScript || stepData[3]?.selectedVariant || stepData[3]?.analyzedScript || ""
  const voiceId = stepData[4]?.selectedVoice

  // Fetch avatars from HeyGen
  const { data: avatars, isLoading, error } = useQuery<HeyGenAvatar[]>({
    queryKey: ["/api/heygen/avatars"],
    enabled: !!script, // Only fetch if we have a script
  })

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAvatar || !script) return null
      
      const response = await apiRequest(
        "POST",
        "/api/heygen/generate",
        { avatarId: selectedAvatar, script, voiceId }
      ) as { videoId: string }
      return response
    },
    onSuccess: (data) => {
      console.log("Video generation started:", data)
      if (data?.videoId) {
        setGeneratedVideoId(data.videoId)
        setVideoStatus({ status: 'pending' })
        pollVideoStatus(data.videoId)
      }
    },
    onError: (error: any) => {
      console.error("Video generation failed:", error)
      setVideoStatus({ status: 'failed', error_message: error.message })
    }
  })

  const pollVideoStatus = async (videoId: string) => {
    // Start polling with a local interval reference
    const intervalId = setInterval(async () => {
      try {
        const status = await apiRequest("GET", `/api/heygen/status/${videoId}`) as VideoStatus
        setVideoStatus(status)

        if (status.status === 'completed') {
          clearInterval(intervalId)
          setPollingInterval(null)
          console.log("Video completed:", status.video_url)
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
      const status = await apiRequest("GET", `/api/heygen/status/${videoId}`) as VideoStatus
      setVideoStatus(status)

      if (status.status === 'completed' || status.status === 'failed') {
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

  const filteredAvatars = avatars?.filter(avatar =>
    avatar.avatar_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

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
                    <div className="space-y-2">
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        <video
                          src={videoStatus.video_url}
                          controls
                          className="w-full h-full"
                          data-testid="video-generated"
                        />
                      </div>
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
        ) : filteredAvatars.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAvatars.slice(0, 9).map(avatar => (
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
        ) : (
          <p className="text-center text-muted-foreground py-8">No avatars found</p>
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
