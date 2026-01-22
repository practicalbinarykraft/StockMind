import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ScrollArea } from "@/shared/ui/scroll-area";

interface ArticlePreviewModalProps {
  open: boolean;
  onClose: () => void;
  article: {
    title: string;
    content?: string | null;
    url?: string | null;
    publishedAt?: string | Date | null;
  } | null;
}

/**
 * Modal for previewing article content
 */
export function ArticlePreviewModal({
  open,
  onClose,
  article,
}: ArticlePreviewModalProps) {
  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{article.title}</DialogTitle>
          {article.publishedAt && (
            <p className="text-sm text-muted-foreground">
              {new Date(article.publishedAt).toLocaleDateString()}
            </p>
          )}
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {article.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {article.content}
              </div>
            ) : (
              <p className="text-muted-foreground">No content available</p>
            )}
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                View original article →
              </a>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
