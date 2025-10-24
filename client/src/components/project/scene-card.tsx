import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, TrendingUp, Lightbulb, Layers, Heart, Target, Bot } from 'lucide-react';

interface SceneRecommendation {
  id: number;
  sceneId: number;
  priority: 'high' | 'medium' | 'low';
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'general';
  currentText: string;
  suggestedText: string;
  reasoning: string;
  expectedImpact: string;
  appliedAt?: string;
  sourceAgent?: string; // AI agent that generated this recommendation
  scoreDelta?: number; // Expected score boost
  confidence?: number; // AI confidence (0-1)
}

interface SceneCardProps {
  sceneNumber: number;
  sceneId: number;
  text: string;
  recommendations: SceneRecommendation[];
  onTextChange: (sceneId: number, newText: string) => void;
  onApplyRecommendation: (recommendationId: number) => Promise<void>;
  isEditing: boolean;
  isApplyingAll?: boolean; // True when Apply All is running
}

const priorityConfig = {
  high: { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Высокий' },
  medium: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', label: 'Средний' },
  low: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'Низкий' },
};

const areaConfig = {
  hook: { icon: Sparkles, label: 'Хук', color: 'text-purple-500' },
  structure: { icon: Lightbulb, label: 'Структура', color: 'text-blue-500' },
  emotional: { icon: TrendingUp, label: 'Эмоции', color: 'text-pink-500' },
  cta: { icon: CheckCircle2, label: 'CTA', color: 'text-green-500' },
  general: { icon: Lightbulb, label: 'Общее', color: 'text-gray-500' },
};

export function SceneCard({
  sceneNumber,
  sceneId,
  text,
  recommendations,
  onTextChange,
  onApplyRecommendation,
  isEditing,
  isApplyingAll = false,
}: SceneCardProps) {
  const [localText, setLocalText] = useState(text);
  const [applyingRec, setApplyingRec] = useState<number | null>(null);

  // Sync local text when parent text changes (e.g., after applying recommendations)
  useEffect(() => {
    setLocalText(text);
  }, [text]);

  const handleBlur = () => {
    if (localText !== text) {
      onTextChange(sceneId, localText);
    }
  };

  const handleApply = async (recId: number) => {
    setApplyingRec(recId);
    try {
      await onApplyRecommendation(recId);
    } finally {
      setApplyingRec(null);
    }
  };

  const activeRecommendations = recommendations.filter(r => !r.appliedAt);

  return (
    <Card className="hover-elevate" data-testid={`card-scene-${sceneId}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {sceneNumber}
          </div>
          <h3 className="text-sm font-medium">Сцена {sceneNumber}</h3>
        </div>
        {activeRecommendations.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {activeRecommendations.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <Textarea
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          disabled={isEditing}
          className="min-h-[100px] resize-none text-sm"
          placeholder="Текст сцены..."
          data-testid={`textarea-scene-${sceneId}`}
        />

        {activeRecommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Рекомендации AI
            </div>
            {activeRecommendations.map((rec) => {
              const AreaIcon = areaConfig[rec.area].icon;
              const priorityStyle = priorityConfig[rec.priority];

              return (
                <div
                  key={rec.id}
                  className="space-y-2 rounded-md border bg-card/50 p-3"
                  data-testid={`recommendation-${rec.id}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <AreaIcon className={`h-3.5 w-3.5 ${areaConfig[rec.area].color}`} />
                      <span className="text-xs font-medium">{areaConfig[rec.area].label}</span>
                    </div>
                    <Badge variant="outline" className={`${priorityStyle.color} text-xs`}>
                      {priorityStyle.label}
                    </Badge>
                    {rec.sourceAgent && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        {rec.sourceAgent === 'hook' && (
                          <>
                            <Sparkles className="h-3 w-3" />
                            Hook Expert
                          </>
                        )}
                        {rec.sourceAgent === 'structure' && (
                          <>
                            <Layers className="h-3 w-3" />
                            Structure Analyst
                          </>
                        )}
                        {rec.sourceAgent === 'emotional' && (
                          <>
                            <Heart className="h-3 w-3" />
                            Emotional Analyst
                          </>
                        )}
                        {rec.sourceAgent === 'cta' && (
                          <>
                            <Target className="h-3 w-3" />
                            CTA Analyst
                          </>
                        )}
                        {rec.sourceAgent === 'general' && (
                          <>
                            <Bot className="h-3 w-3" />
                            AI
                          </>
                        )}
                      </Badge>
                    )}
                    {rec.scoreDelta !== undefined && rec.scoreDelta > 0 && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{rec.scoreDelta}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-medium text-muted-foreground">Текущий:</span>
                      <p className="mt-1 rounded bg-muted/50 p-2 text-muted-foreground">
                        {rec.currentText}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Предложение:
                      </span>
                      <p className="mt-1 rounded bg-green-500/10 p-2 text-foreground">
                        {rec.suggestedText}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Обоснование:</span>
                      <p className="mt-1 text-muted-foreground">{rec.reasoning}</p>
                    </div>
                    {rec.expectedImpact && (
                      <div className="flex items-start gap-1.5 rounded bg-blue-500/10 p-2">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400">
                          {rec.expectedImpact}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleApply(rec.id)}
                    disabled={applyingRec !== null || isEditing || isApplyingAll}
                    className="w-full gap-1.5"
                    data-testid={`button-apply-recommendation-${rec.id}`}
                  >
                    {applyingRec === rec.id ? (
                      <>Применяем...</>
                    ) : isApplyingAll ? (
                      <>Применяем все...</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Применить рекомендацию
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
