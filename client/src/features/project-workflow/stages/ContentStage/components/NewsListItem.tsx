import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScoreBadge } from "@/shared/components/score-badge";
import { ArticlePreviewModal } from "@/shared/components/article-preview-modal";
import {
  Check,
  ThumbsDown,
  Eye,
  Newspaper,
  Languages,
  Sparkles,
  Loader2,
  RefreshCw,
  Play,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { EnrichedRssItem } from "../utils/news-helpers";
import { getBadgeConfig } from "../utils/news-helpers";
import { VideoScorePrediction } from "./VideoScorePrediction";

export interface NewsListItemProps {
  item: EnrichedRssItem;
  analysis?: any;
  isAnalyzing: boolean;
  onSelect?: (item: EnrichedRssItem) => void;
  onDismiss?: (e: React.MouseEvent, itemId: string) => void;
  onAnalyze: (item: EnrichedRssItem) => void;
  onCreateScript?: (item: EnrichedRssItem, analysis: any) => void;
  onToggleFavorite?: (isFavorite: boolean) => void;
  onLoadSavedAnalysis?: (itemId: string) => void;
  onShowSavedAnalysis?: (itemId: string) => void;
  isLoadingSavedAnalysis?: boolean;
  hasSavedAnalysis?: boolean;
  isDismissing?: boolean;
}

export function NewsListItem({
  item,
  analysis,
  isAnalyzing,
  onSelect,
  onDismiss,
  onAnalyze,
  onCreateScript,
  onToggleFavorite,
  onLoadSavedAnalysis,
  onShowSavedAnalysis,
  isLoadingSavedAnalysis,
  hasSavedAnalysis,
  isDismissing,
}: NewsListItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "ru">("ru"); // Default to Russian
  const badge = getBadgeConfig(item.freshnessLabel);
  const isDismissed = item.userAction === "dismissed";
  const isUsed = item.userAction === "selected";

  // Extract title and content from translation
  // const translatedTitle =
  //   translation && currentLanguage === "ru"
  //     ? translation.text.split("\n")[0] || item.title
  //     : item.title;

  // const translatedContent =
  //   translation && currentLanguage === "ru"
  //     ? translation.text.split("\n").slice(1).join("\n").trim() ||
  //       item.content ||
  //       ""
  //     : item.content || "";

  // const displayTitle = translatedTitle;
  // const displayContent = translatedContent;

  const score = item.score ?? item.aiScore ?? item.freshnessScore ?? null;

  return (
    <>
      {previewOpen && (
        <ArticlePreviewModal
          open={previewOpen}
          article={item}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      <Card
        className={`${isDismissed ? "opacity-50" : ""} ${
          isUsed ? "border-green-500 dark:border-green-600" : ""
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left: Article Content */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Top row: Badge, Source, Date, Score */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={badge.variant} className="gap-1">
                    <badge.icon className="h-3 w-3" />
                    {badge.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Newspaper className="h-3 w-3" />
                    <span className="font-medium">{item.sourceName}</span>
                  </div>
                  {item.publishedAt && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.publishedAt), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </span>
                    </>
                  )}
                  {score !== null && score !== undefined && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <ScoreBadge score={score} size="sm" />
                    </>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                {item.content || ""}
              </p>
            </div>

            {/* Show "Open full article" button - BELOW the article text */}
            {/* Always show button - ArticlePreviewModal will fetch full content if needed */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Открыть статью целиком
            </Button>

            {isUsed && (
              <Badge variant="outline" className="w-full justify-center">
                <Check className="h-3 w-3 mr-1" />
                Used in project
              </Badge>
            )}
          </div>

          {/* Right: Analysis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">AI Анализ</h4>
              <div className="flex items-center gap-2">
                {hasSavedAnalysis && !analysis && onLoadSavedAnalysis && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onLoadSavedAnalysis(item.id)}
                    disabled={isLoadingSavedAnalysis}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoadingSavedAnalysis ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Показать анализ
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAnalyze(item)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Анализ...
                    </>
                  ) : analysis ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Переанализировать
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Анализ
                    </>
                  )}
                </Button>
              </div>
            </div>

            {analysis ? (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                {/* Overall Score */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Оценка потенциала:
                  </span>
                  <ScoreBadge
                    score={analysis.score || analysis.overallScore || 0}
                  />
                </div>

                {/* Verdict */}
                {analysis.verdict && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Вердикт:
                    </span>
                    <p className="text-sm font-medium capitalize">
                      {analysis.verdict === "excellent"
                        ? "Отлично"
                        : analysis.verdict === "good"
                        ? "Хорошо"
                        : analysis.verdict === "moderate"
                        ? "Умеренно"
                        : analysis.verdict === "weak"
                        ? "Слабо"
                        : analysis.verdict}
                    </p>
                  </div>
                )}

                {/* Recommended Format */}
                {analysis.breakdown?.recommendedFormat && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Рекомендуемый формат:
                    </span>
                    <p className="text-sm font-medium">
                      {analysis.breakdown.recommendedFormat.format ===
                      "news_update"
                        ? "News Update"
                        : analysis.breakdown.recommendedFormat.format ===
                          "explainer"
                        ? "Explainer"
                        : analysis.breakdown.recommendedFormat.format ===
                          "story"
                        ? "Story"
                        : analysis.breakdown.recommendedFormat.format ===
                          "comparison"
                        ? "Comparison"
                        : analysis.breakdown.recommendedFormat.format ===
                          "tutorial"
                        ? "Tutorial"
                        : analysis.breakdown.recommendedFormat.format ===
                          "trend"
                        ? "Trend"
                        : analysis.breakdown.recommendedFormat.format}
                    </p>
                  </div>
                )}

                {/* Video Score Prediction - Improved UI */}
                {analysis.videoScorePrediction && (
                  <VideoScorePrediction
                    ifWellAdapted={analysis.videoScorePrediction.ifWellAdapted}
                    ifPoorlyAdapted={
                      analysis.videoScorePrediction.ifPoorlyAdapted
                    }
                    reasoning={analysis.videoScorePrediction.reasoning}
                  />
                )}

                {/* Strengths */}
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Почему получится видео:
                    </span>
                    <ul className="text-sm list-disc list-inside mt-1">
                      {analysis.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Что может быть сложно:
                    </span>
                    <ul className="text-sm list-disc list-inside mt-1">
                      {analysis.weaknesses.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Script Recommendations */}
                {analysis.scriptRecommendations &&
                  analysis.scriptRecommendations.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Рекомендации для сценария:
                      </span>
                      <ul className="text-sm list-disc list-inside mt-1">
                        {analysis.scriptRecommendations
                          .slice(0, 3)
                          .map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                      </ul>
                    </div>
                  )}

                {/* Breakdown Scores (if available) */}
                {analysis.breakdown && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    {analysis.breakdown.hookPotential && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Потенциал хука:
                        </span>
                        <p className="text-sm font-medium">
                          {analysis.breakdown.hookPotential.score}/100
                        </p>
                      </div>
                    )}
                    {analysis.breakdown.contentSufficiency && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Достаточно контента:
                        </span>
                        <p className="text-sm font-medium">
                          {analysis.breakdown.contentSufficiency.score}/100
                        </p>
                      </div>
                    )}
                    {analysis.breakdown.emotionalAngle && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Эмоциональный угол:
                        </span>
                        <p className="text-sm font-medium">
                          {analysis.breakdown.emotionalAngle.score}/100
                        </p>
                      </div>
                    )}
                    {analysis.breakdown.visualPotential && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Визуальный потенциал:
                        </span>
                        <p className="text-sm font-medium">
                          {analysis.breakdown.visualPotential.score}/100
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy support: Show old format scores if present */}
                {(analysis.hookScore !== undefined ||
                  analysis.structureScore !== undefined) &&
                  !analysis.breakdown && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      {analysis.hookScore !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Hook:
                          </span>
                          <p className="text-sm font-medium">
                            {analysis.hookScore}/100
                          </p>
                        </div>
                      )}
                      {analysis.structureScore !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Структура:
                          </span>
                          <p className="text-sm font-medium">
                            {analysis.structureScore}/100
                          </p>
                        </div>
                      )}
                      {analysis.emotionalScore !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Эмоции:
                          </span>
                          <p className="text-sm font-medium">
                            {analysis.emotionalScore}/100
                          </p>
                        </div>
                      )}
                      {analysis.ctaScore !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            CTA:
                          </span>
                          <p className="text-sm font-medium">
                            {analysis.ctaScore}/100
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {/* Create Script Button - Show after analysis with recommended format */}
                {analysis?.breakdown?.recommendedFormat && onCreateScript && (
                  <div className="mt-4 p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Готов создать сценарий?
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {analysis.breakdown.recommendedFormat.format ===
                        "news_update"
                          ? "News Update"
                          : analysis.breakdown.recommendedFormat.format ===
                            "explainer"
                          ? "Explainer"
                          : analysis.breakdown.recommendedFormat.format ===
                            "story"
                          ? "Story"
                          : analysis.breakdown.recommendedFormat.format ===
                            "comparison"
                          ? "Comparison"
                          : analysis.breakdown.recommendedFormat.format ===
                            "tutorial"
                          ? "Tutorial"
                          : analysis.breakdown.recommendedFormat.format ===
                            "trend"
                          ? "Trend"
                          : analysis.breakdown.recommendedFormat.format}
                      </Badge>
                    </div>
                    {analysis.videoScorePrediction && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Прогноз качества:{" "}
                        {analysis.videoScorePrediction.ifWellAdapted}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4">
                      {onToggleFavorite && (
                        <Button
                          onClick={() => onToggleFavorite(!item.isFavorite)}
                          variant={item.isFavorite ? "default" : "outline"}
                          className="flex-1"
                          size="sm"
                        >
                          <Star
                            className={`h-4 w-4 mr-2 ${
                              item.isFavorite
                                ? "fill-yellow-400 text-yellow-400"
                                : ""
                            }`}
                          />
                          {item.isFavorite
                            ? "В избранном"
                            : "Добавить в избранное"}
                        </Button>
                      )}
                      {onCreateScript && (
                        <Button
                          onClick={() => onCreateScript(item, analysis)}
                          className="flex-1"
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Создать сценарий
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground border rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нажмите "Анализ" для оценки статьи</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
