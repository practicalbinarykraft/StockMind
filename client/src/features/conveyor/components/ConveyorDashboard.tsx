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
        {/* Спарсено новостей */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Спарсено новостей
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.todayProgress.processed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Сегодня
            </p>
          </CardContent>
        </Card>

        {/* Проанализировано */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Проанализировано
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.stats.totalPassed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pass rate: {dashboard?.stats.passRate || "—"}
            </p>
          </CardContent>
        </Card>

        {/* Сценариев написано */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate("/conveyor/scripts/generation")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Сценариев написано
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.stats.totalApproved || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Нажмите для просмотра
            </p>
          </CardContent>
        </Card>

        {/* На рецензии */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate("/conveyor/scripts/review")}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              На рецензии
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
    </div>
  );
}
