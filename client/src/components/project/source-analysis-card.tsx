import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface SourceAnalysisCardProps {
  analysis?: {
    topics?: string[];
    sentiment?: string;
    keywords?: string[];
    risks?: string[];
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
      <CardContent className="space-y-3">
        {analysis.topics && analysis.topics.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5">Темы:</div>
            <div className="flex gap-2 flex-wrap">
              {analysis.topics.map((topic, i) => (
                <Badge key={i} variant="secondary" data-testid={`badge-topic-${i}`}>
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.sentiment && (
          <div>
            <div className="text-sm font-medium mb-1.5">Тональность:</div>
            <Badge variant="outline" data-testid="badge-sentiment">{analysis.sentiment}</Badge>
          </div>
        )}

        {analysis.keywords && analysis.keywords.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5">Ключевые слова:</div>
            <div className="text-sm text-muted-foreground">
              {analysis.keywords.join(', ')}
            </div>
          </div>
        )}

        {analysis.risks && analysis.risks.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1.5 text-destructive">Риски:</div>
            <ul className="text-sm text-destructive list-disc list-inside space-y-1">
              {analysis.risks.map((risk, i) => (
                <li key={i} data-testid={`risk-${i}`}>{risk}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
