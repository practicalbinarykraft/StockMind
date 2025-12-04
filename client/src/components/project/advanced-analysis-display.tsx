import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  AlertTriangle,
  Target,
  Heart,
  MessageCircle,
  BarChart3,
  Zap,
  CheckCircle2,
  Sparkles,
  Layers,
  Megaphone
} from "lucide-react"
import type { AdvancedScoreResult } from "@shared/advanced-analysis-types"

interface AdvancedAnalysisDisplayProps {
  analysis: AdvancedScoreResult
  analysisTime?: number
}

export function AdvancedAnalysisDisplay({ analysis, analysisTime }: AdvancedAnalysisDisplayProps) {
  // Safe fallbacks for agent scores (breakdown doesn't have top-level .score fields)
  const hookScore = analysis.breakdown?.hook?.score ?? 0;
  const structureScore = (analysis as any).agentScores?.structure ?? 
                         (analysis.breakdown as any).structure?.score ?? 
                         0; // Fallback to 0 if backend doesn't provide agentScores
  const emotionalScore = (analysis as any).agentScores?.emotional ?? 
                         (analysis.breakdown as any).emotional?.score ?? 
                         0;
  const ctaScore = (analysis as any).agentScores?.cta ?? 
                   (analysis.breakdown as any).cta?.score ?? 
                   0;

  // Color coding for scores
  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-green-500"
    if (score >= 70) return "text-teal-500"
    if (score >= 50) return "text-amber-500"
    return "text-red-500"
  }

  const getScoreBg = (score: number): string => {
    if (score >= 90) return "bg-green-500/10"
    if (score >= 70) return "bg-teal-500/10"
    if (score >= 50) return "bg-amber-500/10"
    return "bg-red-500/10"
  }

  const getVerdictBadge = (verdict: string) => {
    const variants = {
      viral: { variant: "default" as const, icon: Zap, color: "text-green-500" },
      strong: { variant: "default" as const, icon: TrendingUp, color: "text-teal-500" },
      moderate: { variant: "secondary" as const, icon: Target, color: "text-amber-500" },
      weak: { variant: "secondary" as const, icon: TrendingDown, color: "text-red-500" }
    }
    return variants[verdict as keyof typeof variants] || variants.moderate
  }

  const verdictConfig = getVerdictBadge(analysis.verdict)
  const VerdictIcon = verdictConfig.icon

  return (
    <div className="space-y-6" data-testid="advanced-analysis-display">
      {/* Overall Score Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${getScoreBg(analysis.overallScore)}`}>
                <BarChart3 className={`h-6 w-6 ${getScoreColor(analysis.overallScore)}`} />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Общий балл: {analysis.overallScore}/100
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <VerdictIcon className={`h-4 w-4 ${verdictConfig.color}`} />
                  <span className="capitalize font-medium">{analysis.verdict}</span>
                  <span className="text-muted-foreground">
                    • Уверенность: {Math.round(analysis.confidence * 100)}%
                  </span>
                  {analysisTime && (
                    <span className="text-muted-foreground">
                      • Анализ за {(analysisTime / 1000).toFixed(1)}с
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Breakdown Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hook Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Анализ хука
              </span>
              <Badge variant={hookScore >= 70 ? "default" : "secondary"}>
                {hookScore}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Тип: {analysis.breakdown.hook.type}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analysis.breakdown.hook.criteria).map(([key, criterion]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={getScoreColor(criterion.score)}>
                    {criterion.score}/100
                  </span>
                </div>
                <Progress value={criterion.score} className="h-2" />
                <p className="text-xs text-muted-foreground">{criterion.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Structure Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Структура
              </span>
              <Badge variant={structureScore >= 70 ? "default" : "secondary"}>
                {structureScore}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pacing (WPM)</span>
                <span className="font-medium">{analysis.breakdown.structure.pacing.wpm}</span>
              </div>
              <Badge variant={
                analysis.breakdown.structure.pacing.rating === 'optimal' ? 'default' : 'secondary'
              }>
                {analysis.breakdown.structure.pacing.rating}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Information Density</span>
                <span className="font-medium">
                  {analysis.breakdown.structure.informationDensity.factsPerSecond.toFixed(2)} facts/sec
                </span>
              </div>
              <Badge variant={
                analysis.breakdown.structure.informationDensity.rating === 'optimal' ? 'default' : 'secondary'
              }>
                {analysis.breakdown.structure.informationDensity.rating}
              </Badge>
            </div>

            {analysis.breakdown.structure.sceneFlow && (
              <div className="pt-2 border-t">
                <p className="text-sm">
                  <span className="font-medium">Flow: </span>
                  <span className="text-muted-foreground">
                    {analysis.breakdown.structure.sceneFlow.structure}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emotional Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Эмоциональное воздействие
              </span>
              <Badge variant={emotionalScore >= 70 ? "default" : "secondary"}>
                {emotionalScore}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Primary Emotion</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {analysis.breakdown.emotional.primaryEmotion.type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Strength: {analysis.breakdown.emotional.primaryEmotion.strength}/100
                </span>
              </div>
            </div>

            {analysis.breakdown.emotional.triggers && analysis.breakdown.emotional.triggers.identified.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Triggers</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.breakdown.emotional.triggers.identified.map((trigger: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Relatability</p>
                <p className="text-sm font-medium">{analysis.breakdown.emotional.relatability}/100</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shareability</p>
                <p className="text-sm font-medium">{analysis.breakdown.emotional.shareabilityScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Призыв к действию
              </span>
              <Badge variant={ctaScore >= 70 ? "default" : "secondary"}>
                {ctaScore}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {analysis.breakdown.cta.presence.hasCTA ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm">
                {analysis.breakdown.cta.presence.hasCTA ? 'CTA Present' : 'No CTA Detected'}
              </span>
            </div>

            {analysis.breakdown.cta.presence.hasCTA && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Specificity</span>
                    <span className={getScoreColor(analysis.breakdown.cta.effectiveness.specificity)}>
                      {analysis.breakdown.cta.effectiveness.specificity}/100
                    </span>
                  </div>
                  <Progress value={analysis.breakdown.cta.effectiveness.specificity} className="h-2" />
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Friction Level</span>
                    <Badge variant={
                      analysis.breakdown.cta.effectiveness.frictionLevel === 'low' ? 'default' : 'secondary'
                    }>
                      {analysis.breakdown.cta.effectiveness.frictionLevel}
                    </Badge>
                  </div>
                </div>

                {analysis.breakdown.cta.placement && (
                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <span className="font-medium">Timing: </span>
                      <Badge variant="outline" className="capitalize">
                        {analysis.breakdown.cta.placement.timing}
                      </Badge>
                      {analysis.breakdown.cta.placement.isOptimal && (
                        <span className="text-xs text-green-500 ml-2">✓ Optimal</span>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Alert className="border-green-500/20 bg-green-500/5">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <AlertDescription>
            <p className="font-semibold mb-2">Strengths</p>
            <ul className="space-y-1 text-sm">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <p className="font-semibold mb-2">Areas for Improvement</p>
            <ul className="space-y-1 text-sm">
              {analysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Top Recommendations
            </CardTitle>
            <CardDescription>
              Prioritized improvements with expected impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  className="border-l-4 pl-4 py-2"
                  style={{
                    borderColor: rec.priority === 'high' ? '#ef4444' : 
                                rec.priority === 'medium' ? '#f59e0b' : '#6b7280'
                  }}
                  data-testid={`recommendation-${idx}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                      {rec.priority}
                    </Badge>
                    <span className="font-semibold text-sm">{rec.area}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">Current:</span> {rec.current}
                  </p>
                  <p className="text-sm mb-1">
                    <span className="font-medium">Suggested:</span> {rec.suggested}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {rec.expectedImpact}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{rec.reasoning}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Viral Patterns */}
      {analysis.viralPatterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Viral Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.viralPatterns.matched && analysis.viralPatterns.matched.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Patterns Used
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.viralPatterns.matched.map((pattern, idx) => (
                    <Badge key={idx} variant="default" className="gap-1">
                      {pattern.pattern}
                      <span className="text-xs opacity-70">
                        ({pattern.confidence}%)
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.viralPatterns.missing && analysis.viralPatterns.missing.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Missing Patterns (Opportunity)
                </p>
                <div className="space-y-2">
                  {analysis.viralPatterns.missing.map((pattern, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{pattern.pattern}</span>
                      <Badge variant="outline">
                        {pattern.potentialBoost}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Predicted Metrics */}
      {analysis.predictedMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Прогноз эффективности
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Retention</p>
                <p className="text-lg font-semibold">{analysis.predictedMetrics.estimatedRetention}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Saves</p>
                <p className="text-lg font-semibold">{analysis.predictedMetrics.estimatedSaves}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Shares</p>
                <p className="text-lg font-semibold">{analysis.predictedMetrics.estimatedShares}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Viral Probability</p>
                <Badge variant={
                  analysis.predictedMetrics.viralProbability === 'high' ? 'default' : 'secondary'
                }>
                  {analysis.predictedMetrics.viralProbability}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
