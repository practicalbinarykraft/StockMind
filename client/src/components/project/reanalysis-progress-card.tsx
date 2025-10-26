import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface ReanalysisProgressCardProps {
  status: 'queued' | 'running' | 'done' | 'error';
  step?: 'hook' | 'structure' | 'emotional' | 'cta' | 'synthesis' | 'saving';
  progress?: number;
  error?: string;
  canRetry?: boolean;
  onRetry?: () => void;
}

const stepLabels: Record<string, string> = {
  hook: 'Анализируем: Хук',
  structure: 'Анализируем: Структура',
  emotional: 'Анализируем: Эмоции',
  cta: 'Анализируем: CTA',
  synthesis: 'Формируем оценку',
  saving: 'Сохраняем результаты'
};

export function ReanalysisProgressCard({
  status,
  step,
  progress = 0,
  error,
  canRetry,
  onRetry
}: ReanalysisProgressCardProps) {
  if (status === 'done') {
    return null; // Don't show card when done
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {status === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              Ошибка пересчета
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              Пересчет сценария
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'error' ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            {canRetry && onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="button-retry-reanalysis"
              >
                Попробовать снова
              </Button>
            )}
          </>
        ) : (
          <>
            <div>
              <div className="text-sm font-medium mb-1">
                {status === 'queued' ? 'Задача в очереди...' : `Шаг: ${step ? stepLabels[step] || step : 'Инициализация'}`}
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(progress)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Не закрывайте страницу — мы сохраним результат автоматически.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
