import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface Delta {
  predicted: number;
  actual: number;
  delta: number;
  deltaPercent: number;
}

interface AIRecommendationsProps {
  deltas: Record<string, Delta> | null;
  versionNumber?: number;
}

interface Recommendation {
  id: string;
  category: 'hook' | 'structure' | 'cta' | 'emotional' | 'general';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metricKey?: string;
  deltaPercent?: number;
}

export function AIRecommendations({ deltas, versionNumber }: AIRecommendationsProps) {
  // Generate AI recommendations based on deltas
  const generateRecommendations = (): Recommendation[] => {
    if (!deltas) return [];

    const recommendations: Recommendation[] = [];

    // Analyze plays/views
    const playsKey = 'plays' in deltas ? 'plays' : 'views' in deltas ? 'views' : null;
    if (playsKey && deltas[playsKey]) {
      const playsDelta = deltas[playsKey];
      if (playsDelta.deltaPercent < -20) {
        recommendations.push({
          id: 'plays-low',
          category: 'hook',
          severity: 'high',
          title: 'Низкая досмотрность',
          description: 'Реальные просмотры на ' + Math.abs(playsDelta.deltaPercent).toFixed(0) + '% ниже прогноза. Усильте хук в первые 3 секунды: используйте провокационный вопрос, эффект незавершённости или контрастное заявление.',
          metricKey: playsKey,
          deltaPercent: playsDelta.deltaPercent,
        });
      }
    }

    // Analyze likes
    if (deltas.likes) {
      const likesDelta = deltas.likes;
      if (likesDelta.deltaPercent < -15) {
        recommendations.push({
          id: 'likes-low',
          category: 'emotional',
          severity: 'medium',
          title: 'Низкое эмоциональное вовлечение',
          description: 'Лайков на ' + Math.abs(likesDelta.deltaPercent).toFixed(0) + '% меньше ожидаемого. Добавьте эмоциональные триггеры: личные истории, противоречия, неожиданные факты. Используйте rule of three для запоминаемости.',
          metricKey: 'likes',
          deltaPercent: likesDelta.deltaPercent,
        });
      } else if (likesDelta.deltaPercent > 30) {
        recommendations.push({
          id: 'likes-high',
          category: 'emotional',
          severity: 'low',
          title: 'Высокое эмоциональное вовлечение',
          description: 'Лайков на ' + Math.abs(likesDelta.deltaPercent).toFixed(0) + '% больше! Эмоциональная подача сработала отлично. Зафиксируйте паттерн: сохраните тональность, тип триггера и структуру для следующих версий.',
          metricKey: 'likes',
          deltaPercent: likesDelta.deltaPercent,
        });
      }
    }

    // Analyze comments
    if (deltas.comments) {
      const commentsDelta = deltas.comments;
      if (commentsDelta.deltaPercent < -20) {
        recommendations.push({
          id: 'comments-low',
          category: 'cta',
          severity: 'medium',
          title: 'Слабый призыв к действию',
          description: 'Комментариев на ' + Math.abs(commentsDelta.deltaPercent).toFixed(0) + '% ниже прогноза. Используйте прямой CTA: "Пиши в комментах", "Какой вариант выбрал бы ты?", "Согласен? Напиши +". Создайте спорную тему или дайте 2-3 варианта ответа.',
          metricKey: 'comments',
          deltaPercent: commentsDelta.deltaPercent,
        });
      }
    }

    // Analyze shares
    if (deltas.shares) {
      const sharesDelta = deltas.shares;
      if (sharesDelta.deltaPercent < -25) {
        recommendations.push({
          id: 'shares-low',
          category: 'structure',
          severity: 'high',
          title: 'Низкая виральность контента',
          description: 'Репостов на ' + Math.abs(sharesDelta.deltaPercent).toFixed(0) + '% меньше ожидаемого. Добавьте shareability: практическую пользу ("Сохрани, чтобы не потерять"), социальную значимость или информационную бомбу. Сделайте контент "обязательным к пересылке".',
          metricKey: 'shares',
          deltaPercent: sharesDelta.deltaPercent,
        });
      }
    }

    // Analyze saves
    if (deltas.saves) {
      const savesDelta = deltas.saves;
      if (savesDelta.deltaPercent < -20) {
        recommendations.push({
          id: 'saves-low',
          category: 'structure',
          severity: 'medium',
          title: 'Недостаточная практическая ценность',
          description: 'Сохранений на ' + Math.abs(savesDelta.deltaPercent).toFixed(0) + '% ниже. Добавьте чек-листы, конкретные цифры, пошаговые инструкции. Завершите фразой "Сохрани, пригодится" или "Скриншоть, важно".',
          metricKey: 'saves',
          deltaPercent: savesDelta.deltaPercent,
        });
      }
    }

    // General recommendation if multiple metrics underperformed
    const underperformingMetrics = Object.entries(deltas).filter(([_, delta]) => delta.deltaPercent < -15);
    if (underperformingMetrics.length >= 3) {
      recommendations.push({
        id: 'general-review',
        category: 'general',
        severity: 'high',
        title: 'Комплексная переработка скрипта',
        description: 'Множественные метрики ниже прогноза. Рекомендуется полная ревизия: пересмотрите хук (первые 3 сек), структуру подачи, эмоциональные триггеры и CTA. Проанализируйте успешные версии конкурентов в вашей нише.',
      });
    }

    // If all metrics exceeded expectations
    const overperformingMetrics = Object.entries(deltas).filter(([_, delta]) => delta.deltaPercent > 20);
    if (overperformingMetrics.length >= 3) {
      recommendations.push({
        id: 'general-success',
        category: 'general',
        severity: 'low',
        title: 'Успешная формула контента',
        description: 'Большинство метрик превысили прогноз! Зафиксируйте победную формулу: сохраните хук-паттерн, структуру, тональность и CTA. Используйте эту версию как шаблон для будущих скриптов.',
      });
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  };

  const recommendations = generateRecommendations();

  // Get severity badge
  const getSeverityBadge = (severity: 'high' | 'medium' | 'low') => {
    if (severity === 'high') {
      return (
        <Badge variant="destructive" className="text-xs">
          Критично
        </Badge>
      );
    }
    
    if (severity === 'medium') {
      return (
        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
          Важно
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs border-green-600 text-green-700 dark:text-green-400">
        Успех
      </Badge>
    );
  };

  // Get category icon
  const getCategoryIcon = (category: Recommendation['category']) => {
    const icons = {
      hook: '🎣',
      structure: '📐',
      cta: '📣',
      emotional: '❤️',
      general: '💡',
    };
    return icons[category];
  };

  // Get trend icon
  const getTrendIcon = (deltaPercent: number | undefined) => {
    if (!deltaPercent) return null;
    if (deltaPercent > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  if (!deltas || Object.keys(deltas).length === 0) {
    return (
      <Card data-testid="card-ai-recommendations-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            AI-рекомендации
          </CardTitle>
          <CardDescription>
            Персональные советы для улучшения контента
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <div className="font-medium">Недостаточно данных</div>
            <div className="text-sm text-muted-foreground max-w-md">
              Дождитесь синхронизации реальной статистики, чтобы получить персональные рекомендации от AI
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card data-testid="card-ai-recommendations-no-issues">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            AI-рекомендации
          </CardTitle>
          <CardDescription>
            {versionNumber ? `Версия ${versionNumber}` : 'Персональные советы для улучшения контента'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="font-medium">Отличный результат!</div>
            <div className="text-sm text-muted-foreground max-w-md">
              Все метрики соответствуют или превышают прогнозы. Продолжайте в том же духе!
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-ai-recommendations">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          AI-рекомендации
        </CardTitle>
        <CardDescription>
          {versionNumber ? `Версия ${versionNumber} • ` : ''}{recommendations.length} {recommendations.length === 1 ? 'рекомендация' : 'рекомендаций'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className="p-4 border rounded-md space-y-2"
              data-testid={`recommendation-${rec.id}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(rec.category)}</span>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {rec.title}
                      {rec.deltaPercent !== undefined && getTrendIcon(rec.deltaPercent)}
                    </div>
                    {rec.metricKey && rec.deltaPercent !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Отклонение: {rec.deltaPercent > 0 ? '+' : ''}{rec.deltaPercent.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
                {getSeverityBadge(rec.severity)}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rec.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              Рекомендации основаны на анализе отклонений между AI-прогнозами и реальной статистикой. 
              Применяйте советы последовательно и отслеживайте изменения метрик в новых версиях.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
