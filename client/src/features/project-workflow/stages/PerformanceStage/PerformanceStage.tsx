import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Instagram,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  Settings,
  Check,
  AlertTriangle,
} from "lucide-react";
import { MediaList } from "@/features/instagram/components/MediaList";
import { VersionComparison } from "@/features/instagram/components/VersionComparison";
import { AIRecommendations } from "@/features/instagram/components/AIRecommendations";

interface IgAccount {
  id: string;
  igUserId: string;
  igUsername: string;
  tokenStatus: "valid" | "expiring_soon" | "expired";
}

import { useStageData } from "../../hooks/useStageData";

export function Stage8Performance() {
  const { project } = useStageData();
  const projectId = project.id;
  
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [, navigate] = useLocation();

  // Fetch Instagram accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<
    IgAccount[]
  >({
    queryKey: ["/api/ig/accounts"],
  });

  const hasAccount = accounts.length > 0;
  const activeAccount =
    accounts.find((acc) => acc.tokenStatus === "valid") || accounts[0];
  const hasValidToken = activeAccount?.tokenStatus === "valid";

  // Get token status badge
  const getTokenStatusBadge = (account: IgAccount) => {
    if (account.tokenStatus === "expired") {
      return (
        <Badge
          variant="destructive"
          className="gap-1"
          data-testid="badge-token-expired"
        >
          <AlertCircle className="w-3 h-3" />
          Токен истёк
        </Badge>
      );
    }

    if (account.tokenStatus === "expiring_soon") {
      return (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500 text-amber-600 dark:text-amber-400"
          data-testid="badge-token-expiring"
        >
          <AlertTriangle className="w-3 h-3" />
          Скоро истечёт
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-600 text-green-700 dark:text-green-400"
        data-testid="badge-token-valid"
      >
        <Check className="w-3 h-3" />
        Активен
      </Badge>
    );
  };

  // Fetch performance data for overview tab
  const { data: performanceData } = useQuery<any>({
    queryKey: ["/api/ig/projects", projectId, "performance"],
    enabled: hasAccount && !!projectId,
  });

  const boundVersions =
    performanceData?.versions?.filter((v: any) => v.binding !== null) || [];
  const latestBoundVersion = boundVersions.length > 0 ? boundVersions[0] : null;

  return (
    <div className="space-y-6" data-testid="stage-8-performance">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          Аналитика производительности
        </h2>
        <p className="text-muted-foreground">
          Сравните AI-прогнозы с реальной статистикой Instagram и получите
          персональные рекомендации для улучшения контента
        </p>
      </div>

      {/* Instagram Account Status */}
      {!hasAccount && !isLoadingAccounts ? (
        <Alert data-testid="alert-no-account">
          <Instagram className="h-4 w-4" />
          <AlertTitle>Instagram аккаунт не подключен</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              Для отслеживания статистики публикаций необходимо подключить
              Instagram Business аккаунт через Facebook OAuth
            </p>
            <Button
              size="sm"
              variant="default"
              className="gap-2"
              onClick={() => navigate("/settings")}
              data-testid="button-go-to-settings"
            >
              <Settings className="w-4 h-4" />
              Перейти в настройки
            </Button>
          </AlertDescription>
        </Alert>
      ) : hasAccount ? (
        <Card data-testid="card-account-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="w-5 h-5" />
              Подключённый аккаунт
            </CardTitle>
            <CardDescription>
              Instagram Business аккаунт для синхронизации статистики
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-pink-600" />
                <div>
                  <div
                    className="font-medium"
                    data-testid="text-connected-username"
                  >
                    @{activeAccount.igUsername}
                  </div>
                  <div
                    className="text-sm text-muted-foreground"
                    data-testid="text-connected-user-id"
                  >
                    ID: {activeAccount.igUserId}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getTokenStatusBadge(activeAccount)}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate("/settings")}
                  data-testid="button-manage-in-settings"
                >
                  <Settings className="w-4 h-4" />
                  Управление
                </Button>
              </div>
            </div>
            {!hasValidToken && (
              <Alert
                variant="destructive"
                className="mt-4"
                data-testid="alert-token-warning"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Токен истёк или требует обновления. Переавторизуйтесь в
                  настройках для продолжения синхронизации данных.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Content tabs - Only show if account connected */}
      {hasAccount ? (
        <>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList
              className="grid w-full grid-cols-4"
              data-testid="tabs-performance"
            >
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
              <TabsTrigger
                value="recommendations"
                data-testid="tab-recommendations"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Рекомендации
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent
              value="overview"
              className="space-y-6"
              data-testid="tab-content-overview"
            >
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
                    Привяжите опубликованный Reels к версии скрипта в разделе
                    "Публикации", чтобы увидеть аналитику и рекомендации
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Media Tab */}
            <TabsContent
              value="media"
              className="space-y-6"
              data-testid="tab-content-media"
            >
              {activeAccount && (
                <MediaList
                  accountId={activeAccount.id}
                  projectId={projectId}
                  showBindButton={false}
                />
              )}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent
              value="comparison"
              className="space-y-6"
              data-testid="tab-content-comparison"
            >
              <VersionComparison projectId={projectId} />
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent
              value="recommendations"
              className="space-y-6"
              data-testid="tab-content-recommendations"
            >
              {latestBoundVersion && latestBoundVersion.deltas ? (
                <AIRecommendations
                  deltas={latestBoundVersion.deltas}
                  versionNumber={latestBoundVersion.versionNumber}
                />
              ) : (
                <Alert data-testid="alert-no-recommendations">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Недостаточно данных для генерации рекомендаций. Привяжите
                    опубликованный Reels к версии скрипта в разделе "Публикации"
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
