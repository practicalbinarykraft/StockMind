/**
 * Секция экспорта видео
 * Поддерживает как HeyGen видео, так и рендеринг через Remotion
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { AlertCircle, Video, Loader2, Play } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { MediaInfoCard } from "./MediaInfoCard";
import { DownloadButton } from "./DownloadButton";
import { RenderProgressCard } from "./RenderProgressCard";
import { VideoPreviewPlayer } from "./VideoPreviewPlayer";
import {
  RenderQualitySelector,
  type RenderQuality,
} from "./RenderQualitySelector";
import type { ScriptMedia } from "@/features/conveyor/services/scriptMediaService";
import {
  getProxiedImageUrl,
  getProxiedVideoUrl,
} from "@/features/conveyor/utils/media-proxy";
import { useToast } from "@/shared/hooks";

interface ExportVideoSectionProps {
  scriptId: string;
  media: ScriptMedia | null;
  isDownloading: boolean;
  onDownload: () => void;
}

interface RenderJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  videoUrl?: string;
}

export function ExportVideoSection({
  scriptId,
  media,
  isDownloading,
  onDownload,
}: ExportVideoSectionProps) {
  const { toast } = useToast();
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | undefined>();
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] =
    useState<RenderQuality>("medium");

  const hasVideo = !!media?.videoUrl && media.videoStatus === "completed";
  const isGenerating = media?.videoStatus === "generating";
  const hasFailed = media?.videoStatus === "failed";

  // Проксируем URL медиа для обхода CORS
  const proxiedVideoUrl = getProxiedVideoUrl(media?.videoUrl);
  const proxiedThumbnailUrl = getProxiedImageUrl(media?.videoThumbnailUrl);

  // Polling статуса рендеринга
  useEffect(() => {
    if (!renderJob || !isPolling) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/scripts/${scriptId}/render/${renderJob.jobId}/status`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch render status");
        }

        const data = await response.json();
        setRenderJob(data);

        // Остановить polling если завершено или ошибка
        if (data.status === "completed" || data.status === "failed") {
          setIsPolling(false);

          if (data.status === "completed" && data.videoUrl) {
            setRenderedVideoUrl(data.videoUrl);
            toast({
              title: "Рендеринг завершен!",
              description: "Видео успешно создано и готово к просмотру.",
            });
          } else if (data.status === "failed") {
            toast({
              title: "Ошибка рендеринга",
              description: data.errorMessage || "Не удалось создать видео.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error polling render status:", error);
        // Не останавливаем polling при ошибке сети, продолжаем попытки
      }
    };

    // Первый запрос сразу
    pollStatus();

    // Затем каждые 3 секунды
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [renderJob?.jobId, isPolling, scriptId, toast]);

  // Запуск рендеринга
  const handleStartRender = async () => {
    try {
      const response = await fetch(`/api/scripts/${scriptId}/render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          width: 1920,
          height: 1080,
          fps: 30,
          format: "mp4",
          quality: selectedQuality,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start render");
      }

      const data = await response.json();
      setRenderJob(data);
      setIsPolling(true);
      setRenderedVideoUrl(null);

      toast({
        title: "Рендеринг запущен",
        description: "Видео будет готово через несколько минут.",
      });
    } catch (error) {
      console.error("Error starting render:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить рендеринг. Попробуйте снова.",
        variant: "destructive",
      });
    }
  };

  // Отмена рендеринга
  const handleCancelRender = async () => {
    if (!renderJob) return;

    try {
      const response = await fetch(`/api/render/jobs/${renderJob.jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel render");
      }

      setRenderJob(null);
      setIsPolling(false);

      toast({
        title: "Рендеринг отменен",
        description: "Задача рендеринга была отменена.",
      });
    } catch (error) {
      console.error("Error cancelling render:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отменить рендеринг.",
        variant: "destructive",
      });
    }
  };

  // Скачать отрендеренное видео
  const handleDownloadRendered = async () => {
    if (!renderJob?.jobId) return;

    try {
      const response = await fetch(
        `/api/scripts/${scriptId}/render/${renderJob.jobId}/download`,
      );

      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }

      const data = await response.json();

      // Открываем ссылку для скачивания
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = `video-${scriptId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Скачивание начато",
        description: "Видео будет сохранено на ваше устройство.",
      });
    } catch (error) {
      console.error("Error downloading video:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось скачать видео.",
        variant: "destructive",
      });
    }
  };

  // Видео генерируется через HeyGen
  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Видео генерируется через HeyGen... Это может занять несколько
              минут.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Ошибка генерации HeyGen
  if (hasFailed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {media?.videoErrorMessage ||
                "Ошибка генерации видео. Попробуйте снова."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Видео
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* HeyGen видео (если есть) */}
        {hasVideo && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">HeyGen Видео</h4>
            </div>

            <MediaInfoCard
              type="video"
              duration={media.videoDuration}
              generatedAt={media.videoGeneratedAt}
            />

            {/* Видео плеер */}
            {proxiedVideoUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Просмотр:</label>
                <div className="bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <video
                    controls
                    src={proxiedVideoUrl}
                    poster={proxiedThumbnailUrl}
                    className="max-w-full max-h-[500px] object-contain rounded-lg"
                    style={{
                      width: "auto",
                      height: "auto",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Кнопка скачивания HeyGen видео */}
            <DownloadButton
              onDownload={onDownload}
              isDownloading={isDownloading}
              label="Скачать HeyGen видео"
            />
          </div>
        )}

        {/* Разделитель */}
        {hasVideo && <div className="border-t" />}

        {/* Remotion рендеринг */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Remotion Рендеринг</h4>
            {!renderJob && (
              <Button onClick={handleStartRender} size="sm">
                <Play className="mr-2 h-4 w-4" />
                Начать рендеринг
              </Button>
            )}
          </div>

          {/* Селектор качества */}
          {!renderJob && (
            <RenderQualitySelector
              selectedQuality={selectedQuality}
              onQualityChange={setSelectedQuality}
            />
          )}

          {/* Прогресс рендеринга */}
          {renderJob && renderJob.status !== "completed" && (
            <RenderProgressCard
              job={renderJob}
              queuePosition={queuePosition}
              onCancel={handleCancelRender}
            />
          )}

          {/* Готовое видео */}
          {renderJob &&
            renderJob.status === "completed" &&
            renderedVideoUrl && (
              <VideoPreviewPlayer
                videoUrl={renderedVideoUrl}
                title="Отрендеренное видео"
                onDownload={handleDownloadRendered}
              />
            )}

          {/* Информация о рендеринге */}
          {!renderJob && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Выберите качество видео и нажмите "Начать рендеринг" для
                создания финального видео с помощью Remotion. Рендеринг займет
                20-30 минут для 5-минутного видео.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
