import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Languages, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";

interface SourcePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  projectId: string;
}

export function SourcePreviewModal({
  open,
  onClose,
  title,
  content,
  projectId,
}: SourcePreviewModalProps) {
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/translate-content`, {
        content,
        title,
        targetLanguage: "ru"
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Safe unwrapping for new API format: { success: true, data: { translatedContent: "..." } }
      const content = data?.data?.translatedContent ?? data?.translatedContent;
      const title = data?.data?.translatedTitle ?? data?.translatedTitle;
      setTranslatedContent(content);
      setTranslatedTitle(title);
      setShowTranslation(true);
      toast({
        title: "Перевод выполнен",
        description: `Заголовок и контент переведены на русский язык`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка перевода",
        description: error.message || "Не удалось перевести контент",
        variant: "destructive"
      });
    }
  });

  const handleTranslate = () => {
    if (translatedContent) {
      // Already have translation, just toggle display
      setShowTranslation(true);
    } else {
      // Need to translate
      translateMutation.mutate();
    }
  };

  const handleShowOriginal = () => {
    setShowTranslation(false);
  };

  const displayContent = showTranslation && translatedContent ? translatedContent : content;
  const displayTitle = showTranslation && translatedTitle ? translatedTitle : title;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="modal-source-preview">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex-1">{displayTitle}</DialogTitle>
            <div className="flex items-center gap-2">
              {showTranslation && (
                <Badge variant="secondary" className="gap-1">
                  <Languages className="h-3 w-3" />
                  Перевод
                </Badge>
              )}
              {!showTranslation ? (
                <Button
                  onClick={handleTranslate}
                  disabled={translateMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  data-testid="button-translate"
                >
                  <Languages className="h-4 w-4" />
                  {translateMutation.isPending ? 'Переводим...' : 'Перевести на русский'}
                </Button>
              ) : (
                <Button
                  onClick={handleShowOriginal}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  data-testid="button-show-original"
                >
                  <RotateCcw className="h-4 w-4" />
                  Показать оригинал
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {displayContent}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
