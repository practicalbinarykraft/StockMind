import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { ArticlePreviewModal } from "@/components/shared/article-preview-modal";
import { Check, ThumbsDown, Eye, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { EnrichedRssItem } from "../utils/news-helpers";
import { getBadgeConfig } from "../utils/news-helpers";

interface NewsCardProps {
  item: EnrichedRssItem;
  onSelect: (item: EnrichedRssItem) => void;
  onDismiss: (e: React.MouseEvent, itemId: string) => void;
  isDismissing?: boolean;
}

export function NewsCard({
  item,
  onSelect,
  onDismiss,
  isDismissing,
}: NewsCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const badge = getBadgeConfig(item.freshnessLabel);
  const isDismissed = item.userAction === "dismissed";
  const isUsed = item.userAction === "selected";

  return (
    <>
      {previewOpen && (
        <ArticlePreviewModal
          isOpen={previewOpen}
          article={item}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      <Card
        className={`relative cursor-pointer hover-elevate active-elevate-2 transition-all ${
          isDismissed ? "opacity-50" : ""
        } ${isUsed ? "border-green-500 dark:border-green-600" : ""}`}
        onClick={() => !isDismissed && !isUsed && onSelect(item)}
        data-testid={`card-news-${item.id}`}
      >
        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="relative h-40 overflow-hidden rounded-t-md">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardContent className="pt-4 pb-4">
          {/* Badges Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge variant={badge.variant} className="gap-1">
              <badge.icon className="h-3 w-3" />
              {badge.label}
            </Badge>
            {(() => {
              const score =
                item.score ?? item.aiScore ?? item.freshnessScore ?? null;

              if (score !== null && score !== undefined) {
                return <ScoreBadge score={score} size="sm" />;
              } else {
                return (
                  <div
                    className="inline-flex items-center justify-center rounded-full font-semibold bg-muted text-muted-foreground text-xs px-2 py-0.5"
                    title="Анализ релевантности... Оценка появится автоматически"
                    data-testid={`badge-score-loading-${item.id}`}
                  >
                    <Skeleton className="h-3 w-6" />
                  </div>
                );
              }
            })()}
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
                <span>
                  {formatDistanceToNow(new Date(item.publishedAt), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          {!isDismissed && !isUsed && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item);
                  }}
                  data-testid={`button-select-${item.id}`}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Select
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => onDismiss(e, item.id)}
                  disabled={isDismissing}
                  data-testid={`button-dismiss-${item.id}`}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewOpen(true);
                }}
                data-testid={`button-preview-${item.id}`}
              >
                <Eye className="h-4 w-4 mr-1" />
                Предпросмотр
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
    </>
  );
}
