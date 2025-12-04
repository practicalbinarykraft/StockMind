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

  // Normalize recommendation: handle both string (legacy) and object formats
  // CRITICAL: Never render objects directly - always extract properties
  let normalizedRecommendation: FormatRecommendation | undefined;
  if (recommendation) {
    if (typeof recommendation === 'string') {
      // Legacy format: string like 'hook_story' or 'hook'
      const formatMap: Record<string, { id: string; name: string; reason: string }> = {
        'hook': { id: 'hook', name: 'Hook & Story', reason: 'Внимание-захватывающее начало с повествовательной аркой' },
        'hook_story': { id: 'hook', name: 'Hook & Story', reason: 'Внимание-захватывающее начало с повествовательной аркой' },
        'problem_solution': { id: 'problem_solution', name: 'Problem & Solution', reason: 'Формат решения проблемы для высокооцененного контента' },
        'educational': { id: 'explainer', name: 'Explainer', reason: 'Образовательный формат для сложных тем' },
        'explainer': { id: 'explainer', name: 'Explainer', reason: 'Образовательный формат для сложных тем' },
      };
      const formatInfo = formatMap[recommendation] || formatMap['hook'];
      normalizedRecommendation = {
        formatId: formatInfo.id,
        name: formatInfo.name,
        reason: formatInfo.reason,
      };
    } else if (typeof recommendation === 'object' && recommendation !== null && !Array.isArray(recommendation)) {
      // New format: object with formatId, name, reason
      // CRITICAL: Extract all properties to strings to prevent direct object rendering
      try {
        const rec = recommendation as any;
        // Check if it's a valid recommendation object
        if (rec && (rec.formatId || rec.name || rec.reason)) {
          normalizedRecommendation = {
            formatId: rec.formatId ? String(rec.formatId) : 'hook',
            name: rec.name ? String(rec.name) : 'Hook & Story',
            reason: rec.reason ? String(rec.reason) : 'Внимание-захватывающее начало с повествовательной аркой',
            why: Array.isArray(rec.why) ? rec.why.map((w: any) => String(w)) : undefined,
            whyBetter: typeof rec.whyBetter === 'string' ? String(rec.whyBetter) : undefined,
            expectedImpact: typeof rec.expectedImpact === 'object' && rec.expectedImpact !== null ? {
              retention: rec.expectedImpact.retention ? String(rec.expectedImpact.retention) : undefined,
              saves: rec.expectedImpact.saves ? String(rec.expectedImpact.saves) : undefined,
              engagement: rec.expectedImpact.engagement ? String(rec.expectedImpact.engagement) : undefined,
            } : undefined,
            firstFrameIdeas: Array.isArray(rec.firstFrameIdeas) ? rec.firstFrameIdeas.map((idea: any) => String(idea)) : undefined,
            hookOptions: Array.isArray(rec.hookOptions) ? rec.hookOptions.map((hook: any) => String(hook)) : undefined,
          };
        } else {
          // Invalid format, use default
          normalizedRecommendation = {
            formatId: 'hook',
            name: 'Hook & Story',
            reason: 'Внимание-захватывающее начало с повествовательной аркой',
          };
        }
      } catch (error) {
        console.error('[RecommendedFormatBox] Error normalizing recommendation:', error);
        // Fallback to default on any error
        normalizedRecommendation = {
          formatId: 'hook',
          name: 'Hook & Story',
          reason: 'Внимание-захватывающее начало с повествовательной аркой',
        };
      }
    } else {
      // Invalid format, use default
      normalizedRecommendation = {
        formatId: 'hook',
        name: 'Hook & Story',
        reason: 'Внимание-захватывающее начало с повествовательной аркой',
      };
    }
  }

  if (!normalizedRecommendation) {
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
            {normalizedRecommendation.name}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {normalizedRecommendation.reason}
          </p>

          {normalizedRecommendation.whyBetter && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5 mb-2 flex gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-primary">
                {normalizedRecommendation.whyBetter}
              </p>
            </div>
          )}

          {normalizedRecommendation.expectedImpact && (
            <div className="flex gap-2 text-xs flex-wrap">
              {normalizedRecommendation.expectedImpact.retention && (
                <Badge variant="secondary" data-testid="badge-retention-impact">
                  Retention {normalizedRecommendation.expectedImpact.retention}
                </Badge>
              )}
              {normalizedRecommendation.expectedImpact.saves && (
                <Badge variant="secondary" data-testid="badge-saves-impact">
                  Saves {normalizedRecommendation.expectedImpact.saves}
                </Badge>
              )}
              {normalizedRecommendation.expectedImpact.engagement && (
                <Badge variant="secondary" data-testid="badge-engagement-impact">
                  Engagement {normalizedRecommendation.expectedImpact.engagement}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Details Section */}
        {(normalizedRecommendation.why || normalizedRecommendation.firstFrameIdeas || normalizedRecommendation.hookOptions) && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" data-testid="button-toggle-details">
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showDetails ? 'Скрыть детали' : 'Показать детали'}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3 text-sm">
              {normalizedRecommendation.why && normalizedRecommendation.why.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Почему этот формат?
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {normalizedRecommendation.why.map((reason, index) => (
                      <li key={index} className="text-muted-foreground list-disc">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {normalizedRecommendation.firstFrameIdeas && normalizedRecommendation.firstFrameIdeas.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Идеи для первого кадра
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {normalizedRecommendation.firstFrameIdeas.map((idea, index) => (
                      <li key={index} className="text-muted-foreground list-disc">
                        {idea}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {normalizedRecommendation.hookOptions && normalizedRecommendation.hookOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Варианты хука
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {normalizedRecommendation.hookOptions.map((hook, index) => (
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
            onClick={() => onApply(normalizedRecommendation.formatId)}
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
