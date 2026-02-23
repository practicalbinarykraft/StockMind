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
      const archiveUrl = `/api/scripts/${scriptId}/export/archive`;

      // Preflight check — verify auth and that the endpoint responds
      const check = await fetch(archiveUrl, {
        method: "HEAD",
        credentials: "include",
      }).catch(() => null);

      if (check && !check.ok) {
        const status = check.status;
        throw new Error(
          status === 401
            ? "Необходима авторизация"
            : status === 404
              ? "Скрипт не найден"
              : `Ошибка сервера (${status})`,
        );
      }

      const link = document.createElement("a");
      link.href = archiveUrl;
      link.download = `script-${scriptId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Скачивание начато",
        description: "ZIP-архив формируется и скачивается. Это может занять некоторое время.",
      });
    } catch (err) {
      console.error("Archive download failed:", err);
      toast({
        title: "Ошибка скачивания",
        description: err instanceof Error ? err.message : "Не удалось скачать архив",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsDownloading(false), 5000);
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
