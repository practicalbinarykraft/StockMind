import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";
import { Globe, Newspaper, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { RssItem } from "@shared/schema";

interface ArticlePreviewModalProps {
  isOpen: boolean;
  article: RssItem & { sourceName?: string };
  projectId: string;
  onClose: () => void;
}

export function ArticlePreviewModal({ isOpen, article, projectId, onClose }: ArticlePreviewModalProps) {
  const { toast } = useToast();
  const [displayLang, setDisplayLang] = useState<"original" | "translated">("original");
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  
  // Use fullContent if available (extracted via Readability), otherwise fall back to summary
  const articleContent = article.fullContent || article.content || "";

  const translateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/translate-content`, {
        title: article.title,
        content: articleContent,
        targetLanguage: "ru",
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setTranslatedTitle(data.translatedTitle);
      setTranslatedContent(data.translatedContent);
      setDisplayLang("translated");
      toast({
        title: "Статья переведена",
        description: "Перевод выполнен успешно",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка перевода",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTranslate = () => {
    if (displayLang === "translated") {
      setDisplayLang("original");
    } else if (translatedTitle && translatedContent) {
      setDisplayLang("translated");
    } else {
      translateMutation.mutate();
    }
  };

  const displayTitle = displayLang === "translated" && translatedTitle ? translatedTitle : article.title;
  const displayContent = displayLang === "translated" && translatedContent ? translatedContent : articleContent;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-article-preview">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="flex-1 pr-4">{displayTitle}</DialogTitle>
            <Button
              variant={displayLang === "translated" ? "default" : "secondary"}
              size="sm"
              onClick={handleTranslate}
              disabled={translateMutation.isPending}
              className="shrink-0"
              data-testid="button-translate-article"
            >
              <Globe className="h-4 w-4 mr-2" />
              {translateMutation.isPending
                ? "Перевод..."
                : displayLang === "translated"
                ? "Оригинал"
                : "Перевести"}
            </Button>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap pt-2">
            {article.sourceName && (
              <div className="flex items-center gap-1">
                <Newspaper className="h-3 w-3" />
                <span className="font-medium">{article.sourceName}</span>
              </div>
            )}
            {article.publishedAt && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(article.publishedAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                </div>
              </>
            )}
            {displayLang === "translated" && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  Переведено
                </Badge>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Article Image */}
        {article.imageUrl && (
          <div className="relative h-48 overflow-hidden rounded-md -mx-6">
            <img
              src={article.imageUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
              data-testid="img-article-preview"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="flex-1 overflow-y-auto pr-2" data-testid="div-article-content">
          {translateMutation.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{displayContent}</p>
            </div>
          )}
        </div>

        {/* Article URL */}
        {article.url && (
          <div className="border-t pt-4 mt-4">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
              data-testid="link-article-source"
            >
              Открыть оригинальную статью ↗
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
