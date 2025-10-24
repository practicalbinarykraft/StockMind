import { useState } from "react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Newspaper, FileText, Instagram, Youtube, Mic, Lock, Play, RefreshCw } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import { useAuth } from "@/hooks/useAuth"
import { ScoreBadge } from "@/components/score-badge"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

const SOURCE_TYPES = [
  {
    id: "news",
    title: "News Articles",
    description: "Parse and analyze RSS news feeds with AI scoring",
    icon: Newspaper,
    color: "text-primary",
    bgColor: "bg-primary/10",
    available: true,
  },
  {
    id: "custom",
    title: "Custom Script",
    description: "Enter your own script or text content",
    icon: FileText,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    available: true,
  },
  {
    id: "instagram",
    title: "Instagram Reels",
    description: "Choose from transcribed Instagram Reels",
    icon: Instagram,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    available: true,
  },
  {
    id: "youtube",
    title: "YouTube",
    description: "Extract content from YouTube videos",
    icon: Youtube,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
    available: false,
  },
  {
    id: "audio",
    title: "Audio File",
    description: "Upload and transcribe audio content",
    icon: Mic,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    available: false,
  },
]

export default function NewProject() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [showInstagramPicker, setShowInstagramPicker] = useState(false)

  // Fetch Instagram Reels for picker
  const { data: instagramReels, isLoading: reelsLoading } = useQuery<any[]>({
    queryKey: ["/api/instagram/items"],
    enabled: showInstagramPicker,
  })

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "Redirecting to login...",
      variant: "destructive",
    })
    setTimeout(() => {
      window.location.href = "/api/login"
    }, 500)
    return null
  }

  const createProjectMutation = useMutation({
    mutationFn: async (sourceType: string) => {
      const response = await apiRequest("POST", "/api/projects", {
        sourceType,
        currentStage: 2,  // Skip Stage 1 (source selection already done)
      })
      const data = await response.json()
      return data
    },
    onSuccess: (data: any) => {
      console.log("Project created with ID:", data.id)
      
      // Update cache directly with new project (works even when query is not active)
      queryClient.setQueryData(["/api/projects"], (oldProjects: any[] | undefined) => {
        return [...(oldProjects || []), data]
      })
      
      console.log("✅ Projects cache updated with new project, redirecting...")
      setLocation(`/project/${data.id}`)
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Create project from Instagram Reel
  const createInstagramProjectMutation = useMutation({
    mutationFn: async (reelId: string) => {
      const response = await apiRequest("POST", `/api/projects/from-instagram/${reelId}`, {})
      const data = await response.json()
      return data
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/projects"], (oldProjects: any[] | undefined) => {
        return [...(oldProjects || []), data]
      })
      setShowInstagramPicker(false)
      setLocation(`/project/${data.id}`)
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSourceSelect = (sourceId: string, available: boolean) => {
    if (!available) {
      const descriptions: Record<string, string> = {
        youtube: "YouTube integration coming soon.",
        audio: "Audio file integration coming soon.",
      }
      toast({
        title: "Not Available",
        description: descriptions[sourceId] || "This source type is not available yet.",
      })
      return
    }
    
    // Special handling for Instagram - show picker dialog
    if (sourceId === "instagram") {
      setShowInstagramPicker(true)
      return
    }
    
    setSelectedSource(sourceId)
    createProjectMutation.mutate(sourceId)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-xl font-semibold">New Project</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Choose Your Content Source</h2>
          <p className="text-lg text-muted-foreground">
            Select where your video content will come from
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCE_TYPES.map((source) => {
            const Icon = source.icon
            const isSelected = selectedSource === source.id

            return (
              <Card
                key={source.id}
                className={`relative cursor-pointer transition-all hover-elevate ${
                  isSelected ? "ring-2 ring-primary" : ""
                } ${!source.available ? "opacity-60" : ""}`}
                onClick={() => handleSourceSelect(source.id, source.available)}
                data-testid={`card-source-${source.id}`}
              >
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${source.bgColor} mb-4`}>
                    <Icon className={`h-6 w-6 ${source.color}`} />
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    {source.title}
                    {!source.available && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>{source.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!source.available && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Coming soon
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {createProjectMutation.isPending && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Creating project...</span>
            </div>
          </div>
        )}
      </div>

      {/* Instagram Reel Picker Dialog */}
      <Dialog open={showInstagramPicker} onOpenChange={setShowInstagramPicker}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Instagram Reel</DialogTitle>
            <DialogDescription>
              Select a transcribed Reel to create your project
            </DialogDescription>
          </DialogHeader>

          {reelsLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!reelsLoading && (!instagramReels || instagramReels.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No Instagram Reels available</p>
              <p className="text-sm mt-2">Add Instagram accounts in Settings to scrape Reels</p>
            </div>
          )}

          {!reelsLoading && instagramReels && instagramReels.length > 0 && (
            <div className="grid gap-4">
              {instagramReels
                .filter(reel => reel.transcriptionStatus === 'completed' && !reel.action)
                .map((reel) => (
                <Card
                  key={reel.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => createInstagramProjectMutation.mutate(reel.id)}
                  data-testid={`card-reel-${reel.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0 w-24 h-32 bg-muted rounded overflow-hidden">
                        {reel.thumbnailUrl && (
                          <>
                            <img 
                              src={reel.thumbnailUrl} 
                              alt="Reel thumbnail" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">@{reel.ownerUsername}</h3>
                        {reel.caption && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {reel.caption}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {typeof reel.aiScore === 'number' && (
                            <ScoreBadge score={reel.aiScore} />
                          )}
                          {reel.publishedAt && (
                            <Badge variant="outline" className="text-xs">
                              {formatDistanceToNow(new Date(reel.publishedAt), { addSuffix: true, locale: ru })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {createInstagramProjectMutation.isPending && (
            <div className="flex items-center justify-center gap-3 py-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Creating project...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
