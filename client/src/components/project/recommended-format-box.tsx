import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Sparkles, Layout, ChevronDown, ChevronUp, TrendingUp, Target, Zap } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FormatRecommendation {
  formatId: string;
  name: string;
  reason: string;
  why?: string[]; // 3-4 reasons why this format is recommended
  whyBetter?: string;
  expectedImpact?: {
    retention?: string;
    saves?: string;
    engagement?: string;
  };
  firstFrameIdeas?: string[]; // 3 ideas for first frame
  hookOptions?: string[]; // 3 hook variants
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
  const [showDetails, setShowDetails] = useState(false);

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

          {recommendation.expectedImpact && (
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
              {recommendation.expectedImpact.engagement && (
                <Badge variant="secondary" data-testid="badge-engagement-impact">
                  Engagement {recommendation.expectedImpact.engagement}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Details Section */}
        {(recommendation.why || recommendation.firstFrameIdeas || recommendation.hookOptions) && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" data-testid="button-toggle-details">
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showDetails ? 'Скрыть детали' : 'Показать детали'}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3 text-sm">
              {recommendation.why && recommendation.why.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Почему этот формат?
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {recommendation.why.map((reason, index) => (
                      <li key={index} className="text-muted-foreground list-disc">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendation.firstFrameIdeas && recommendation.firstFrameIdeas.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Идеи для первого кадра
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {recommendation.firstFrameIdeas.map((idea, index) => (
                      <li key={index} className="text-muted-foreground list-disc">
                        {idea}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendation.hookOptions && recommendation.hookOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Варианты хука
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {recommendation.hookOptions.map((hook, index) => (
                      <li key={index} className="text-muted-foreground list-disc">
                        {hook}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => onApply(recommendation.formatId)}
            disabled={isLoading}
            className="flex-1 gap-2"
            data-testid="button-apply-recommended"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Создаем...' : 'Создать сценарий'}
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
