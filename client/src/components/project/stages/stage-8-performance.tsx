import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Instagram, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';
import { AccountConnection } from '@/components/ig-analytics/account-connection';
import { MediaList } from '@/components/ig-analytics/media-list';
import { VersionComparison } from '@/components/ig-analytics/version-comparison';
import { AIRecommendations } from '@/components/ig-analytics/ai-recommendations';

interface IgAccount {
  id: string;
  igUserId: string;
  igUsername: string;
  tokenStatus: 'valid' | 'expiring_soon' | 'expired';
}

interface Stage8PerformanceProps {
  projectId: string;
}

export function Stage8Performance({ projectId }: Stage8PerformanceProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch Instagram accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<IgAccount[]>({
    queryKey: ['/api/ig/accounts'],
  });

  const hasAccount = accounts.length > 0;
  const activeAccount = accounts.find(acc => acc.tokenStatus === 'valid') || accounts[0];
  const hasValidToken = activeAccount?.tokenStatus === 'valid';

  // Fetch performance data for overview tab
  const { data: performanceData } = useQuery<any>({
    queryKey: ['/api/ig/projects', projectId, 'performance'],
    enabled: hasAccount && !!projectId,
  });

  const boundVersions = performanceData?.versions?.filter((v: any) => v.binding !== null) || [];
  const latestBoundVersion = boundVersions.length > 0 ? boundVersions[0] : null;

  return (
    <div className="space-y-6" data-testid="stage-8-performance">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Аналитика производительности</h2>
        <p className="text-muted-foreground">
          Сравните AI-прогнозы с реальной статистикой Instagram и получите персональные рекомендации для улучшения контента
        </p>
      </div>

      {/* Account Connection - Always visible */}
      <AccountConnection />

      {/* Content tabs - Only show if account connected */}
      {hasAccount ? (
        <>
          {/* Warning if token expired */}
          {!hasValidToken && (
            <Alert variant="destructive" data-testid="alert-token-invalid">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Токен Instagram истёк или требует обновления. Переавторизуйтесь для продолжения синхронизации данных.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4" data-testid="tabs-performance">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Обзор
              </TabsTrigger>
              <TabsTrigger value="media" data-testid="tab-media">
                <Instagram className="w-4 h-4 mr-2" />
                Публикации
              </TabsTrigger>
              <TabsTrigger value="comparison" data-testid="tab-comparison">
                <TrendingUp className="w-4 h-4 mr-2" />
                Сравнение версий
              </TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">
                <Lightbulb className="w-4 h-4 mr-2" />
                Рекомендации
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6" data-testid="tab-content-overview">
              {latestBoundVersion && latestBoundVersion.deltas ? (
                <>
                  <AIRecommendations 
                    deltas={latestBoundVersion.deltas}
                    versionNumber={latestBoundVersion.versionNumber}
                  />
                  <VersionComparison projectId={projectId} />
                </>
              ) : (
                <Alert data-testid="alert-no-data">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Привяжите опубликованный Reels к версии скрипта в разделе "Публикации", чтобы увидеть аналитику и рекомендации
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6" data-testid="tab-content-media">
              {activeAccount && (
                <MediaList 
                  accountId={activeAccount.id}
                  projectId={projectId}
                  showBindButton={false}
                />
              )}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="space-y-6" data-testid="tab-content-comparison">
              <VersionComparison projectId={projectId} />
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6" data-testid="tab-content-recommendations">
              {latestBoundVersion && latestBoundVersion.deltas ? (
                <AIRecommendations 
                  deltas={latestBoundVersion.deltas}
                  versionNumber={latestBoundVersion.versionNumber}
                />
              ) : (
                <Alert data-testid="alert-no-recommendations">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Недостаточно данных для генерации рекомендаций. Привяжите опубликованный Reels к версии скрипта в разделе "Публикации"
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        // No account connected - Show call to action
        !isLoadingAccounts && (
          <Alert data-testid="alert-connect-account">
            <Instagram className="h-4 w-4" />
            <AlertDescription>
              Подключите Instagram Business аккаунт выше, чтобы начать отслеживать статистику публикаций
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
}
