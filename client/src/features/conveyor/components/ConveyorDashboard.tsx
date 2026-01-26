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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Спарсено новостей */}
        <div className="glass rounded-xl p-6 glow-border hover-lift transition-transform relative overflow-hidden group min-w-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10 group-hover:scale-110 transition-transform flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-right min-w-0 flex-1 ml-2">
                <div className="text-3xl font-bold">{dashboard?.todayProgress.processed || 0}</div>
                <div className="text-sm text-muted-foreground mt-1 truncate">Спарсено новостей</div>
              </div>
            </div>
          </div>
        </div>

        {/* Проанализировано */}
        <div className="glass rounded-xl p-6 glow-border hover-lift transition-transform relative overflow-hidden group min-w-0">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500/10 group-hover:scale-110 transition-transform flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-right min-w-0 flex-1 ml-2">
                <div className="text-3xl font-bold">{dashboard?.stats.totalPassed || 0}</div>
                <div className="text-sm text-muted-foreground mt-1 truncate">Проанализировано</div>
              </div>
            </div>
          </div>
        </div>

        {/* Сценариев написано */}
        <div 
          onClick={() => navigate("/conveyor/scripts/generation")}
          className="glass rounded-xl p-6 glow-border hover-lift transition-transform relative overflow-hidden group min-w-0 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10 group-hover:scale-110 transition-transform flex-shrink-0">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-right min-w-0 flex-1 ml-2">
                <div className="text-3xl font-bold">{dashboard?.stats.totalApproved || 0}</div>
                <div className="text-sm text-muted-foreground mt-1 truncate">Сценариев написано</div>
              </div>
            </div>
          </div>
        </div>

        {/* На рецензии */}
        <div 
          onClick={() => navigate("/conveyor/scripts/review")}
          className="glass rounded-xl p-6 glow-border hover-lift transition-transform relative overflow-hidden group min-w-0 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-500/10 group-hover:scale-110 transition-transform flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-right min-w-0 flex-1 ml-2">
                <div className="text-3xl font-bold">{dashboard?.pendingReview.count || 0}</div>
                <div className="text-sm text-muted-foreground mt-1 truncate">На рецензии</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Сценарии на рецензии */}
      <Card className="glass glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <FileText className="w-5 h-5 text-primary-400" />
              </div>
              <CardTitle>Сценарии на рецензии</CardTitle>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                {dashboard?.pendingReview.count || 0}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/conveyor/scripts/review")}
              className="gap-2"
            >
              Смотреть все
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!dashboard?.pendingReview.scripts || dashboard.pendingReview.scripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Нет сценариев на рецензии</p>
              <p className="text-sm mt-2">Запустите генерацию в разделе "Сценариев написано"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.pendingReview.scripts.map((script) => (
                <div
                  key={script.id}
                  onClick={() => navigate(`/conveyor/drafts/${script.id}`)}
                  className="glass rounded-lg p-5 hover:bg-muted/50 transition-all border border-border hover:border-primary/30 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        {script.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {script.formatName}
                        </span>
                        <span>•</span>
                        <span className={
                          script.finalScore >= 8 ? 'text-green-400' : 
                          script.finalScore >= 5 ? 'text-yellow-400' : 
                          'text-red-400'
                        }>
                          Оценка: {script.finalScore}/10
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(script.createdAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
