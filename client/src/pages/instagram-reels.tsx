import { useState } from "react"
import { useLocation } from "wouter"
import { Card, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { useToast } from "@/hooks/use-toast"
import type { InstagramItem, InstagramSource } from "@shared/schema"
import { ScoreBadge } from "@/shared/components/score-badge"
import { Skeleton } from "@/shared/ui/skeleton"
import { Input } from "@/shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { 
  ThumbsDown, 
  Check, 
  Instagram, 
  Heart, 
  MessageCircle, 
  Eye, 
  Play,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  ArrowLeft,
  MessageSquare,
  CircleDashed,
  Sparkles,
  Clapperboard
} from "lucide-react"
import { Checkbox } from "@/shared/ui/checkbox"

export default function InstagramReelsPage() {
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  // Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [hideDismissed, setHideDismissed] = useState(true)
  const [hideUsed, setHideUsed] = useState(true)
  const [minScore, setMinScore] = useState<number>(0)
  const [selectedSource, setSelectedSource] = useState<string>("all")
  const [downloadStatusFilter, setDownloadStatusFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  // Fetch Instagram sources for filter
  const { data: instagramSources } = useQuery<InstagramSource[]>({
    queryKey: ["/api/instagram/sources"],
  })

  // Fetch Instagram items
  const { data: instagramItems, isLoading: itemsLoading } = useQuery<InstagramItem[]>({
    queryKey: ["/api/instagram/items"],
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds to update download status
  })

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("PATCH", `/api/instagram/items/${itemId}/action`, {
        action: "dismissed",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instagram/items"] })
      toast({
        title: "Reel Dismissed",
        description: "This Reel won't be shown again",
      })
    },
  })

  // Create project mutation (Phase 7)
  const createProjectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", `/api/projects/from-instagram/${itemId}`)
      return await res.json()
    },
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/instagram/items"] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Created",
        description: "Reel converted to project. Opening...",
      })
      // Navigate to the new project
      setLocation(`/project/${project.id}`)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Project",
        description: error.message || "Could not create project from Reel",
        variant: "destructive",
      })
    },
  })

  // AI scoring mutation (Phase 6)
  const scoreMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("POST", `/api/instagram/items/${itemId}/score`)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/instagram/items"] })
      toast({
        title: "AI Analysis Complete",
        description: `Score: ${data.score}/100 - ${data.comment}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to analyze Reel",
        variant: "destructive",
      })
    },
  })

  const handleDismiss = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    dismissMutation.mutate(itemId)
  }

  const handleCreateProject = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    createProjectMutation.mutate(itemId)
  }

  const handleScore = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    scoreMutation.mutate(itemId)
  }

  // Filter items
  const filteredItems = instagramItems?.filter(item => {
    const matchesSearch = !searchTerm || 
      item.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ownerUsername?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDismissed = !hideDismissed || item.userAction !== 'dismissed'
    const matchesUsed = !hideUsed || item.userAction !== 'selected'
    const matchesScore = (item.aiScore ?? 0) >= minScore
    const matchesSource = selectedSource === 'all' || item.sourceId === selectedSource
    const matchesDownloadStatus = downloadStatusFilter === 'all' || item.downloadStatus === downloadStatusFilter
    
    return matchesSearch && matchesDismissed && matchesUsed && matchesScore && matchesSource && matchesDownloadStatus
  }) || []

  const getDownloadStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle2, label: 'Downloaded', variant: 'default' as const, color: 'text-green-600 dark:text-green-400' }
      case 'downloading':
        return { icon: Loader2, label: 'Downloading', variant: 'secondary' as const, color: 'text-blue-600 dark:text-blue-400' }
      case 'failed':
        return { icon: AlertCircle, label: 'Failed', variant: 'destructive' as const, color: 'text-red-600 dark:text-red-400' }
      default:
        return { icon: Clock, label: 'Pending', variant: 'outline' as const, color: 'text-yellow-600 dark:text-yellow-400' }
    }
  }

  const getTranscriptionStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return { icon: MessageSquare, label: 'Transcribed', variant: 'default' as const, color: 'text-green-600 dark:text-green-400' }
      case 'processing':
        return { icon: Loader2, label: 'Transcribing', variant: 'secondary' as const, color: 'text-blue-600 dark:text-blue-400' }
      case 'failed':
        return { icon: AlertCircle, label: 'Failed', variant: 'destructive' as const, color: 'text-red-600 dark:text-red-400' }
      default:
        return { icon: CircleDashed, label: 'Not transcribed', variant: 'outline' as const, color: 'text-muted-foreground' }
    }
  }

  const formatNumber = (num: number | null) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const ReelCard = ({ item }: { item: InstagramItem }) => {
    const isDismissed = item.userAction === 'dismissed'
    const isUsed = item.userAction === 'selected'
    const downloadBadge = getDownloadStatusBadge(item.downloadStatus)
    const transcriptionBadge = getTranscriptionStatusBadge(item.transcriptionStatus)

    return (
      <Card
        className={`relative cursor-pointer hover-elevate active-elevate-2 transition-all ${
          isDismissed ? 'opacity-50' : ''
        } ${isUsed ? 'border-green-500 dark:border-green-600' : ''}`}
        data-testid={`card-reel-${item.id}`}
      >
        {/* Thumbnail */}
        <div className="relative h-64 overflow-hidden rounded-t-md bg-muted">
          {item.thumbnailUrl ? (
            <img 
              src={item.thumbnailUrl} 
              alt={item.caption || 'Instagram Reel'} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Instagram className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white/90 dark:bg-black/90 rounded-full p-3">
              <Play className="h-8 w-8 fill-current" />
            </div>
          </div>

          {/* Duration badge */}
          {item.videoDuration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
              {Math.floor(item.videoDuration / 60)}:{String(item.videoDuration % 60).padStart(2, '0')}
            </div>
          )}
        </div>

        <CardContent className="pt-4 pb-4">
          {/* Badges Row */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={downloadBadge.variant} className="gap-1">
                <downloadBadge.icon className={`h-3 w-3 ${downloadBadge.icon === Loader2 ? 'animate-spin' : ''}`} />
                {downloadBadge.label}
              </Badge>
              {item.downloadStatus === 'completed' && (
                <Badge variant={transcriptionBadge.variant} className="gap-1">
                  <transcriptionBadge.icon className={`h-3 w-3 ${transcriptionBadge.icon === Loader2 ? 'animate-spin' : ''}`} />
                  {transcriptionBadge.label}
                </Badge>
              )}
            </div>
            {item.aiScore !== null && (
              <ScoreBadge score={item.aiScore} size="sm" />
            )}
          </div>

          {/* Caption */}
          {item.caption && (
            <p className="text-sm line-clamp-3 mb-3">
              {item.caption}
            </p>
          )}

          {/* Owner Info */}
          {item.ownerUsername && (
            <div className="flex items-center gap-2 mb-3">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">@{item.ownerUsername}</span>
            </div>
          )}

          {/* Engagement Metrics */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
            {item.likesCount > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{formatNumber(item.likesCount)}</span>
              </div>
            )}
            {item.commentsCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{formatNumber(item.commentsCount)}</span>
              </div>
            )}
            {item.videoViewCount && item.videoViewCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{formatNumber(item.videoViewCount)}</span>
              </div>
            )}
            {item.publishedAt && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true, locale: ru })}</span>
              </>
            )}
          </div>

          {/* AI Comment */}
          {item.aiComment && (
            <div className="text-xs text-muted-foreground mb-3 italic border-l-2 border-primary pl-2">
              {item.aiComment}
            </div>
          )}

          {/* Actions */}
          {!isDismissed && !isUsed && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => handleCreateProject(e, item.id)}
                  disabled={item.transcriptionStatus !== 'completed' || createProjectMutation.isPending}
                  data-testid={`button-create-project-${item.id}`}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Clapperboard className="h-4 w-4 mr-1" />
                      Create Project
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleDismiss(e, item.id)}
                  data-testid={`button-dismiss-${item.id}`}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
              {/* AI Analysis Button - only show when transcribed but not scored */}
              {item.transcriptionStatus === 'completed' && item.aiScore === null && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={(e) => handleScore(e, item.id)}
                  disabled={scoreMutation.isPending}
                  data-testid={`button-score-${item.id}`}
                >
                  {scoreMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Used/Dismissed Status */}
          {isUsed && (
            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <Clapperboard className="h-4 w-4" />
              Used in project
            </div>
          )}
          {isDismissed && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <ThumbsDown className="h-4 w-4" />
              Dismissed
            </div>
          )}
        </CardContent>
      </Card>
    )
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
          <div className="ml-4 flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              Instagram Reels
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and select Reels for your projects
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                {showFilters ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showFilters && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div>
                  <Input
                    placeholder="Search caption or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search"
                  />
                </div>

                {/* Source Filter */}
                <div>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger data-testid="select-source">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {instagramSources?.map(source => (
                        <SelectItem key={source.id} value={source.id}>
                          @{source.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Download Status Filter */}
                <div>
                  <Select value={downloadStatusFilter} onValueChange={setDownloadStatusFilter}>
                    <SelectTrigger data-testid="select-download-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Downloaded</SelectItem>
                      <SelectItem value="downloading">Downloading</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Min AI Score */}
                <div>
                  <Select value={minScore.toString()} onValueChange={(v) => setMinScore(parseInt(v))}>
                    <SelectTrigger data-testid="select-min-score">
                      <SelectValue placeholder="Min AI Score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Scores</SelectItem>
                      <SelectItem value="50">50+</SelectItem>
                      <SelectItem value="70">70+</SelectItem>
                      <SelectItem value="85">85+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Quick Filters */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-dismissed"
                  checked={hideDismissed}
                  onCheckedChange={(checked) => setHideDismissed(checked as boolean)}
                  data-testid="checkbox-hide-dismissed"
                />
                <label htmlFor="hide-dismissed" className="text-sm cursor-pointer">
                  Hide dismissed
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-used"
                  checked={hideUsed}
                  onCheckedChange={(checked) => setHideUsed(checked as boolean)}
                  data-testid="checkbox-hide-used"
                />
                <label htmlFor="hide-used" className="text-sm cursor-pointer">
                  Hide selected
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {itemsLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            `Showing ${filteredItems.length} of ${instagramItems?.length || 0} Reels`
          )}
        </div>

        {/* Items Grid */}
        {itemsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-64 w-full rounded-t-md" />
                <CardContent className="pt-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(item => (
              <ReelCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Instagram className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reels Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {instagramItems?.length === 0 
                  ? 'Parse Instagram sources in Settings to get started'
                  : 'Try adjusting your filters'
                }
              </p>
              <Button
                variant="outline"
                onClick={() => setLocation("/settings")}
                data-testid="button-go-settings"
              >
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
