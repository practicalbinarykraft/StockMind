import { useState } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import type { RssItem } from "@shared/schema"
import { ScoreBadge } from "@/components/score-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"

interface Stage2Props {
  project: Project
  stepData: any
}

export function Stage2ContentInput({ project, stepData }: Stage2Props) {
  const { toast } = useToast()
  const sourceChoice = stepData?.sourceChoice || project.sourceType

  // Custom script state
  const [customText, setCustomText] = useState("")

  // News filter state
  const [topicFilter, setTopicFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch news items if source is news
  const { data: newsItems, isLoading: newsLoading } = useQuery<RssItem[]>({
    queryKey: ["/api/news"],
    enabled: sourceChoice === "news",
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

  const handleNewsSelect = (newsItem: RssItem) => {
    proceedMutation.mutate({
      type: "news",
      newsId: newsItem.id,
      title: newsItem.title,
      content: newsItem.content,
      url: newsItem.url,
      score: newsItem.aiScore,
    })
  }

  const filteredNews = newsItems?.filter(item => {
    const matchesSearch = !searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }) || []

  const uniqueTopics: string[] = []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {sourceChoice === "news" ? "Select News Article" : "Enter Your Script"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {sourceChoice === "news" 
            ? "Choose an article from your RSS feeds to transform into video"
            : "Provide the text content for your video"
          }
        </p>
      </div>

      {sourceChoice === "custom" ? (
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
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                    data-testid="input-search-news"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Select value={topicFilter} onValueChange={setTopicFilter}>
                    <SelectTrigger id="topic" className="mt-2" data-testid="select-topic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {uniqueTopics.map(topic => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  No news articles found. Add RSS sources in Settings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNews.map(item => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                  onClick={() => handleNewsSelect(item)}
                  data-testid={`card-news-${item.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold line-clamp-2 flex-1">{item.title}</h3>
                      {item.aiScore !== null && (
                        <ScoreBadge score={item.aiScore} size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {item.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.source?.topic || "Uncategorized"}</span>
                      {item.publishedAt && (
                        <span>{formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
