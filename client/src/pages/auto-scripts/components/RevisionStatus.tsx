/**
 * Revision Status Component
 * Компонент для отображения статуса ревизии с понятными сообщениями
 */
import { AlertCircle, Clock, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RevisionStatusProps {
  status: "revision" | "pending" | "approved" | "rejected";
  revisionCount: number;
  onReset?: () => void;
  isResetting?: boolean;
  /** Статус прогресса из conveyor_items (если revision уже completed, не показываем предупреждение) */
  progressStatus?: "processing" | "completed" | "failed";
}

export function RevisionStatus({
  status,
  revisionCount,
  onReset,
  isResetting = false,
  progressStatus,
}: RevisionStatusProps) {
  // Показываем только для статуса "revision" И только если ревизия ещё не завершена
  if (status !== "revision") {
    return null;
  }

  // Если прогресс показывает что ревизия завершена - не показываем предупреждение
  if (progressStatus === "completed") {
    return null;
  }

  // Если достигнут лимит доработок
  if (revisionCount >= 5) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 flex-1">
          <AlertCircle className="h-3 w-3" />
          Достигнут лимит доработок (5). Сценарий не может быть доработан дальше.
        </p>
      </div>
    );
  }

  // Статус "revision" - показываем информацию о процессе
  return (
    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
      <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 flex-1">
        <Clock className="h-3 w-3" />
        Ревизия в процессе. Обычно занимает 2-4 минуты. Если прошло больше 5 минут, используйте кнопку "Сбросить".
      </p>
      {onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isResetting}
        >
          {isResetting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          <span className="ml-1">Сбросить</span>
        </Button>
      )}
    </div>
  );
}

