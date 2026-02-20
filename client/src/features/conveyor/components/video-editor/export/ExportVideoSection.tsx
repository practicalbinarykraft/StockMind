/**
 * Секция экспорта видео
 * Поддерживает HeyGen видео
 * (Remotion-рендеринг временно отключён)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AlertCircle, Video, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { MediaInfoCard } from "./MediaInfoCard";
import { DownloadButton } from "./DownloadButton";
// import { RenderProgressCard } from "./RenderProgressCard";
// import { VideoPreviewPlayer } from "./VideoPreviewPlayer";
// import {
//   RenderQualitySelector,
//   type RenderQuality,
// } from "./RenderQualitySelector";
import type { ScriptMedia } from "@/features/conveyor/services/scriptMediaService";
import {
  getProxiedImageUrl,
  getProxiedVideoUrl,
} from "@/features/conveyor/utils/media-proxy";
// import { apiRequest } from "@/shared/api/http";
// import { useToast } from "@/shared/hooks";

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
  // --- Remotion-рендеринг временно отключён ---
  // const { toast } = useToast();
  // const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  // const [isPolling, setIsPolling] = useState(false);
  // const [queuePosition, setQueuePosition] = useState<number | undefined>();
  // const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  // const [selectedQuality, setSelectedQuality] =
  //   useState<RenderQuality>("medium");

  const hasVideo = !!media?.videoUrl && media.videoStatus === "completed";
  const isGenerating = media?.videoStatus === "generating";
  const hasFailed = media?.videoStatus === "failed";
  // const pollAttemptsRef = useRef(0);
  // const MAX_POLL_ATTEMPTS = 600;

  const proxiedVideoUrl = getProxiedVideoUrl(media?.videoUrl);
  const proxiedThumbnailUrl = getProxiedImageUrl(media?.videoThumbnailUrl);

  // --- Remotion polling, handlers — временно отключены ---
  /*
  useEffect(() => {
    if (!renderJob || !isPolling) return;

    pollAttemptsRef.current = 0;

    const pollStatus = async () => {
      pollAttemptsRef.current++;

      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        setIsPolling(false);
        toast({
          title: "Таймаут рендеринга",
          description: "Превышено время ожидания (30 минут).",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await apiRequest(
          "GET",
          `/api/scripts/${scriptId}/render/${renderJob.jobId}/status`,
        );

        const json = await response.json();
        const data = json.data ?? json;
        setRenderJob(data);

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
      }
    };

    pollStatus();

    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [renderJob?.jobId, isPolling, scriptId, toast]);

  const handleStartRender = async () => {
    try {
      const response = await apiRequest("POST", `/api/scripts/${scriptId}/render`, {
        width: 1920,
        height: 1080,
        fps: 30,
        format: "mp4",
        quality: selectedQuality,
      });

      const json = await response.json();
      const data = json.data ?? json;
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

  const handleCancelRender = async () => {
    if (!renderJob) return;

    try {
      await apiRequest("DELETE", `/api/render/jobs/${renderJob.jobId}`);

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

  const handleDownloadRendered = async () => {
    if (!renderJob?.jobId) return;

    try {
      const response = await apiRequest(
        "GET",
        `/api/scripts/${scriptId}/render/${renderJob.jobId}/download`,
      );

      const json = await response.json();
      const data = json.data ?? json;

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
  */

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
                    preload="none"
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

        {/* --- Remotion рендеринг — временно отключён --- */}
        {/*
        {hasVideo && <div className="border-t" />}

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

          {!renderJob && (
            <RenderQualitySelector
              selectedQuality={selectedQuality}
              onQualityChange={setSelectedQuality}
            />
          )}

          {renderJob && renderJob.status !== "completed" && (
            <RenderProgressCard
              job={renderJob}
              queuePosition={queuePosition}
              onCancel={handleCancelRender}
            />
          )}

          {renderJob &&
            renderJob.status === "completed" &&
            renderedVideoUrl && (
              <VideoPreviewPlayer
                videoUrl={renderedVideoUrl}
                title="Отрендеренное видео"
                onDownload={handleDownloadRendered}
              />
            )}

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
        */}
      </CardContent>
    </Card>
  );
}
