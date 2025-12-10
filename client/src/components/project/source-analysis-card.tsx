import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";

interface SourceAnalysisCardProps {
  analysis?: {
    score?: number;
    topics?: string[];
    sentiment?: string;
    keywords?: string[];
    risks?: string[];
    strengths?: string[];
  };
}

export function SourceAnalysisCard({ analysis }: SourceAnalysisCardProps) {
  if (!analysis || Object.keys(analysis).length === 0) {
    return null;
  }

  return (
    <Card className="mb-4" data-testid="card-source-analysis">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Анализ исходника
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        {analysis.score !== undefined && (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Оценка AI:</div>
            <ScoreBadge score={analysis.score} size="lg" />
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5 text-green-600 dark:text-green-500">
              <TrendingUp className="h-4 w-4" />
              Сильные стороны:
            </div>
            <ul className="text-sm space-y-1">
              {analysis.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2"
                  data-testid={`strength-${i}`}
                >
                  <span className="text-green-600 dark:text-green-500">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.topics && analysis.topics.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5">Темы:</div>
            <div className="flex gap-2 flex-wrap">
              {analysis.topics.map((topic, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  data-testid={`badge-topic-${i}`}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.sentiment && (
          <div>
            <div className="text-sm font-medium mb-1.5">Тональность:</div>
            <Badge variant="outline" data-testid="badge-sentiment">
              {analysis.sentiment}
            </Badge>
          </div>
        )}

        {analysis.keywords && analysis.keywords.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5">Ключевые слова:</div>
            <div className="text-sm text-muted-foreground">
              {analysis.keywords.join(", ")}
            </div>
          </div>
        )}

        {analysis.risks && analysis.risks.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Риски:
            </div>
            <ul className="text-sm text-destructive list-disc list-inside space-y-1">
              {analysis.risks.map((risk, i) => (
                <li key={i} data-testid={`risk-${i}`}>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
