import { useState } from "react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Newspaper, FileText, Instagram, Youtube, Mic, Lock, Play, MessageSquare, Eye, Heart, MessageCircle, Loader2 } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import { useAuth } from "@/hooks/useAuth"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

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
    description: "Choose from transcribed Instagram Reels with AI virality analysis",
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
        currentStage: 1,
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

  const handleSourceSelect = (sourceId: string, available: boolean) => {
    if (!available) {
      toast({
        title: "Coming Soon",
        description: "This source type is not available yet.",
      })
      return
    }
    
    // For Instagram, show picker instead of creating project immediately
    if (sourceId === "instagram") {
      setShowInstagramPicker(true)
      return
    }
    
    setSelectedSource(sourceId)
    createProjectMutation.mutate(sourceId)
  }

  const handleInstagramReelSelect = async (itemId: string) => {
    setSelectedSource("instagram")
    // Create project from Instagram Reel
    try {
      const response = await apiRequest("POST", `/api/projects/from-instagram/${itemId}`)
      const data = await response.json()
      
      // Update cache
      queryClient.setQueryData(["/api/projects"], (oldProjects: any[] | undefined) => {
        return [...(oldProjects || []), data]
      })
      
      setShowInstagramPicker(false)
      setLocation(`/project/${data.id}`)
    } catch (error: any) {
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
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      })
    }
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

      {/* Instagram Reels Picker Dialog */}
      <InstagramReelsPicker
        open={showInstagramPicker}
        onOpenChange={setShowInstagramPicker}
        onSelectReel={handleInstagramReelSelect}
      />
    </div>
  )
}

function InstagramReelsPicker({ 
  open, 
  onOpenChange, 
  onSelectReel 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectReel: (itemId: string) => void
}) {
  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["/api/instagram/items"],
    enabled: open,
  })

  // Filter to show only transcribed, non-used Reels
  const availableReels = items?.filter(item => 
    item.transcriptionStatus === 'completed' && 
    !item.usedInProject &&
    !item.dismissed
  ) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Instagram Reel</DialogTitle>
          <DialogDescription>
            Choose a transcribed Reel to use as your video content source
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && availableReels.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Reels Available</p>
              <p className="text-sm">
                Add Instagram sources and parse them to see transcribed Reels here
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {availableReels.map((item: any) => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover-elevate active-elevate-2"
                onClick={() => onSelectReel(item.id)}
                data-testid={`card-instagram-reel-${item.id}`}
              >
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-24 h-32 bg-muted rounded-md overflow-hidden">
                    {item.thumbnailUrl && (
                      <img 
                        src={item.thumbnailUrl} 
                        alt="Reel thumbnail" 
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                    {item.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {Math.floor(item.duration)}s
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">@{item.ownerUsername}</span>
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Transcribed
                          </Badge>
                        </div>
                        {item.caption && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.caption}
                          </p>
                        )}
                      </div>
                      
                      {/* AI Score */}
                      {typeof item.aiScore === 'number' && (
                        <Badge 
                          variant="secondary"
                          className={`
                            ${item.aiScore >= 70 ? 'bg-green-500/20 text-green-700 dark:text-green-400' : ''}
                            ${item.aiScore >= 50 && item.aiScore < 70 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : ''}
                            ${item.aiScore < 50 ? 'bg-red-500/20 text-red-700 dark:text-red-400' : ''}
                          `}
                        >
                          {item.aiScore}
                        </Badge>
                      )}
                    </div>

                    {/* Engagement stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {item.viewCount && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {item.viewCount >= 1000000 
                            ? `${(item.viewCount / 1000000).toFixed(1)}M`
                            : item.viewCount >= 1000 
                              ? `${(item.viewCount / 1000).toFixed(1)}K`
                              : item.viewCount
                          }
                        </span>
                      )}
                      {item.likeCount && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {item.likeCount >= 1000 ? `${(item.likeCount / 1000).toFixed(1)}K` : item.likeCount}
                        </span>
                      )}
                      {item.commentCount && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {item.commentCount >= 1000 ? `${(item.commentCount / 1000).toFixed(1)}K` : item.commentCount}
                        </span>
                      )}
                    </div>

                    {/* AI Comment */}
                    {item.aiComment && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs italic border-l-2 border-primary/50">
                        {item.aiComment}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
