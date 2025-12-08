import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/layout";
import { NewsListItem } from "@/components/project/stages/stage-2/components/NewsListItem";
import type { RssItem } from "@shared/schema";
import type { EnrichedRssItem } from "@/components/project/stages/stage-2/utils/news-helpers";

export default function NewsFavorites() {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch favorite articles
  const { data: favorites, isLoading } = useQuery<RssItem[]>({
    queryKey: ["/api/news/favorites"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/news/favorites");
      const response = await res.json();
      return response.data || response || [];
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({
      id,
      isFavorite,
    }: {
      id: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        return await apiRequest("POST", `/api/news/${id}/favorite`);
      } else {
        return await apiRequest("DELETE", `/api/news/${id}/favorite`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      toast({
        title: "Избранное обновлено",
        description: "Статья удалена из избранного",
      });
    },
  });

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

  // Batch create projects mutation
  const batchCreateMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      return await apiRequest("POST", "/api/projects/batch-create", {
        articleIds,
      });
    },
    onSuccess: async (data) => {
      const response = data.json ? await data.json() : data;
      const count = response.data?.created || response.created || 0;
      toast({
        title: "Проекты созданы",
        description: `Успешно создано ${count} проектов из избранного`,
      });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать проекты",
        variant: "destructive",
      });
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === favorites?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favorites?.map((a) => a.id) || []));
    }
  };

  const handleBatchCreate = () => {
    if (selectedIds.size === 0) {
      toast({
        title: "Выберите статьи",
        description: "Выберите хотя бы одну статью для создания проекта",
        variant: "destructive",
      });
      return;
    }
    batchCreateMutation.mutate(Array.from(selectedIds));
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Star className="h-8 w-8 text-yellow-500" />
                Favorites
              </h1>
              <p className="text-muted-foreground">
                {favorites?.length || 0} articles in favorites
              </p>
            </div>
            {selectedIds.size > 0 && (
              <Button
                onClick={handleBatchCreate}
                disabled={batchCreateMutation.isPending}
                className="gap-2"
              >
                {batchCreateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Create Projects ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {favorites && favorites.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.size === favorites.length}
                      onCheckedChange={selectAll}
                    />
                    <span className="text-sm">Select All</span>
                  </div>
                  {selectedIds.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorites List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading favorites...</p>
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No favorites yet</p>
              <p className="text-sm text-muted-foreground">
                Add articles to favorites from the All Articles page
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {favorites.map((article) => {
              const enrichedArticle = enrichArticle(article);
              return (
                <div key={article.id} className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(article.id)}
                    onCheckedChange={() => toggleSelect(article.id)}
                    className="mt-2"
                  />
                  <div className="flex-1">
                    <NewsListItem
                      item={enrichedArticle}
                      isAnalyzing={false}
                      onSelect={() => {}}
                      onDismiss={() => {}}
                      onAnalyze={() => {}}
                      onCreateScript={() => {}}
                      onToggleFavorite={(isFavorite) => {
                        toggleFavoriteMutation.mutate({
                          id: article.id,
                          isFavorite,
                        });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
