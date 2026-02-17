import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { X, Clock, Users } from "lucide-react";
import { cn } from "@/shared/utils";

interface RenderJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface RenderProgressCardProps {
  job: RenderJob;
  queuePosition?: number;
  onCancel?: () => void;
  className?: string;
}

export function RenderProgressCard({
  job,
  queuePosition,
  onCancel,
  className,
}: RenderProgressCardProps) {
  // Определяем статус сообщение
  const getStatusMessage = () => {
    if (job.status === "pending") {
      if (queuePosition && queuePosition > 0) {
        return `В очереди (позиция ${queuePosition})`;
      }
      return "Ожидание начала рендеринга...";
    }

    if (job.status === "processing") {
      if (job.progress < 15) {
        return "Подготовка данных...";
      } else if (job.progress < 80) {
        return "Рендеринг кадров...";
      } else if (job.progress < 90) {
        return "Финальная обработка...";
      } else {
        return "Загрузка в облако...";
      }
    }

    if (job.status === "completed") {
      return "Рендеринг завершен!";
    }

    if (job.status === "failed") {
      return job.errorMessage || "Ошибка рендеринга";
    }

    return "Неизвестный статус";
  };

  // Вычисляем расчетное время до завершения
  const getEstimatedTime = () => {
    if (job.status !== "processing" || job.progress === 0) {
      return null;
    }

    const startTime = new Date(job.startedAt).getTime();
    const currentTime = Date.now();
    const elapsedMs = currentTime - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);

    // Грубая оценка: если прошло X минут и прогресс Y%, то всего потребуется X/Y*100 минут
    const totalEstimatedMin = Math.ceil((elapsedMin / job.progress) * 100);
    const remainingMin = totalEstimatedMin - elapsedMin;

    if (remainingMin <= 0) {
      return "Почти готово...";
    }

    if (remainingMin === 1) {
      return "Осталась ~1 минута";
    }

    if (remainingMin < 60) {
      return `Осталось ~${remainingMin} минут`;
    }

    const hours = Math.floor(remainingMin / 60);
    const minutes = remainingMin % 60;
    return `Осталось ~${hours}ч ${minutes}м`;
  };

  const statusMessage = getStatusMessage();
  const estimatedTime = getEstimatedTime();
  const canCancel = job.status === "pending" || job.status === "processing";

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Рендеринг видео</CardTitle>
          {canCancel && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8"
              title="Отменить рендеринг"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Прогресс-бар */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{statusMessage}</span>
            <span className="font-medium">{job.progress}%</span>
          </div>
          <Progress
            value={job.progress}
            className={cn(
              "h-2",
              job.status === "failed" && "bg-destructive/20",
            )}
          />
        </div>

        {/* Дополнительная информация */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {/* Расчетное время */}
          {estimatedTime && job.status === "processing" && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{estimatedTime}</span>
            </div>
          )}

          {/* Позиция в очереди */}
          {queuePosition && queuePosition > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>Позиция в очереди: {queuePosition}</span>
            </div>
          )}
        </div>

        {/* Сообщение об ошибке */}
        {job.status === "failed" && job.errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Ошибка:</p>
            <p className="mt-1">{job.errorMessage}</p>
          </div>
        )}

        {/* Информация о времени */}
        <div className="text-xs text-muted-foreground">
          {job.status === "completed" && job.completedAt ? (
            <span>
              Завершено:{" "}
              {new Date(job.completedAt).toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </span>
          ) : (
            <span>
              Начало:{" "}
              {new Date(job.startedAt).toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
