import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Brain, RotateCcw } from "lucide-react";

interface LearningStats {
  learnedThreshold: string | number | null;
  avoidedTopics: string[] | null;
  preferredFormats: string[] | null;
}

interface ConveyorLearningSystemProps {
  stats: LearningStats | null;
  onResetLearning: () => void;
  isResetPending: boolean;
}

/**
 * Learning system info and reset functionality
 */
export function ConveyorLearningSystem({
  stats,
  onResetLearning,
  isResetPending,
}: ConveyorLearningSystemProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5" />
        <h3 className="text-lg font-medium">Система обучения</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 rounded-lg border">
          <div className="text-sm text-muted-foreground">Адаптивный порог</div>
          <div className="text-lg font-medium">
            {stats?.learnedThreshold || "Не обучен"}
          </div>
        </div>
        <div className="p-3 rounded-lg border">
          <div className="text-sm text-muted-foreground">Избегаемые темы</div>
          <div className="text-lg font-medium">
            {stats?.avoidedTopics?.length || 0}
          </div>
        </div>
        <div className="p-3 rounded-lg border">
          <div className="text-sm text-muted-foreground">
            Предпочитаемые форматы
          </div>
          <div className="text-lg font-medium">
            {stats?.preferredFormats?.length || 0}
          </div>
        </div>
      </div>

      {stats?.avoidedTopics && stats.avoidedTopics.length > 0 && (
        <div className="space-y-2">
          <Label>Избегаемые темы:</Label>
          <div className="flex flex-wrap gap-2">
            {stats.avoidedTopics.slice(0, 10).map((topic, i) => (
              <Badge key={i} variant="secondary">
                {topic}
              </Badge>
            ))}
            {stats.avoidedTopics.length > 10 && (
              <Badge variant="outline">+{stats.avoidedTopics.length - 10}</Badge>
            )}
          </div>
        </div>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2"
            disabled={isResetPending}
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить обучение
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сбросить данные обучения?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит все накопленные паттерны, избегаемые темы и
              предпочитаемые форматы. Система начнёт обучение заново.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={onResetLearning}>
              Сбросить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
