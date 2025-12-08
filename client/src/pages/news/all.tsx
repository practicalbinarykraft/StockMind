import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Search, Filter, BarChart3, Rss, RefreshCw } from "lucide-react";
import { Layout } from "@/components/layout/layout";
import { NewsListItem } from "@/components/project/stages/stage-2/components/NewsListItem";
import type { RssItem } from "@shared/schema";
import type { EnrichedRssItem } from "@/components/project/stages/stage-2/utils/news-helpers";
import { useNewsAnalysis } from "@/components/project/stages/stage-2/hooks/use-news-analysis";
import { useNewsMutations } from "./hooks/use-news-mutations";
import { useToast } from "@/hooks/use-toast";

export default function NewsAll() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [viewMode, setViewMode] = useState<"all" | "favorites">("all");
  const [statusFilter, setStatusFilter] = useState<"all">("all");

  // Fetch all articles
  const { data: articles, isLoading } = useQuery<RssItem[]>({
    queryKey: ["/api/news/all", { sourceFilter, scoreFilter, sortBy }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/news/all?source=${sourceFilter}&score=${scoreFilter}&sort=${sortBy}`
      );
      const response = await res.json();
      const articlesList = response.data || response || [];

      // Debug: log articles with analysis
      const withAnalysis = articlesList.filter((a: any) => a.articleAnalysis);
      console.log(`[NewsAll] Loaded ${articlesList.length} articles from API`, {
        withAnalysis: withAnalysis.length,
        articleIdsWithAnalysis: withAnalysis.map((a: any) => a.id).slice(0, 5),
      });

      return articlesList;
    },
  });

  // Get mutations from custom hook
  const { refreshRssMutation, createProjectMutation, toggleFavoriteMutation } =
    useNewsMutations();

  const handleCreateScript = async (item: EnrichedRssItem, analysis: any) => {
    // Generate script and save to library
    try {
      const format =
        analysis?.breakdown?.recommendedFormat?.format || "news_update";
      const res = await apiRequest(
        "POST",
        `/api/articles/${item.id}/generate-script`,
        {
          body: JSON.stringify({ format, saveToLibrary: true }),
        }
      );

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: res.statusText }));
        throw new Error(
          errorData.message || errorData.error || `HTTP ${res.status}`
        );
      }

      const data = await res.json();

      toast({
        title: "Сценарий создан",
        description: "Сценарий сохранен в библиотеку",
      });

      // Navigate to scripts library
      setLocation("/scripts");

      // Invalidate scripts query
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать сценарий",
        variant: "destructive",
      });
    }
  };

  // Convert RssItem to EnrichedRssItem
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

  // Fetch sources for filter
  const { data: sources } = useQuery({
    queryKey: ["/api/settings/rss-sources"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings/rss-sources");
      if (!res.ok) {
        console.error("[NewsAll] Failed to fetch RSS sources:", res.status);
        return [];
      }
      const data = await res.json();
      // API returns array directly or wrapped in data
      const sourcesList = Array.isArray(data) ? data : data.data || [];
      console.log(
        `[NewsAll] Loaded ${sourcesList.length} RSS sources for filter`
      );
      return sourcesList;
    },
  });

  const filteredArticles = useMemo(() => {
    // First filter by view mode (all vs favorites)
    let baseArticles = articles || [];
    if (viewMode === "favorites") {
      baseArticles = baseArticles.filter(
        (article) => article.isFavorite === true
      );
    }

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

    // Then apply search filter
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
  }, [
    articles,
    searchTerm,
    viewMode,
    statusFilter,
    sourceFilter,
    scoreFilter,
    sortBy,
  ]);

  // Enrich articles (memoized to prevent unnecessary re-renders)
  const enrichedFilteredArticles = useMemo(() => {
    return filteredArticles.map(enrichArticle);
  }, [filteredArticles]);

  // Use news analysis hook
  const {
    analyses,
    analyzingItems,
    handleAnalyze,
    handleLoadSavedAnalysis,
    loadSavedAnalysisMutation,
  } = useNewsAnalysis(enrichedFilteredArticles);

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">All Articles</h1>
          <p className="text-muted-foreground mb-4">
            Просматривайте и анализируйте все статьи из ваших RSS источников
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Quick Filter Buttons */}
            <div className="flex gap-2 mb-4 pb-4 border-b">
              <Button
                variant={
                  viewMode === "all" && statusFilter === "all"
                    ? "default"
                    : "outline"
                }
                onClick={() => {
                  setViewMode("all");
                  setStatusFilter("all");
                }}
                size="sm"
              >
                Все статьи
              </Button>
              <Button
                variant={viewMode === "favorites" ? "default" : "outline"}
                onClick={() => {
                  setViewMode("favorites");
                  setStatusFilter("all");
                }}
                size="sm"
              >
                <Star className="h-4 w-4 mr-2" />
                Избранное
              </Button>
            </div>

            {/* Search and Filter Dropdowns */}
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

        {/* Articles List */}
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
              const isTranslating = false; // Translation state can be added if needed
              // Check if article has saved analysis in DB (even if not loaded in state)
              // We'll show the button if analysis is not in state, and let the API check if it exists
              const hasSavedAnalysis = !analysis && !isAnalyzing; // Show button if no analysis in state and not currently analyzing
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
                    toggleFavoriteMutation.mutate({
                      id: article.id,
                      isFavorite,
                    });
                  }}
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
    </Layout>
  );
}
