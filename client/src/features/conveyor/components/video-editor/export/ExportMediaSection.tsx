/**
 * Секция экспорта медиаконтента сцен (изображения + видео)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ImageIcon,
  Video,
  Download,
  Loader2,
  Layers,
  FileImage,
  FileVideo,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  useScriptWithLayers,
  flattenLayer,
} from "@/features/conveyor/services/layers";
import type { ContentType } from "@/features/conveyor/types/layers";

interface MediaItem {
  id: string;
  sceneIndex: number;
  sceneId: string;
  layerType: "background" | "overlay";
  contentType: ContentType;
  sourceUrl: string;
  generationPrompt?: string;
  generationModel?: string;
}

interface ExportMediaSectionProps {
  scriptId: string;
}

function getFileExtension(contentType: ContentType, url: string): string {
  const urlPath = url.split("?")[0];
  const ext = urlPath.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov"].includes(ext)) {
    return ext;
  }
  return contentType === "video" ? "mp4" : "jpg";
}

function buildFilename(item: MediaItem): string {
  const ext = getFileExtension(item.contentType, item.sourceUrl);
  const layerLabel = item.layerType === "background" ? "bg" : "overlay";
  return `scene-${item.sceneIndex + 1}_${layerLabel}.${ext}`;
}

export function ExportMediaSection({ scriptId }: ExportMediaSectionProps) {
  const { data, isLoading } = useScriptWithLayers(scriptId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const mediaItems: MediaItem[] = [];

  if (data?.scenes) {
    data.scenes.forEach((scene: any, index: number) => {
      const rawLayers = scene.layers || [];
      for (const rawLayer of rawLayers) {
        const layer = flattenLayer(rawLayer);
        if (layer.layerType === "textLayer") continue;
        if (!layer.sourceUrl || layer.contentType === "avatar") continue;

        mediaItems.push({
          id: layer.id,
          sceneIndex: index,
          sceneId: scene.sceneId,
          layerType: layer.layerType as "background" | "overlay",
          contentType: layer.contentType as ContentType,
          sourceUrl: layer.sourceUrl,
          generationPrompt: layer.generationPrompt,
          generationModel: layer.generationModel,
        });
      }
    });
  }

  const images = mediaItems.filter((m) => m.contentType === "image");
  const videos = mediaItems.filter((m) => m.contentType === "video");

  const handleDownload = async (item: MediaItem) => {
    try {
      setDownloadingId(item.id);
      const response = await fetch(item.sourceUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = buildFilename(item);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Медиаконтент сцен
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Загрузка медиа...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Медиаконтент сцен
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Нет добавленных изображений или видео на сценах.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Медиаконтент сцен
          <Badge variant="secondary" className="ml-auto">
            {mediaItems.length}{" "}
            {mediaItems.length === 1
              ? "файл"
              : mediaItems.length < 5
                ? "файла"
                : "файлов"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Изображения */}
        {images.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Изображения ({images.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  isDownloading={downloadingId === item.id}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Видео */}
        {videos.length > 0 && (
          <div className="space-y-3">
            {images.length > 0 && <div className="border-t" />}
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Видео ({videos.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {videos.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  isDownloading={downloadingId === item.id}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MediaCard({
  item,
  isDownloading,
  onDownload,
}: {
  item: MediaItem;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  const isVideo = item.contentType === "video";
  const LayerIcon = item.layerType === "background" ? FileImage : FileVideo;
  const layerLabel = item.layerType === "background" ? "Фон" : "Оверлей";

  return (
    <div className="group relative rounded-lg border overflow-hidden bg-muted/30">
      {/* Превью */}
      <div className="aspect-video relative overflow-hidden bg-muted">
        {isVideo ? (
          <video
            src={item.sourceUrl}
            muted
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={item.sourceUrl}
            alt={`Сцена ${item.sceneIndex + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Overlay с кнопкой скачивания */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Button
            size="icon"
            variant="secondary"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={onDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Бейдж типа контента */}
        {isVideo && (
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Video className="h-3 w-3 mr-0.5" />
              Video
            </Badge>
          </div>
        )}
      </div>

      {/* Инфо */}
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            Сцена {item.sceneIndex + 1}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <LayerIcon className="h-3 w-3 mr-0.5" />
            {layerLabel}
          </Badge>
        </div>
        {item.generationModel && (
          <p className="text-[10px] text-muted-foreground truncate">
            {item.generationModel}
          </p>
        )}
      </div>
    </div>
  );
}
