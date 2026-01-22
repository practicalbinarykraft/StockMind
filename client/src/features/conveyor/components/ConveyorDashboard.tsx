import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Factory,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  Settings,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { AgentThinkingSidebar } from "./AgentThinkingSidebar";

interface DashboardData {
  enabled: boolean;
  todayProgress: {
    processed: number;
    limit: number;
    percentage: number;
  };
  budget: {
    used: string;
    limit: string;
    percentage: number;
  };
  stats: {
    totalProcessed: number;
    totalPassed: number;
    totalFailed: number;
    passRate: string;
    totalApproved: number;
    totalRejected: number;
    approvalRate: string | null;
  };
  pendingReview: {
    count: number;
    scripts: Array<{
      id: string;
      title: string;
      formatName: string;
      finalScore: number;
      createdAt: string;
    }>;
  };
  recentItems: Array<{
    id: string;
    sourceType: string;
    status: string;
    currentStage: number;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
  failedCount: number;
  learning: {
    learnedThreshold: number | null;
    avoidedTopicsCount: number;
    preferredFormatsCount: number;
  };
  processingCount: number;
}

interface ConveyorItem {
  id: string;
  sourceType: string;
  sourceItemId: string;
  status: string;
  currentStage: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  errorStage: number | null;
  retryCount: number;
}

const STAGE_NAMES: Record<number, string> = {
  1: "Scout",
  2: "Scorer",
  3: "Analyst",
  4: "Architect",
  5: "Writer",
  6: "QC",
  7: "Optimizer",
  8: "Gate",
  9: "Delivery",
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  processing: { icon: Clock, color: "text-blue-500", label: "В обработке" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "Завершён" },
  failed: { icon: XCircle, color: "text-red-500", label: "Ошибка" },
  cancelled: { icon: AlertCircle, color: "text-gray-500", label: "Отменён" },
};

export function ConveyorDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["conveyor-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/conveyor/dashboard", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent items
  const { data: items, isLoading: itemsLoading } = useQuery<ConveyorItem[]>({
    queryKey: ["conveyor-items"],
    queryFn: async () => {
      const res = await fetch("/api/conveyor/items?limit=20", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Trigger mutation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/conveyor/trigger", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["conveyor-items"] });
      toast({
        title: "Конвейер запущен",
        description: "Обработка началась в фоновом режиме",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pause/Stop mutation (sets enabled: false)
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/conveyor/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: false }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-dashboard"] });
      toast({
        title: "Конвейер остановлен",
        description: "Новые элементы не будут добавляться. Текущие задачи завершатся.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/conveyor/items/${itemId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-items"] });
      toast({
        title: "Повтор запущен",
        description: "Элемент будет обработан заново",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b -mt-6 -mx-6 mb-6">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Content Factory</h1>
            </div>
            <Badge variant={dashboard?.enabled ? "default" : "secondary"}>
              {dashboard?.enabled ? "Активен" : "Выключен"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => triggerMutation.mutate()}
              disabled={
                triggerMutation.isPending ||
                dashboard?.enabled ||
                (dashboard?.processingCount || 0) > 0 ||
                (dashboard?.todayProgress.processed || 0) >=
                  (dashboard?.todayProgress.limit || 10) ||
                parseFloat(dashboard?.budget.used || "0") >=
                  parseFloat(dashboard?.budget.limit || "0")
              }
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Запустить
            </Button>
            {dashboard?.enabled && (
              <Button
                variant="destructive"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Остановить
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Настройки
            </Button>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Today's Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Сегодня
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.todayProgress.processed}/
              {dashboard?.todayProgress.limit}
            </div>
            <Progress
              value={dashboard?.todayProgress.percentage || 0}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Бюджет (месяц)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboard?.budget.used}
              <span className="text-muted-foreground text-sm">
                /${dashboard?.budget.limit}
              </span>
            </div>
            <Progress
              value={dashboard?.budget.percentage || 0}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Pass Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pass Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.stats.passRate || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.stats.totalPassed} из {dashboard?.stats.totalProcessed}
            </p>
          </CardContent>
        </Card>

        {/* Pending Review */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate("/auto-scripts")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              На ревью
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.pendingReview.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Нажмите для просмотра
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent Thinking Sidebar */}
        <AgentThinkingSidebar className="lg:col-span-1 h-[500px]" />

        {/* Recent Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Последние элементы</CardTitle>
            <CardDescription>
              История обработки контента
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {itemsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item) => {
                    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.processing;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-5 w-5 ${config.color}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.sourceType}
                              </Badge>
                              <span className="text-sm font-medium">
                                Stage {item.currentStage}:{" "}
                                {STAGE_NAMES[item.currentStage]}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.startedAt), {
                                addSuffix: true,
                                locale: ru,
                              })}
                              {item.errorMessage && (
                                <span className="text-red-500 ml-2">
                                  {item.errorMessage}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {item.status === "failed" && item.retryCount < 3 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => retryMutation.mutate(item.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет обработанных элементов</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Pending Scripts Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Сценарии на ревью</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.pendingReview.scripts &&
              dashboard.pendingReview.scripts.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.pendingReview.scripts.map((script) => (
                    <div
                      key={script.id}
                      className="p-2 rounded border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate("/auto-scripts")}
                    >
                      <div className="font-medium text-sm line-clamp-1">
                        {script.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {script.formatName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Score: {script.finalScore}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dashboard.pendingReview.count > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => navigate("/auto-scripts")}
                    >
                      Показать все ({dashboard.pendingReview.count})
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет сценариев на ревью
                </p>
              )}
            </CardContent>
          </Card>

          {/* Learning Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Система обучения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Адаптивный порог
                </span>
                <span className="font-medium">
                  {dashboard?.learning.learnedThreshold || "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Избегаемые темы
                </span>
                <span className="font-medium">
                  {dashboard?.learning.avoidedTopicsCount || 0}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Предпочитаемые форматы
                </span>
                <span className="font-medium">
                  {dashboard?.learning.preferredFormatsCount || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold">
                    {dashboard?.stats.totalProcessed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Обработано
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {dashboard?.stats.totalApproved || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Одобрено
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">
                    {dashboard?.failedCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    С ошибками
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {dashboard?.stats.approvalRate || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Approval Rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
