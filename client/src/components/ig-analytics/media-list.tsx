import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  RefreshCw, 
  ExternalLink,
  Link as LinkIcon,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/query-client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IgMedia {
  id: string;
  igMediaId: string;
  igAccountId: string;
  permalink: string;
  mediaType: string;
  caption: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

interface IgMediaMetrics {
  plays?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  impressions?: number;
}

interface IgMediaInsight {
  id: string;
  igMediaId: string;
  metrics: IgMediaMetrics;
  collectedAt: string;
}

interface MediaListProps {
  accountId: string;
  projectId?: string;
  versionId?: string;
  onBindMedia?: (igMediaId: string) => void;
  showBindButton?: boolean;
}

export function MediaList({ 
  accountId, 
  projectId, 
  versionId,
  onBindMedia,
  showBindButton = false 
}: MediaListProps) {
  const { toast } = useToast();
  const [expandedMedia, setExpandedMedia] = useState<string | null>(null);

  // Fetch media list
  const { data: mediaData, isLoading } = useQuery<{ data: IgMedia[] }>({
    queryKey: ['/api/ig', accountId, 'media'],
    enabled: !!accountId,
  });

  const mediaList = mediaData?.data || [];

  // Sync media mutation
  const syncMediaMutation = useMutation({
    mutationFn: async (igMediaId: string) => {
      await apiRequest('POST', `/api/ig/media/${igMediaId}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ig', accountId, 'media'] });
      toast({
        title: 'Синхронизация запущена',
        description: 'Статистика публикации обновляется',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось запустить синхронизацию',
      });
    },
  });

  // Fetch insights for expanded media
  const { data: insightsData } = useQuery<{ insights: IgMediaInsight[]; latestMetrics: IgMediaMetrics | null }>({
    queryKey: ['/api/ig/media', expandedMedia, 'insights'],
    enabled: !!expandedMedia,
  });

  const handleSync = (igMediaId: string) => {
    syncMediaMutation.mutate(igMediaId);
  };

  const handleBind = (igMediaId: string) => {
    if (onBindMedia) {
      onBindMedia(igMediaId);
    }
  };

  const toggleExpand = (mediaId: string) => {
    setExpandedMedia(expandedMedia === mediaId ? null : mediaId);
  };

  // Format metrics
  const formatMetric = (value: number | undefined): string => {
    if (!value) return '—';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Get sync status badge
  const getSyncStatusBadge = (media: IgMedia) => {
    if (media.syncStatus === 'syncing') {
      return (
        <Badge variant="outline" className="gap-1" data-testid={`badge-sync-syncing-${media.id}`}>
          <RefreshCw className="w-3 h-3 animate-spin" />
          Синхронизация
        </Badge>
      );
    }
    
    if (media.syncStatus === 'error') {
      return (
        <Badge variant="destructive" className="gap-1" data-testid={`badge-sync-error-${media.id}`}>
          <AlertCircle className="w-3 h-3" />
          Ошибка
        </Badge>
      );
    }

    if (media.lastSyncAt) {
      const syncDate = new Date(media.lastSyncAt);
      const relativeTime = format(syncDate, 'HH:mm', { locale: ru });
      return (
        <Badge variant="outline" className="gap-1 border-green-600 text-green-700 dark:text-green-400" data-testid={`badge-sync-success-${media.id}`}>
          <CheckCircle className="w-3 h-3" />
          Синхронизирован {relativeTime}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1" data-testid={`badge-sync-idle-${media.id}`}>
        <Clock className="w-3 h-3" />
        Ожидание
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card data-testid="card-media-list-loading">
        <CardHeader>
          <CardTitle>Публикации Instagram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mediaList.length === 0) {
    return (
      <Card data-testid="card-media-list-empty">
        <CardHeader>
          <CardTitle>Публикации Instagram</CardTitle>
          <CardDescription>
            Список ваших Reels для привязки к скриптам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Публикации не найдены
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-media-list">
      <CardHeader>
        <CardTitle>Публикации Instagram</CardTitle>
        <CardDescription>
          {mediaList.length} {mediaList.length === 1 ? 'публикация' : 'публикаций'} синхронизировано
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mediaList.map((media) => {
            const isExpanded = expandedMedia === media.id;
            const latestMetrics = isExpanded ? insightsData?.latestMetrics : null;

            return (
              <div
                key={media.id}
                className="border rounded-md overflow-hidden"
                data-testid={`media-card-${media.id}`}
              >
                {/* Media header */}
                <div 
                  className="flex items-start gap-4 p-4 cursor-pointer hover-elevate"
                  onClick={() => toggleExpand(media.id)}
                  data-testid={`media-header-${media.id}`}
                >
                  {/* Thumbnail */}
                  {media.thumbnailUrl ? (
                    <img
                      src={media.thumbnailUrl}
                      alt={media.caption || 'Instagram Reel'}
                      className="w-20 h-20 object-cover rounded"
                      data-testid={`img-thumbnail-${media.id}`}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                      <Eye className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-medium truncate" data-testid={`text-caption-${media.id}`}>
                        {media.caption ? (
                          media.caption.length > 100 
                            ? `${media.caption.slice(0, 100)}...` 
                            : media.caption
                        ) : (
                          <span className="text-muted-foreground italic">Без описания</span>
                        )}
                      </div>
                      {getSyncStatusBadge(media)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1" data-testid={`text-published-${media.id}`}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(media.publishedAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </div>
                      <Badge variant="outline" className="text-xs" data-testid={`badge-media-type-${media.id}`}>
                        {media.mediaType}
                      </Badge>
                    </div>

                    {/* Quick metrics preview */}
                    {latestMetrics && (
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        {latestMetrics.plays !== undefined && (
                          <div className="flex items-center gap-1" data-testid={`metric-plays-${media.id}`}>
                            <Eye className="w-4 h-4" />
                            {formatMetric(latestMetrics.plays)}
                          </div>
                        )}
                        {latestMetrics.likes !== undefined && (
                          <div className="flex items-center gap-1" data-testid={`metric-likes-${media.id}`}>
                            <Heart className="w-4 h-4" />
                            {formatMetric(latestMetrics.likes)}
                          </div>
                        )}
                        {latestMetrics.comments !== undefined && (
                          <div className="flex items-center gap-1" data-testid={`metric-comments-${media.id}`}>
                            <MessageCircle className="w-4 h-4" />
                            {formatMetric(latestMetrics.comments)}
                          </div>
                        )}
                        {latestMetrics.shares !== undefined && (
                          <div className="flex items-center gap-1" data-testid={`metric-shares-${media.id}`}>
                            <Share2 className="w-4 h-4" />
                            {formatMetric(latestMetrics.shares)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t bg-muted/50 p-4 space-y-4" data-testid={`media-details-${media.id}`}>
                    {/* Full metrics */}
                    {latestMetrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {latestMetrics.plays !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Просмотры</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.plays)}</div>
                          </div>
                        )}
                        {latestMetrics.likes !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Лайки</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.likes)}</div>
                          </div>
                        )}
                        {latestMetrics.comments !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Комментарии</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.comments)}</div>
                          </div>
                        )}
                        {latestMetrics.shares !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Репосты</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.shares)}</div>
                          </div>
                        )}
                        {latestMetrics.saves !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Сохранения</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.saves)}</div>
                          </div>
                        )}
                        {latestMetrics.reach !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Охват</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.reach)}</div>
                          </div>
                        )}
                        {latestMetrics.impressions !== undefined && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Показы</div>
                            <div className="text-xl font-semibold">{formatMetric(latestMetrics.impressions)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(media.permalink, '_blank');
                        }}
                        data-testid={`button-view-post-${media.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть в Instagram
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSync(media.igMediaId);
                        }}
                        disabled={syncMediaMutation.isPending || media.syncStatus === 'syncing'}
                        data-testid={`button-sync-${media.id}`}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncMediaMutation.isPending ? 'animate-spin' : ''}`} />
                        Обновить статистику
                      </Button>

                      {showBindButton && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBind(media.igMediaId);
                          }}
                          data-testid={`button-bind-${media.id}`}
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Привязать к скрипту
                        </Button>
                      )}
                    </div>

                    {/* Insights history count */}
                    {insightsData && insightsData.insights.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {insightsData.insights.length} {insightsData.insights.length === 1 ? 'точка' : 'точек'} данных синхронизировано
                      </div>
                    )}
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
