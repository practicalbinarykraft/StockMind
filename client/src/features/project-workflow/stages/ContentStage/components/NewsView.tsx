import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { RefreshCw, Flame, Zap, Newspaper, Calendar } from "lucide-react";
import { NewsCard } from "./NewsCard";
import { NewsListItem } from "./NewsListItem";
import type { EnrichedRssItem } from "../utils/news-helpers";

interface NewsViewProps {
  isLoading: boolean;
  filteredNews: EnrichedRssItem[];
  allNews: EnrichedRssItem[] | undefined;
  viewFormat: "grid" | "list";
  groupedNews: {
    hot: EnrichedRssItem[];
    trending: EnrichedRssItem[];
    recent: EnrichedRssItem[];
    old: EnrichedRssItem[];
  };
  showAllOldNews: boolean;
  onShowMoreOld: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelect: (item: EnrichedRssItem) => void;
  onDismiss: (e: React.MouseEvent, itemId: string) => void;
  onTranslate: (itemId: string, text: string) => void;
  onAnalyze: (item: EnrichedRssItem) => void;
  onCreateScript?: (item: EnrichedRssItem, analysis: any) => void;
  translations: Record<string, { text: string; language: "en" | "ru" }>;
  analyses: Record<string, any>;
  analyzingItems: Set<string>;
  isTranslating: boolean;
  isDismissing: boolean;
}

export function NewsView({
  isLoading,
  filteredNews,
  allNews,
  viewFormat,
  groupedNews,
  showAllOldNews,
  onShowMoreOld,
  onRefresh,
  isRefreshing,
  onSelect,
  onDismiss,
  onTranslate,
  onAnalyze,
  onCreateScript,
  translations,
  analyses,
  analyzingItems,
  isTranslating,
  isDismissing,
}: NewsViewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredNews.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">
            No news articles found.{" "}
            {allNews && allNews.length > 0
              ? "Try adjusting filters."
              : "Add RSS sources in Settings."}
          </p>
          {allNews && allNews.length === 0 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh News
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (viewFormat === "list") {
    return (
      <div className="space-y-4">
        {filteredNews.map((item) => (
          <NewsListItem
            key={item.id}
            item={item}
            analysis={analyses[item.id]}
            isAnalyzing={analyzingItems.has(item.id)}
            onSelect={onSelect}
            onDismiss={onDismiss}
            onAnalyze={onAnalyze}
            onCreateScript={onCreateScript}
            isDismissing={isDismissing}
          />
        ))}
      </div>
    );
  }

  // Grid view
  return (
    <div className="space-y-8">
      {groupedNews.hot.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-semibold">
              Hot News ({groupedNews.hot.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedNews.hot.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDismiss={onDismiss}
                isDismissing={isDismissing}
              />
            ))}
          </div>
        </div>
      )}

      {groupedNews.trending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">
              Trending ({groupedNews.trending.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedNews.trending.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDismiss={onDismiss}
                isDismissing={isDismissing}
              />
            ))}
          </div>
        </div>
      )}

      {groupedNews.recent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">
              Recent ({groupedNews.recent.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedNews.recent.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDismiss={onDismiss}
                isDismissing={isDismissing}
              />
            ))}
          </div>
        </div>
      )}

      {groupedNews.old.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold">
              Older ({groupedNews.old.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(showAllOldNews
              ? groupedNews.old
              : groupedNews.old.slice(0, 6)
            ).map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDismiss={onDismiss}
                isDismissing={isDismissing}
              />
            ))}
          </div>
          {groupedNews.old.length > 6 && !showAllOldNews && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={onShowMoreOld}
              data-testid="button-show-more-old"
            >
              Show {groupedNews.old.length - 6} More Older Articles
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
