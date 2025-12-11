import { useState, useMemo } from "react";
import { type Project } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/query-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search } from "lucide-react";
import { CustomScriptInput } from "./stage-2/components/CustomScriptInput";
import { InstagramReelView } from "./stage-2/components/InstagramReelView";
import { NewsListItem } from "./stage-2/components/NewsListItem";
import { useNewsAnalysis } from "./stage-2/hooks/use-news-analysis";
import { useNewsMutations } from "./stage-2/hooks/use-news-mutations";
import type { RssItem } from "@shared/schema";
import type { EnrichedRssItem } from "./stage-2/utils/news-helpers";
import { useAppStore } from "@/hooks/use-app-store";

interface Stage2Props {
  project: Project;
  stepData: any;
}

export function Stage2ContentInput({ project, stepData }: Stage2Props) {
  const { toast } = useToast();
  const { setStore } = useAppStore();

  const sourceChoice = stepData?.sourceChoice || project.sourceType;
  // Custom script state
  const [customText, setCustomText] = useState("");

  // Filters state (same as All Articles page)
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");

  // Fetch RSS sources for filter
  const { data: sources } = useQuery({
    queryKey: ["/api/settings/rss-sources"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings/rss-sources");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    },
    enabled: sourceChoice === "news",
  });

  // Fetch news items (same endpoint as All Articles)
  const { data: articles, isLoading } = useQuery<RssItem[]>({
    queryKey: ["/api/news/all", { sourceFilter, scoreFilter, sortBy }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/news/all?source=${sourceFilter}&score=${scoreFilter}&sort=${sortBy}`
      );
      const response = await res.json();
      return response.data || response || [];
    },
    enabled: sourceChoice === "news",
  });

  // Get mutations from hook (same as All Articles but with proceedMutation for Stage 3)
  const { refreshMutation: refreshRssMutation, proceedMutation } =
    useNewsMutations(project);

  // Enrich article helper (same as All Articles)
  const enrichArticle = (article: RssItem): EnrichedRssItem => {
    let freshnessLabel: "hot" | "trending" | "recent" | "old" = "old";
    if (article.publishedAt) {
      const hoursAgo =
        (Date.now() - new Date(article.publishedAt).getTime()) /
        (1000 * 60 * 60);
      if (hoursAgo < 1) freshnessLabel = "hot";
      else if (hoursAgo < 6) freshnessLabel = "trending";
      else if (hoursAgo < 24) freshnessLabel = "recent";
    }

    return {
      ...article,
      freshnessLabel,
      sourceName: (article as any).sourceName || "Unknown Source",
      score: article.aiScore ?? null,
    };
  };

  // Filter articles (same logic as All Articles)
  const filteredArticles = useMemo(() => {
    let baseArticles = articles || [];

    // Apply source filter
    if (sourceFilter !== "all") {
      baseArticles = baseArticles.filter(
        (article) => article.sourceId === sourceFilter
      );
    }

    // Apply score filter
    if (scoreFilter !== "all") {
      if (scoreFilter === "high") {
        baseArticles = baseArticles.filter(
          (article) => (article.aiScore ?? 0) >= 80
        );
      } else if (scoreFilter === "medium") {
        baseArticles = baseArticles.filter((article) => {
          const s = article.aiScore ?? 0;
          return s >= 50 && s < 80;
        });
      } else if (scoreFilter === "low") {
        baseArticles = baseArticles.filter(
          (article) => (article.aiScore ?? 0) < 50
        );
      }
    }

    // Apply search filter
    let filtered = baseArticles.filter((article) => {
      if (
        searchTerm &&
        !article.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    // Apply sorting
    if (sortBy === "score") {
      filtered = [...filtered].sort((a, b) => {
        const scoreA = a.aiScore ?? 0;
        const scoreB = b.aiScore ?? 0;
        return scoreB - scoreA;
      });
    } else if (sortBy === "date") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [articles, searchTerm, sourceFilter, scoreFilter, sortBy]);

  // Enrich articles - use stable reference to prevent infinite loops
  const enrichedFilteredArticles = useMemo(() => {
    return filteredArticles.map(enrichArticle);
  }, [filteredArticles, articles]); // Include articles to ensure stability

  // Use news analysis hook
  const {
    analyses,
    analyzingItems,
    handleAnalyze,
    handleLoadSavedAnalysis,
    loadSavedAnalysisMutation,
  } = useNewsAnalysis(enrichedFilteredArticles);

  const handleCustomSubmit = () => {
    if (!customText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text",
        variant: "destructive",
      });
      return;
    }
    // Proceed to Stage 3 with custom text
    proceedMutation.mutate({ type: "custom", text: customText });
  };

  const handleInstagramContinue = async () => {
    const instagramItemId = stepData?.instagramItemId;
    if (!instagramItemId) return;

    // Fetch Instagram reel data
    const res = await apiRequest(
      "GET",
      `/api/instagram/items/${instagramItemId}`
    );
    const instagramReel = await res.json();

    if (!instagramReel) return;

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
    });
  };

  // Handle create script from article - proceeds to Stage 3
  const handleCreateScript = async (item: EnrichedRssItem, analysis: any) => {
    try {
      // Mark as selected
      await apiRequest("PATCH", `/api/news/${item.id}/action`, {
        action: "selected",
        projectId: project.id,
      });

      toast({
        title: "Создание сценария",
        description: "Загружаем статью и переходим к генерации...",
      });

      // Fetch full article content
      let content = item.fullContent || item.content || "";
      if (!item.fullContent) {
        const fullContentResponse = await apiRequest(
          "POST",
          `/api/news/${item.id}/fetch-full-content`,
          {}
        );
        const fullContentData = (await fullContentResponse.json()) as {
          success: boolean;
          content?: string;
          error?: string;
          cached?: boolean;
          fallback?: string;
        };

        content = fullContentData.success
          ? fullContentData.content || content
          : fullContentData.fallback || content;

        if (!fullContentData.success) {
          toast({
            title: "Используем краткое описание",
            description: `Не удалось загрузить полный текст. Используем краткое описание из RSS.`,
            variant: "default",
          });
        }
      }

      // Map recommended format to format ID
      const formatMap: Record<string, string> = {
        news_update: "news",
        explainer: "explainer",
        story: "hook",
        comparison: "comparison",
        tutorial: "tutorial",
        trend: "trend",
      };

      const recommendedFormat =
        analysis?.breakdown?.recommendedFormat?.format || "news_update";
      const formatId = formatMap[recommendedFormat] || "news";

      // Proceed to Stage 3 with analysis data (this will update project.currentStage to 3)
      proceedMutation.mutate({
        type: "news",
        newsId: item.id,
        title: item.title,
        content: content,
        url: item.url,
        score: item.aiScore,
        // Analysis data for Stage 3
        analysisData: analysis,
        recommendedFormat: formatId,
        scriptRecommendations: analysis?.scriptRecommendations || [],
        videoScorePrediction: analysis?.videoScorePrediction,
      });
      setStore({ myValue: "external-source" });
    } catch (error: any) {
      console.error("Error creating script:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать сценарий",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {sourceChoice === "news" && "Select News Article"}
          {sourceChoice === "custom" && "Enter Your Script"}
          {sourceChoice === "instagram" && "Instagram Reel Content"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {sourceChoice === "news" &&
            "Choose an article from your RSS feeds to transform into video"}
          {sourceChoice === "custom" &&
            "Provide the text content for your video"}
          {sourceChoice === "instagram" &&
            "Review the transcribed Reel content and proceed"}
        </p>
      </div>

      {sourceChoice === "custom" && (
        <CustomScriptInput
          customText={customText}
          onTextChange={setCustomText}
          onSubmit={handleCustomSubmit}
          isSubmitting={false}
        />
      )}

      {sourceChoice === "instagram" && (
        <InstagramReelView
          isLoading={false}
          reel={stepData}
          onContinue={handleInstagramContinue}
          isSubmitting={false}
        />
      )}

      {sourceChoice === "news" && (
        <div className="space-y-6">
          {/* Filters - Same UI as All Articles */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources?.map((source: any) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="high">High (80+)</SelectItem>
                    <SelectItem value="medium">Medium (50-79)</SelectItem>
                    <SelectItem value="low">Low (&lt;50)</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as "date" | "score")}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="score">Sort by Score</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => refreshRssMutation.mutate()}
                  disabled={refreshRssMutation.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshRssMutation.isPending ? "animate-spin" : ""
                    }`}
                  />
                  Обновить новости
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Articles List - Same UI as All Articles */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No articles found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {enrichedFilteredArticles.map((article) => {
                const analysis = analyses[article.id];
                const isAnalyzing = analyzingItems.has(article.id);
                const hasSavedAnalysis = !analysis && !isAnalyzing;
                const isLoadingSavedAnalysis =
                  loadSavedAnalysisMutation.isPending &&
                  loadSavedAnalysisMutation.variables === article.id;

                return (
                  <NewsListItem
                    key={article.id}
                    item={article}
                    analysis={analysis}
                    isAnalyzing={isAnalyzing}
                    hasSavedAnalysis={hasSavedAnalysis}
                    isLoadingSavedAnalysis={isLoadingSavedAnalysis}
                    onAnalyze={(item) => handleAnalyze(item)}
                    onLoadSavedAnalysis={handleLoadSavedAnalysis}
                    onCreateScript={handleCreateScript}
                    onToggleFavorite={(isFavorite) => {
                      // Favorite functionality can be added if needed
                    }}
                    onShowSavedAnalysis={(itemId) =>
                      loadSavedAnalysisMutation.mutate(itemId)
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Stats */}
          {articles && (
            <div className="mt-6 text-sm text-muted-foreground">
              Showing {filteredArticles.length} of {articles.length} articles
            </div>
          )}
        </div>
      )}
    </div>
  );
}
