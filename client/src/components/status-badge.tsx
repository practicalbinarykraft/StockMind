import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

interface StatusBadgeProps {
  status: "success" | "error" | "pending"
  text?: string
  className?: string
}

export function StatusBadge({ status, text, className }: StatusBadgeProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      text: text || "Success",
    },
    error: {
      icon: XCircle,
      className: "bg-destructive/10 text-destructive border-destructive/20",
      text: text || "Error",
    },
    pending: {
      icon: Clock,
      className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      text: text || "Pending",
    },
  }

  const { icon: Icon, className: statusClass, text: displayText } = config[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        statusClass,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {displayText}
    </div>
  )
}
