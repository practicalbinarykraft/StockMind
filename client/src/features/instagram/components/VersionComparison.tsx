import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface VersionPerformance {
  versionId: string;
  versionNumber: number;
  isCurrent: boolean;
  createdAt: string;
  predictedMetrics: Record<string, number> | null;
  actualMetrics: Record<string, number> | null;
  deltas: Record<string, {
    predicted: number;
    actual: number;
    delta: number;
    deltaPercent: number;
  }> | null;
  binding: {
    id: string;
    igMediaId: string;
    bindType: string;
    createdAt: string;
  } | null;
  latestInsightCollectedAt: string | null;
}

interface PerformanceData {
  projectId: string;
  versions: VersionPerformance[];
}

interface VersionComparisonProps {
  projectId: string;
}

export function VersionComparison({ projectId }: VersionComparisonProps) {
  // Fetch performance data
  const { data: performanceData, isLoading } = useQuery<PerformanceData>({
    queryKey: ['/api/ig/projects', projectId, 'performance'],
    enabled: !!projectId,
  });

  const versions = performanceData?.versions || [];
  const boundVersions = versions.filter(v => v.binding !== null);

  // Format number
  const formatNumber = (value: number | undefined): string => {
    if (!value) return '—';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('ru-RU');
  };

  // Get delta badge
  const getDeltaBadge = (deltaPercent: number) => {
    const absPercent = Math.abs(deltaPercent);
    
    if (deltaPercent > 20) {
      return (
        <Badge variant="outline" className="gap-1 border-green-600 text-green-700 dark:text-green-400">
          <TrendingUp className="w-3 h-3" />
          +{absPercent.toFixed(0)}%
        </Badge>
      );
    }
    
    if (deltaPercent < -20) {
      return (
        <Badge variant="outline" className="gap-1 border-red-600 text-red-700 dark:text-red-400">
          <TrendingDown className="w-3 h-3" />
          −{absPercent.toFixed(0)}%
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="w-3 h-3" />
        {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(0)}%
      </Badge>
    );
  };

  // Get sync status badge
  const getSyncStatusBadge = (version: VersionPerformance) => {
    if (!version.binding) {
      return (
        <Badge variant="outline" className="text-xs" data-testid={`badge-status-unbound-${version.versionId}`}>
          Не привязана
        </Badge>
      );
    }

    if (!version.actualMetrics) {
      return (
        <Badge variant="outline" className="gap-1 text-xs" data-testid={`badge-status-pending-${version.versionId}`}>
          <Clock className="w-3 h-3" />
          Ожидание синхронизации
        </Badge>
      );
    }

    if (version.latestInsightCollectedAt) {
      const syncDate = new Date(version.latestInsightCollectedAt);
      return (
        <Badge variant="outline" className="gap-1 text-xs border-green-600 text-green-700 dark:text-green-400" data-testid={`badge-status-synced-${version.versionId}`}>
          <CheckCircle className="w-3 h-3" />
          Синхронизировано {format(syncDate, 'HH:mm', { locale: ru })}
        </Badge>
      );
    }

    return null;
  };

  // Get metric icon
  const getMetricIcon = (metricKey: string) => {
    switch (metricKey) {
      case 'plays':
      case 'views':
        return <Eye className="w-4 h-4" />;
      case 'likes':
        return <Heart className="w-4 h-4" />;
      case 'comments':
        return <MessageCircle className="w-4 h-4" />;
      case 'shares':
        return <Share2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get metric label (Russian)
  const getMetricLabel = (metricKey: string): string => {
    const labels: Record<string, string> = {
      plays: 'Просмотры',
      views: 'Просмотры',
      likes: 'Лайки',
      comments: 'Комментарии',
      shares: 'Репосты',
      saves: 'Сохранения',
      reach: 'Охват',
      impressions: 'Показы',
    };
    return labels[metricKey] || metricKey;
  };

  if (isLoading) {
    return (
      <Card data-testid="card-version-comparison-loading">
        <CardHeader>
          <CardTitle>Сравнение версий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (boundVersions.length === 0) {
    return (
      <Card data-testid="card-version-comparison-empty">
        <CardHeader>
          <CardTitle>Сравнение версий</CardTitle>
          <CardDescription>
            Прогнозы AI vs реальная статистика Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <div className="font-medium">Нет привязанных версий</div>
            <div className="text-sm text-muted-foreground max-w-md">
              Привяжите опубликованные Reels к версиям скрипта, чтобы увидеть сравнение прогнозов AI с реальной статистикой
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-version-comparison">
      <CardHeader>
        <CardTitle>Сравнение версий</CardTitle>
        <CardDescription>
          Прогнозы AI vs реальная статистика Instagram • {boundVersions.length} {boundVersions.length === 1 ? 'версия' : 'версий'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {boundVersions.map((version) => {
            const hasActualMetrics = version.actualMetrics !== null;
            const hasPredictedMetrics = version.predictedMetrics !== null;
            const hasComparison = version.deltas !== null;

            return (
              <div
                key={version.versionId}
                className="border rounded-md p-4 space-y-4"
                data-testid={`version-card-${version.versionId}`}
              >
                {/* Version header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium" data-testid={`text-version-${version.versionId}`}>
                        Версия {version.versionNumber}
                      </div>
                      {version.isCurrent && (
                        <Badge variant="default" className="text-xs">Текущая</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Создана {format(new Date(version.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                    </div>
                  </div>
                  {getSyncStatusBadge(version)}
                </div>

                {/* Metrics comparison */}
                {hasComparison && version.deltas && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(version.deltas).map(([metricKey, delta]) => (
                      <div
                        key={metricKey}
                        className="space-y-2 p-3 rounded-md bg-muted/50"
                        data-testid={`metric-card-${version.versionId}-${metricKey}`}
                      >
                        {/* Metric name */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getMetricIcon(metricKey)}
                          {getMetricLabel(metricKey)}
                        </div>

                        {/* Values */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Прогноз:</span>
                            <span className="text-sm font-medium" data-testid={`text-predicted-${version.versionId}-${metricKey}`}>
                              {formatNumber(delta.predicted)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Факт:</span>
                            <span className="text-sm font-semibold" data-testid={`text-actual-${version.versionId}-${metricKey}`}>
                              {formatNumber(delta.actual)}
                            </span>
                          </div>
                        </div>

                        {/* Delta */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Отклонение:</span>
                          {getDeltaBadge(delta.deltaPercent)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Only predicted metrics (no actual yet) */}
                {!hasComparison && hasPredictedMetrics && version.predictedMetrics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(version.predictedMetrics).map(([metricKey, predictedValue]) => (
                      <div
                        key={metricKey}
                        className="space-y-2 p-3 rounded-md bg-muted/50"
                        data-testid={`metric-predicted-only-${version.versionId}-${metricKey}`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getMetricIcon(metricKey)}
                          {getMetricLabel(metricKey)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Прогноз:</span>
                            <span className="text-sm font-medium">
                              {formatNumber(predictedValue)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Факт:</span>
                            <span className="text-sm text-muted-foreground">—</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 pt-2 border-t text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Ожидание данных
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No predicted metrics at all */}
                {!hasPredictedMetrics && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Прогнозы AI недоступны для этой версии
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
