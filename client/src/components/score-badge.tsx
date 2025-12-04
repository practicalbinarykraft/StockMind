import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score: number
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ScoreBadge({ score, className, size = "md" }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-chart-2 text-white"
    if (score >= 70) return "bg-chart-5 text-white"
    if (score >= 50) return "bg-chart-3 text-white"
    return "bg-destructive text-destructive-foreground"
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        getScoreColor(score),
        sizeClasses[size],
        className
      )}
      data-testid={`badge-score-${score}`}
    >
      {score}
    </div>
  )
}
