import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import type { AnalysisResult } from './types';

interface SceneAnalysisCardProps {
  analysisResult: AnalysisResult;
}

/**
 * Card displaying script analysis results
 */
export function SceneAnalysisCard({ analysisResult }: SceneAnalysisCardProps) {
  const { analysis, recommendations, review, cached } = analysisResult;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Результаты анализа</h2>
          {cached && (
            <Badge variant="secondary" className="text-xs">Кеш</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Общий балл</span>
            <span className="text-2xl font-bold">{analysis.overallScore}/100</span>
          </div>
          <div className="text-xs text-muted-foreground">{analysis.verdict}</div>
        </div>

        <Separator />

        {/* Breakdown scores */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Детали</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Хук:</span>
              <span className="font-medium">{analysis.breakdown.hook.score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Структура:</span>
              <span className="font-medium">{analysis.breakdown.structure.score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Эмоции:</span>
              <span className="font-medium">{analysis.breakdown.emotional.score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CTA:</span>
              <span className="font-medium">{analysis.breakdown.cta.score}</span>
            </div>
          </div>
        </div>

        {/* Recommendations count */}
        {recommendations.length > 0 && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="font-medium">{recommendations.length} рекомендаций</span>
              <span className="text-muted-foreground"> найдено</span>
            </div>
          </>
        )}

        {/* Architect Review */}
        {review && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-medium">Рецензия AI архитектора</div>
              <div className="text-xs text-muted-foreground whitespace-pre-line rounded-md bg-muted/50 p-3">
                {review}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
