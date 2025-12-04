import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, TrendingUp, Play } from "lucide-react";

interface ConveyorStats {
  itemsProcessedToday: number;
  dailyLimit: number;
  currentMonthCost: string;
  monthlyBudgetLimit: string;
  approvalRate: string | null;
  totalApproved: number;
  totalRejected: number;
}

interface ConveyorQuickStatsProps {
  stats: ConveyorStats | null;
  enabled: boolean;
  onTrigger: () => void;
  isTriggerPending: boolean;
}

/**
 * Quick stats and action buttons for conveyor dashboard
 * Shows daily progress, budget usage, and approval rate
 */
export function ConveyorQuickStats({
  stats,
  enabled,
  onTrigger,
  isTriggerPending,
}: ConveyorQuickStatsProps) {
  const dailyProgress = stats
    ? (stats.itemsProcessedToday / stats.dailyLimit) * 100
    : 0;

  const budgetProgress = stats
    ? (parseFloat(stats.currentMonthCost) / parseFloat(stats.monthlyBudgetLimit)) * 100
    : 0;

  const canTrigger =
    enabled &&
    !isTriggerPending &&
    (stats?.itemsProcessedToday || 0) < (stats?.dailyLimit || 10);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Progress */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Сегодня</span>
          </div>
          <div className="text-2xl font-bold">
            {stats?.itemsProcessedToday || 0}/{stats?.dailyLimit || 10}
          </div>
          <Progress value={dailyProgress} className="mt-2 h-2" />
        </div>

        {/* Budget */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Бюджет (месяц)</span>
          </div>
          <div className="text-2xl font-bold">
            ${stats?.currentMonthCost || "0"}/
            <span className="text-muted-foreground">
              ${stats?.monthlyBudgetLimit || "10"}
            </span>
          </div>
          <Progress value={budgetProgress} className="mt-2 h-2" />
        </div>

        {/* Approval Rate */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Approval Rate</span>
          </div>
          <div className="text-2xl font-bold">
            {stats?.approvalRate
              ? `${(parseFloat(stats.approvalRate) * 100).toFixed(0)}%`
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats?.totalApproved || 0} одобрено / {stats?.totalRejected || 0} отклонено
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onTrigger}
          disabled={!canTrigger}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Запустить сейчас
        </Button>
        <Button variant="outline" asChild>
          <a href="/auto-scripts">Сценарии на ревью</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/conveyor">Дашборд</a>
        </Button>
      </div>
    </div>
  );
}
