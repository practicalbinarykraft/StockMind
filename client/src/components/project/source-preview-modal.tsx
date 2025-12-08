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
  const [translatedContent, setTranslatedContent] = useState<string | null>(
    null
  );
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: async () => {
      // Prepare text to translate (title + content, limit to 8000 chars for speed)
      const textToTranslate = (title + "\n\n" + content).substring(0, 8000);

      const res = await apiRequest("POST", "/api/news/translate", {
        text: textToTranslate,
      });
      const response = await res.json();

      // Handle both new format { success: true, data: {...} } and old format
      const data = response.data || response;
      const translated = data.translated || "";

      // Split translated text back into title and content
      const lines = translated.split("\n\n");
      const translatedTitle = lines[0] || title;
      const translatedContent = lines.slice(1).join("\n\n") || content;

      return {
        articleId: projectId,
        targetLanguage: "ru",
        translatedTitle,
        translatedContent,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    },
    onSuccess: (data) => {
      console.log("Translation success:", {
        hasTitle: !!data.translatedTitle,
        hasContent: !!data.translatedContent,
        titleLength: data.translatedTitle?.length,
        contentLength: data.translatedContent?.length,
      });
      const content = data?.translatedContent;
      const title = data?.translatedTitle;
      setTranslatedContent(content);
      setTranslatedTitle(title);
      setShowTranslation(true);
      toast({
        title: "Статья переведена",
        description: "Перевод выполнен успешно",
      });
    },
    onError: (error: any) => {
      console.error("Translation error:", error);

      // Check if it's a credit balance error
      const errorMessage = error.message || error.toString();
      const isCreditError =
        errorMessage.includes("credit balance") ||
        errorMessage.includes("Plans & Billing");

      toast({
        title: isCreditError
          ? "Недостаточно кредитов Anthropic"
          : "Ошибка перевода",
        description: isCreditError
          ? "Пополните баланс Anthropic API в Settings → API Keys"
          : errorMessage,
        variant: "destructive",
      });
    },
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

  const displayContent =
    showTranslation && translatedContent ? translatedContent : content;
  const displayTitle =
    showTranslation && translatedTitle ? translatedTitle : title;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[80vh]"
        data-testid="modal-source-preview"
      >
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
                  {translateMutation.isPending
                    ? "Переводим..."
                    : "Перевести на русский"}
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
