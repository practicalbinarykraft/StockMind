import { TrendingUp, TrendingDown } from "lucide-react"
import { Progress } from "@/shared/ui/progress"
import { Badge } from "@/shared/ui/badge"

interface VideoScorePredictionProps {
  ifWellAdapted: string
  ifPoorlyAdapted: string
  reasoning?: string
}

/**
 * Extract numeric score from string like "75-80/100" or "70/100"
 */
function extractScore(scoreString: string): number {
  // Try to extract first number or average of range
  const match = scoreString.match(/(\d+)(?:-(\d+))?/);
  if (!match) return 0;
  
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : start;
  
  // Return average if range, otherwise the number
  return Math.round((start + end) / 2);
}

/**
 * Get color variant based on score
 */
function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get progress bar color based on score
 */
function getProgressColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function VideoScorePrediction({
  ifWellAdapted,
  ifPoorlyAdapted,
  reasoning,
}: VideoScorePredictionProps) {
  const wellAdaptedScore = extractScore(ifWellAdapted);
  const poorlyAdaptedScore = extractScore(ifPoorlyAdapted);
  const wellAdaptedColor = getScoreColor(wellAdaptedScore);
  const poorlyAdaptedColor = getScoreColor(poorlyAdaptedScore);

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold">Прогноз качества видео</span>
      </div>

      {/* Well Adapted Score */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-2xl font-bold ${wellAdaptedColor}`}>
            {wellAdaptedScore}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
          <Badge variant="outline" className="text-xs ml-auto">
            Если хорошо адаптировать
          </Badge>
        </div>
        <Progress 
          value={wellAdaptedScore} 
          className="h-2 mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {ifWellAdapted}
        </p>
      </div>

      {/* Poorly Adapted Score */}
      <div className="mb-2">
        <div className="flex items-baseline gap-2 mb-1">
          <TrendingDown className="h-3 w-3 text-muted-foreground" />
          <span className={`text-lg font-semibold ${poorlyAdaptedColor}`}>
            {poorlyAdaptedScore}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
          <span className="text-xs text-muted-foreground ml-2">
            Если плохо адаптировать
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {ifPoorlyAdapted}
        </p>
      </div>

      {/* Reasoning */}
      {reasoning && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs text-muted-foreground italic">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

