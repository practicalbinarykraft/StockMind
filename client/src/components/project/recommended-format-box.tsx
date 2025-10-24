import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Sparkles, Layout } from "lucide-react";

interface FormatRecommendation {
  formatId: string;
  name: string;
  reason: string;
  whyBetter?: string;
  expectedImpact?: {
    retention?: string;
    saves?: string;
  };
}

interface RecommendedFormatBoxProps {
  recommendation?: FormatRecommendation;
  onApply: (formatId: string) => void;
  onChooseOther: () => void;
  isLoading?: boolean;
}

export function RecommendedFormatBox({
  recommendation,
  onApply,
  onChooseOther,
  isLoading = false,
}: RecommendedFormatBoxProps) {
  if (!recommendation) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <Button
            onClick={onChooseOther}
            className="w-full gap-2"
            data-testid="button-choose-format"
          >
            <Layout className="h-4 w-4" />
            Выбрать формат
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5" data-testid="card-recommended-format">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Рекомендованный формат
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="font-semibold mb-1" data-testid="text-format-name">
            {recommendation.name}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {recommendation.reason}
          </p>

          {recommendation.whyBetter && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5 mb-2 flex gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-primary">
                {recommendation.whyBetter}
              </p>
            </div>
          )}

          {recommendation.expectedImpact && 
           (recommendation.expectedImpact.retention || recommendation.expectedImpact.saves) && (
            <div className="flex gap-2 text-xs flex-wrap">
              {recommendation.expectedImpact.retention && (
                <Badge variant="secondary" data-testid="badge-retention-impact">
                  Retention {recommendation.expectedImpact.retention}
                </Badge>
              )}
              {recommendation.expectedImpact.saves && (
                <Badge variant="secondary" data-testid="badge-saves-impact">
                  Saves {recommendation.expectedImpact.saves}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onApply(recommendation.formatId)}
            disabled={isLoading}
            className="flex-1 gap-2"
            data-testid="button-apply-recommended"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Применяем...' : 'Применить рекомендованный'}
          </Button>

          <Button
            variant="outline"
            onClick={onChooseOther}
            disabled={isLoading}
            data-testid="button-choose-other"
          >
            Выбрать другой
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
