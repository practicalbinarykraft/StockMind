import { useState, useEffect } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import type { RssItem } from "@shared/schema"
import { ScoreBadge } from "@/components/score-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDistanceToNow, format } from "date-fns"
import { ru } from "date-fns/locale"
import { RefreshCw, ThumbsDown, Check, Flame, Zap, Newspaper, Calendar, Filter, Eye, EyeOff, CalendarIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Stage2Props {
  project: Project
  stepData: any
}

interface EnrichedRssItem extends RssItem {
  freshnessLabel: 'hot' | 'trending' | 'recent' | 'old'
  sourceName: string
}

export function Stage2ContentInput({ project, stepData }: Stage2Props) {
  const { toast } = useToast()
  const sourceChoice = stepData?.sourceChoice || project.sourceType

  // Custom script state
  const [customText, setCustomText] = useState("")

  // News filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [hideDismissed, setHideDismissed] = useState(true)
  const [hideUsed, setHideUsed] = useState(true)
  const [freshnessFilter, setFreshnessFilter] = useState<string>("all")
  const [minScore, setMinScore] = useState<number>(0)
  const [showFilters, setShowFilters] = useState(false)
  const [showAllOldNews, setShowAllOldNews] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // Fetch RSS sources for filter
  const { data: rssSources } = useQuery({
    queryKey: ["/api/settings/rss-sources"],
    enabled: sourceChoice === "news",
  })

  // Fetch news items if source is news
  const { data: newsItems, isLoading: newsLoading, refetch: refetchNews } = useQuery<EnrichedRssItem[]>({
    queryKey: ["/api/news"],
    enabled: sourceChoice === "news",
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
  })

  // Instagram Reel data - can be from stepData directly or fetched by ID
  const hasInstagramData = stepData && (stepData.transcription || stepData.contentType === 'instagram')
  const instagramItemId = stepData?.instagramItemId
  const { data: fetchedReel, isLoading: instagramLoading } = useQuery<any>({
    queryKey: [`/api/instagram/items/${instagramItemId}`],
    enabled: sourceChoice === "instagram" && !!instagramItemId && !hasInstagramData,
  })
  
  // Use stepData if available, otherwise use fetched data
  const instagramReel = hasInstagramData ? stepData : fetchedReel

  // Manual refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/news/refresh", {})
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] })
      toast({
        title: "News Refreshed",
        description: `Found ${data.newItems} new articles`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Parse extended period (more items)
  const parseExtendedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/news/refresh-extended", {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      })
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] })
      const message = startDate && endDate 
        ? `Parsed ${data.totalProcessed} items, ${data.newItems} new (RSS feeds may not support full date range)`
        : `Loaded ${data.newItems} new articles`
      toast({
        title: "Extended Parsing Complete",
        description: message,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Extended Parse Failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Dismiss news mutation
  const dismissMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("PATCH", `/api/news/${itemId}/action`, {
        action: "dismissed",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] })
      toast({
        title: "Article Dismissed",
        description: "This article won't be shown again",
      })
    },
  })

  const proceedMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 3,
        sourceData: data,
      })
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 2,
        data,
        completedAt: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
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

  const handleCustomSubmit = () => {
    if (!customText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text",
        variant: "destructive",
      })
      return
    }
    proceedMutation.mutate({ type: "custom", text: customText })
  }

  const handleNewsSelect = async (newsItem: EnrichedRssItem) => {
    try {
      // Mark as selected
      await apiRequest("PATCH", `/api/news/${newsItem.id}/action`, {
        action: "selected",
        projectId: project.id,
      })

      // Show loading toast
      toast({
        title: "Loading Article",
        description: "Extracting full article text...",
      })

      // Fetch full article content
      const fullContentResponse = await apiRequest("POST", `/api/news/${newsItem.id}/fetch-full-content`, {})
      const fullContentData = await fullContentResponse.json() as { success: boolean; content?: string; error?: string; cached?: boolean; fallback?: string }

      // Use full content if available, fallback to RSS snippet
      const content = fullContentData.success 
        ? (fullContentData.content || newsItem.content || '')
        : (fullContentData.fallback || newsItem.content || '')

      // Show warning if extraction failed
      if (!fullContentData.success) {
        toast({
          title: "Using Summary",
          description: `Could not load full article (${fullContentData.error || 'Unknown error'}). Using RSS summary instead.`,
          variant: "default",
        })
      } else if (fullContentData.cached) {
        console.log("[Stage 2] Using cached article content")
      } else {
        toast({
          title: "Article Loaded",
          description: `Extracted ${Math.round((content?.length || 0) / 1000)}k characters`,
        })
      }

      proceedMutation.mutate({
        type: "news",
        newsId: newsItem.id,
        title: newsItem.title,
        content: content,
        url: newsItem.url,
        score: newsItem.aiScore,
      })
    } catch (error: any) {
      console.error("Error selecting news:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to select article",
        variant: "destructive",
      })
    }
  }

  const handleInstagramContinue = async () => {
    if (!instagramReel) return

    // Mark as used
    await apiRequest("PATCH", `/api/instagram/items/${instagramReel.id}/action`, {
      action: "used",
      projectId: project.id,
    })

    proceedMutation.mutate({
      type: "instagram",
      instagramItemId: instagramReel.id,
      transcription: instagramReel.transcriptionText,
      caption: instagramReel.caption,
      language: instagramReel.language || "unknown",
      url: instagramReel.url,
      aiScore: instagramReel.aiScore,
      freshnessScore: instagramReel.freshnessScore,
      viralityScore: instagramReel.viralityScore,
      qualityScore: instagramReel.qualityScore,
      aiComment: instagramReel.aiComment,
    })
  }

  const handleDismiss = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    dismissMutation.mutate(itemId)
  }

  // Filter news
  const filteredNews = newsItems?.filter(item => {
    const matchesSearch = !searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDismissed = !hideDismissed || item.userAction !== 'dismissed'
    const matchesUsed = !hideUsed || item.userAction !== 'selected'
    const matchesFreshness = freshnessFilter === 'all' || item.freshnessLabel === freshnessFilter
    const matchesScore = !item.aiScore || item.aiScore >= minScore
    const matchesSource = selectedSource === 'all' || item.sourceName === selectedSource
    
    // Date range filtering
    let matchesDateRange = true
    if (startDate || endDate) {
      // If date filter is active, exclude items without publishedAt
      if (!item.publishedAt) {
        matchesDateRange = false
      } else {
        const itemDate = new Date(item.publishedAt)
        
        // Normalize startDate to beginning of day (00:00:00)
        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (itemDate < start) matchesDateRange = false
        }
        
        // Normalize endDate to end of day (23:59:59)
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (itemDate > end) matchesDateRange = false
        }
      }
    }
    
    return matchesSearch && matchesDismissed && matchesUsed && matchesFreshness && matchesScore && matchesSource && matchesDateRange
  }) || []

  // Group by freshness
  const hotNews = filteredNews.filter(item => item.freshnessLabel === 'hot')
  const trendingNews = filteredNews.filter(item => item.freshnessLabel === 'trending')
  const recentNews = filteredNews.filter(item => item.freshnessLabel === 'recent')
  const oldNews = filteredNews.filter(item => item.freshnessLabel === 'old')

  const getBadgeConfig = (label: string) => {
    switch (label) {
      case 'hot':
        return { icon: Flame, label: 'Hot', variant: 'destructive' as const }
      case 'trending':
        return { icon: Zap, label: 'Trending', variant: 'default' as const }
      case 'recent':
        return { icon: Newspaper, label: 'Recent', variant: 'secondary' as const }
      default:
        return { icon: Calendar, label: 'Old', variant: 'outline' as const }
    }
  }

  const NewsCard = ({ item }: { item: EnrichedRssItem }) => {
    const badge = getBadgeConfig(item.freshnessLabel)
    const isDismissed = item.userAction === 'dismissed'
    const isUsed = item.userAction === 'selected'

    return (
      <Card
        className={`relative cursor-pointer hover-elevate active-elevate-2 transition-all ${
          isDismissed ? 'opacity-50' : ''
        } ${isUsed ? 'border-green-500 dark:border-green-600' : ''}`}
        onClick={() => !isDismissed && !isUsed && handleNewsSelect(item)}
        data-testid={`card-news-${item.id}`}
      >
        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="relative h-40 overflow-hidden rounded-t-md">
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <CardContent className="pt-4 pb-4">
          {/* Badges Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge variant={badge.variant} className="gap-1">
              <badge.icon className="h-3 w-3" />
              {badge.label}
            </Badge>
            {item.aiScore !== null && (
              <ScoreBadge score={item.aiScore} size="sm" />
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold line-clamp-2 mb-2">{item.title}</h3>

          {/* Content */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {item.content}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
            <div className="flex items-center gap-1">
              <Newspaper className="h-3 w-3" />
              <span className="font-medium">{item.sourceName}</span>
            </div>
            {item.publishedAt && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true, locale: ru })}</span>
              </>
            )}
          </div>

          {/* Actions */}
          {!isDismissed && !isUsed && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNewsSelect(item)
                }}
                data-testid={`button-select-${item.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Select
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => handleDismiss(e, item.id)}
                disabled={dismissMutation.isPending}
                data-testid={`button-dismiss-${item.id}`}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isUsed && (
            <Badge variant="outline" className="w-full justify-center">
              <Check className="h-3 w-3 mr-1" />
              Used in project
            </Badge>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {sourceChoice === "news" && "Select News Article"}
          {sourceChoice === "custom" && "Enter Your Script"}
          {sourceChoice === "instagram" && "Instagram Reel Content"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {sourceChoice === "news" && "Choose an article from your RSS feeds to transform into video"}
          {sourceChoice === "custom" && "Provide the text content for your video"}
          {sourceChoice === "instagram" && "Review the transcribed Reel content and proceed"}
        </p>
      </div>

      {sourceChoice === "custom" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-text">Your Script</Label>
                <Textarea
                  id="custom-text"
                  placeholder="Enter your script or text content here..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={12}
                  className="mt-2"
                  data-testid="textarea-custom-script"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {customText.length} characters
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleCustomSubmit}
                disabled={!customText.trim() || proceedMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-save-custom"
              >
                {proceedMutation.isPending ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sourceChoice === "instagram" && (
        <div className="space-y-4">
          {instagramLoading && (
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}

          {!instagramLoading && !instagramReel && (
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Instagram Reel not found</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!instagramLoading && instagramReel && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Reel Info */}
                  <div className="flex gap-4">
                    <div className="relative flex-shrink-0 w-32 h-40 bg-muted rounded-md overflow-hidden">
                      {instagramReel.thumbnailUrl && (
                        <img 
                          src={instagramReel.thumbnailUrl} 
                          alt="Reel thumbnail" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">@{instagramReel.ownerUsername}</h3>
                        {instagramReel.caption && (
                          <p className="text-sm text-muted-foreground mt-1">{instagramReel.caption}</p>
                        )}
                      </div>
                      
                      {/* AI Score */}
                      {typeof instagramReel.aiScore === 'number' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">AI Score:</span>
                          <ScoreBadge score={instagramReel.aiScore} />
                          {instagramReel.freshnessScore !== null && (
                            <Badge variant="outline" className="text-xs">
                              Freshness: {instagramReel.freshnessScore}
                            </Badge>
                          )}
                          {instagramReel.viralityScore !== null && (
                            <Badge variant="outline" className="text-xs">
                              Virality: {instagramReel.viralityScore}
                            </Badge>
                          )}
                          {instagramReel.qualityScore !== null && (
                            <Badge variant="outline" className="text-xs">
                              Quality: {instagramReel.qualityScore}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* AI Comment */}
                      {instagramReel.aiComment && (
                        <div className="p-3 bg-muted/50 rounded text-sm italic border-l-2 border-primary/50">
                          {instagramReel.aiComment}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transcription */}
                  <div>
                    <Label>Transcription ({instagramReel.language || "Unknown"})</Label>
                    <div className="mt-2 p-4 bg-muted/50 rounded-md border">
                      <p className="text-sm whitespace-pre-wrap">
                        {instagramReel.transcriptionText}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {instagramReel.transcriptionText?.length || 0} characters
                    </p>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleInstagramContinue}
                    disabled={proceedMutation.isPending}
                    className="w-full sm:w-auto"
                    data-testid="button-instagram-continue"
                  >
                    {proceedMutation.isPending ? "Saving..." : "Continue to AI Analysis"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {sourceChoice === "news" && (
        <div className="space-y-6">
          {/* Toolbar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-news"
                  />
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  data-testid="button-refresh"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Button
                  variant="outline"
                  onClick={() => parseExtendedMutation.mutate()}
                  disabled={parseExtendedMutation.isPending}
                  data-testid="button-parse-extended"
                >
                  <Calendar className={`h-4 w-4 mr-2 ${parseExtendedMutation.isPending ? 'animate-spin' : ''}`} />
                  Parse Extended
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  {showFilters ? <EyeOff className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                  Filters
                </Button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hide-dismissed"
                      checked={hideDismissed}
                      onCheckedChange={(checked) => setHideDismissed(checked as boolean)}
                      data-testid="checkbox-hide-dismissed"
                    />
                    <label htmlFor="hide-dismissed" className="text-sm">
                      Hide Dismissed
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hide-used"
                      checked={hideUsed}
                      onCheckedChange={(checked) => setHideUsed(checked as boolean)}
                      data-testid="checkbox-hide-used"
                    />
                    <label htmlFor="hide-used" className="text-sm">
                      Hide Used
                    </label>
                  </div>

                  <div>
                    <Label htmlFor="freshness" className="text-xs">Freshness</Label>
                    <Select value={freshnessFilter} onValueChange={setFreshnessFilter}>
                      <SelectTrigger id="freshness" className="mt-1" data-testid="select-freshness">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="hot">Hot (last hour)</SelectItem>
                        <SelectItem value="trending">Trending (last 6h)</SelectItem>
                        <SelectItem value="recent">Recent (last 24h)</SelectItem>
                        <SelectItem value="old">Older</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="min-score" className="text-xs">Min Score</Label>
                    <Input
                      id="min-score"
                      type="number"
                      min="0"
                      max="100"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                      className="mt-1"
                      data-testid="input-min-score"
                    />
                  </div>

                  <div>
                    <Label htmlFor="source" className="text-xs">Source</Label>
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger id="source" className="mt-1" data-testid="select-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {(rssSources as any[])?.map((source: any) => (
                          <SelectItem key={source.id} value={source.name}>
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="start-date" className="text-xs">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full mt-1 justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="end-date" className="text-xs">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full mt-1 justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* News Grid */}
          {newsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  No news articles found. {newsItems && newsItems.length > 0 ? 'Try adjusting filters.' : 'Add RSS sources in Settings.'}
                </p>
                {newsItems && newsItems.length === 0 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh News
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Hot News */}
              {hotNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-5 w-5 text-red-500" />
                    <h2 className="text-xl font-semibold">Hot News ({hotNews.length})</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {hotNews.map(item => <NewsCard key={item.id} item={item} />)}
                  </div>
                </div>
              )}

              {/* Trending News */}
              {trendingNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-xl font-semibold">Trending ({trendingNews.length})</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {trendingNews.map(item => <NewsCard key={item.id} item={item} />)}
                  </div>
                </div>
              )}

              {/* Recent News */}
              {recentNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Newspaper className="h-5 w-5 text-blue-500" />
                    <h2 className="text-xl font-semibold">Recent ({recentNews.length})</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentNews.map(item => <NewsCard key={item.id} item={item} />)}
                  </div>
                </div>
              )}

              {/* Old News - Collapsed by default */}
              {oldNews.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <h2 className="text-xl font-semibold">Older ({oldNews.length})</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(showAllOldNews ? oldNews : oldNews.slice(0, 6)).map(item => <NewsCard key={item.id} item={item} />)}
                  </div>
                  {oldNews.length > 6 && !showAllOldNews && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setShowAllOldNews(true)}
                      data-testid="button-show-more-old"
                    >
                      Show {oldNews.length - 6} More Older Articles
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
