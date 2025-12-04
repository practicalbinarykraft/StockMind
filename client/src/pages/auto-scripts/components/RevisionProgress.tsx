/**
 * Revision Progress Component
 * Компонент для отображения прогресса обработки ревизии
 */
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRevisionProgress, formatTime } from "../hooks/use-revision-progress";
import { getStageName, getStageDescription, getStageIcon } from "../utils/revision-stages";
import { RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react";

interface RevisionProgressProps {
  conveyorItemId: string | null | undefined;
}

export function RevisionProgress({ conveyorItemId }: RevisionProgressProps) {
  const { progress, isLoading, error } = useRevisionProgress(conveyorItemId, !!conveyorItemId);

  if (!conveyorItemId) {
    return null;
  }

  if (isLoading && !progress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Загрузка прогресса...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            Ошибка загрузки прогресса: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  const currentStageInfo = getStageName(progress.currentStage);
  const currentStageDescription = getStageDescription(progress.currentStage);
  const currentStageIcon = getStageIcon(progress.currentStage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {progress.status === "completed" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Ревизия завершена
            </>
          ) : progress.status === "failed" ? (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              Ошибка обработки
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
              Ревизия в процессе
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium">{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
        </div>

        {/* Current Stage */}
        {progress.status === "processing" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-2xl">{currentStageIcon}</span>
              <div className="flex-1">
                <div className="font-medium">Этап: {currentStageInfo}</div>
                <div className="text-xs text-muted-foreground">{currentStageDescription}</div>
              </div>
            </div>
          </div>
        )}

        {/* Time Information */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Время: {formatTime(progress.elapsedTime)}</span>
          </div>
          {progress.status === "processing" && progress.estimatedTimeRemaining > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Осталось: ~{formatTime(progress.estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>

        {/* Stages List */}
        {progress.stages.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">Этапы:</div>
            {progress.stages.map((stage, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs p-1 rounded"
              >
                {stage.status === "completed" ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : stage.status === "processing" ? (
                  <RefreshCw className="h-3 w-3 text-orange-500 animate-spin flex-shrink-0" />
                ) : (
                  <div className="h-3 w-3 rounded-full border-2 border-muted flex-shrink-0" />
                )}
                <span className="flex-1">{stage.name}</span>
                {stage.duration > 0 && (
                  <span className="text-muted-foreground">{formatTime(stage.duration)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

