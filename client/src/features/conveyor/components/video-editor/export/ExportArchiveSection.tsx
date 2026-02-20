/**
 * Секция экспорта ZIP-архива с контентом сцен
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Archive, Loader2, Download, FileText, Volume2, Image } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/hooks";
import type { ScriptMedia } from "@/features/conveyor/services/scriptMediaService";

interface ExportArchiveSectionProps {
  scriptId: string;
  media: ScriptMedia | null;
  scenesCount: number;
}

export function ExportArchiveSection({
  scriptId,
  media,
  scenesCount,
}: ExportArchiveSectionProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const hasAudio = !!media?.audioUrl;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/scripts/${scriptId}/export/archive`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
      link.download = filenameMatch?.[1] || `script-${scriptId}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Архив скачан",
        description: "ZIP-архив с контентом сцен сохранён.",
      });
    } catch (error) {
      console.error("Error downloading archive:", error);
      toast({
        title: "Ошибка скачивания",
        description:
          error instanceof Error
            ? error.message
            : "Не удалось скачать архив.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Скачать архив с контентом
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Информация о содержимом */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">Содержимое архива:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Тексты сцен ({scenesCount} {scenesCount === 1 ? "сцена" : scenesCount < 5 ? "сцены" : "сцен"})
            </li>
            {hasAudio && (
              <li className="flex items-center gap-2">
                <Volume2 className="h-3.5 w-3.5" />
                Аудио (полное + по сценам, если есть)
              </li>
            )}
            <li className="flex items-center gap-2">
              <Image className="h-3.5 w-3.5" />
              Медиа слоёв (фоны, оверлеи)
            </li>
          </ul>
        </div>

        {/* Кнопка скачивания */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full"
          size="lg"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Формирование архива...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Скачать ZIP-архив
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
