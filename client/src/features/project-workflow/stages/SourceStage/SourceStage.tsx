import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Newspaper, FileText, Instagram, Play, MessageSquare, Eye, Heart, MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { useToast } from "@/shared/hooks"
import { isUnauthorizedError } from "@/shared/utils/auth-utils"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog"
import { Badge } from "@/shared/ui/badge"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { useStageData } from "../../hooks/useStageData"

export function Stage1SourceSelection() {
  const { project } = useStageData()
  const { toast } = useToast()
  const [showInstagramPicker, setShowInstagramPicker] = useState(false)

  const selectSourceMutation = useMutation({
    mutationFn: async ({ choice, instagramItemId }: { choice: "news" | "custom" | "instagram"; instagramItemId?: string }) => {
      // Custom Script → сразу на этап 3 (пропускаем этап 2)
      const targetStage = choice === "custom" ? 3 : 2
      
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: targetStage,
        sourceType: choice,
      })
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 1,
        data: { 
          sourceChoice: choice,
          ...(instagramItemId && { instagramItemId })
        },
        completedAt: new Date().toISOString(),
      })
      
      // Если Custom, также создаем пустой step 2 (пропущенный)
      if (choice === "custom") {
        await apiRequest("POST", `/api/projects/${project.id}/steps`, {
          stepNumber: 2,
          data: { 
            skipped: true,
            skipReason: "Custom script - content input skipped"
          },
          completedAt: new Date().toISOString(),
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      setShowInstagramPicker(false)
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Content Source</h1>
        <p className="text-lg text-muted-foreground">
          Select how you want to provide content for your video
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all"
          onClick={() => selectSourceMutation.mutate({ choice: "news" })}
          data-testid="card-source-news"
        >
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
              <Newspaper className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>News Articles</CardTitle>
            <CardDescription>
              Browse your RSS feeds and select articles with AI virality scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              disabled={selectSourceMutation.isPending}
              onClick={(e) => {
                e.stopPropagation()
                selectSourceMutation.mutate({ choice: "news" })
              }}
              data-testid="button-select-news"
            >
              {selectSourceMutation.isPending ? "Selecting..." : "Select News"}
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all"
          onClick={() => selectSourceMutation.mutate({ choice: "custom" })}
          data-testid="card-source-custom"
        >
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10 mb-4">
              <FileText className="h-6 w-6 text-chart-2" />
            </div>
            <CardTitle>Custom Script</CardTitle>
            <CardDescription>
              Enter your own text or script content to transform into video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              disabled={selectSourceMutation.isPending}
              onClick={(e) => {
                e.stopPropagation()
                selectSourceMutation.mutate({ choice: "custom" })
              }}
              data-testid="button-select-custom"
            >
              {selectSourceMutation.isPending ? "Selecting..." : "Enter Script"}
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all"
          onClick={() => setShowInstagramPicker(true)}
          data-testid="card-source-instagram"
        >
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10 mb-4">
              <Instagram className="h-6 w-6 text-chart-3" />
            </div>
            <CardTitle>Instagram Reels</CardTitle>
            <CardDescription>
              Choose from transcribed Instagram Reels with AI virality analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              disabled={selectSourceMutation.isPending}
              onClick={(e) => {
                e.stopPropagation()
                setShowInstagramPicker(true)
              }}
              data-testid="button-select-instagram"
            >
              Browse Reels
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instagram Reels Picker Dialog */}
      <InstagramReelsPicker 
        open={showInstagramPicker} 
        onOpenChange={setShowInstagramPicker}
        onSelectReel={(itemId, reelData) => {
          selectSourceMutation.mutate({ choice: "instagram", instagramItemId: itemId })
        }}
        projectId={project.id}
      />
    </div>
  )
}

interface InstagramReelsPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectReel: (itemId: string, reelData: any) => void
  projectId: string
}

function InstagramReelsPicker({ open, onOpenChange, onSelectReel, projectId }: InstagramReelsPickerProps) {
  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["/api/instagram/items"],
    enabled: open,
  })

  // Filter to show only transcribed, non-used Reels with good scores
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
                onClick={() => onSelectReel(item.id, item)}
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
