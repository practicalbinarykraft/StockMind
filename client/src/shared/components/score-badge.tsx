import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Badge component for displaying AI scores with color coding
 */
export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500 hover:bg-green-600 text-white";
    if (score >= 60) return "bg-yellow-500 hover:bg-yellow-600 text-white";
    if (score >= 40) return "bg-orange-500 hover:bg-orange-600 text-white";
    return "bg-red-500 hover:bg-red-600 text-white";
  };

  const getSizeClasses = (size: "sm" | "md" | "lg") => {
    switch (size) {
      case "sm":
        return "text-xs px-1.5 py-0.5";
      case "lg":
        return "text-base px-3 py-1.5";
      default:
        return "text-sm px-2 py-1";
    }
  };

  return (
    <Badge
      className={cn(
        getScoreColor(score),
        getSizeClasses(size),
        "font-semibold",
        className
      )}
    >
      {score}/100
    </Badge>
  );
}
