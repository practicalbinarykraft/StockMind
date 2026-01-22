interface ConveyorStatsSummaryProps {
  totalProcessed: number;
  totalPassed: number;
  totalFailed: number;
  totalApproved: number;
  totalRejected: number;
}

/**
 * Summary statistics grid for conveyor performance
 */
export function ConveyorStatsSummary({
  totalProcessed,
  totalPassed,
  totalFailed,
  totalApproved,
  totalRejected,
}: ConveyorStatsSummaryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Статистика</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{totalProcessed}</div>
          <div className="text-xs text-muted-foreground">Обработано</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{totalPassed}</div>
          <div className="text-xs text-muted-foreground">Прошли</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
          <div className="text-xs text-muted-foreground">Отклонены</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{totalApproved}</div>
          <div className="text-xs text-muted-foreground">Одобрено</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">
            {totalRejected}
          </div>
          <div className="text-xs text-muted-foreground">Отклонено вами</div>
        </div>
      </div>
    </div>
  );
}
