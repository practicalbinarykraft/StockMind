import React from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Download, Share2, ExternalLink } from "lucide-react";
import { cn } from "@/shared/utils";

interface VideoPreviewPlayerProps {
  videoUrl: string;
  title?: string;
  onDownload?: () => void;
  className?: string;
}

export function VideoPreviewPlayer({
  videoUrl,
  title = "Готовое видео",
  onDownload,
  className,
}: VideoPreviewPlayerProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: "Посмотрите это видео",
          url: videoUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: копирование ссылки в буфер обмена
      try {
        await navigator.clipboard.writeText(videoUrl);
        alert("Ссылка скопирована в буфер обмена");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  const handleOpenInNewTab = () => {
    window.open(videoUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6 space-y-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full h-full"
            preload="metadata"
            controlsList="nodownload"
          >
            <source src={videoUrl} type="video/mp4" />
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        </div>

        {/* Действия */}
        <div className="flex flex-wrap gap-2">
          {onDownload && (
            <Button onClick={onDownload} className="flex-1 min-w-[140px]">
              <Download className="mr-2 h-4 w-4" />
              Скачать видео
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleShare}
            className="flex-1 min-w-[140px]"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Поделиться
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenInNewTab}
            className="flex-1 min-w-[140px]"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Открыть
          </Button>
        </div>

        {/* Информация */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Видео доступно для просмотра. Используйте кнопки выше для скачивания
          или публикации.
        </div>
      </CardContent>
    </Card>
  );
}
