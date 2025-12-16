import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Loader2,
  Play,
  Eye,
  Heart,
  MessageCircle,
  PlayCircle,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useProxyImage } from "../hooks/use-proxy-image";

export interface InstagramReelListItemProps {
  item: any; // Instagram Reel item
  analysis?: any;
  isAnalyzing?: boolean;
  onAnalyze?: (item: any) => void;
  onCreateScript?: (item: any, analysis?: any) => void;
  isCreatingScript?: boolean;
}

export function InstagramReelListItem({
  item,
  analysis,
  isAnalyzing,
  onAnalyze,
  onCreateScript,
  isCreatingScript,
}: InstagramReelListItemProps) {
  const [showFullTranscription, setShowFullTranscription] = useState(false);

  const hasTranscription = item.transcriptionText && item.transcriptionStatus === "completed";
  const hasAiScore = typeof item.aiScore === "number";
  const canAnalyze = hasTranscription && !hasAiScore;
  const canCreateScript = hasTranscription && (hasAiScore || analysis);

  // Use proxy image hook to load Instagram thumbnail
  const { proxyUrl, isLoading: imageLoading, error: imageError } = useProxyImage(item.thumbnailUrl);

  // Get freshness label based on timestamp
  const getFreshnessLabel = () => {
    if (!item.timestamp) return null;
    const hoursAgo = (Date.now() - new Date(item.timestamp).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) return "hot";
    if (hoursAgo < 72) return "trending";
    if (hoursAgo < 168) return "recent";
    return "old";
  };

  const freshnessLabel = getFreshnessLabel();
  const freshnessColors = {
    hot: "bg-red-500",
    trending: "bg-orange-500",
    recent: "bg-blue-500",
    old: "bg-gray-500",
  };

  return (
    <Card className={item.userAction === "selected" ? "border-green-500 dark:border-green-600" : ""}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left: Reel Content */}
        <div className="space-y-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-24 h-32 bg-muted rounded-md overflow-hidden flex items-center justify-center">
              {imageLoading && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
              {!imageLoading && !imageError && proxyUrl && (
                <img
                  src={proxyUrl}
                  alt="Reel thumbnail"
                  className="w-full h-full object-cover"
                />
              )}
              {!imageLoading && imageError && (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
              {freshnessLabel && !imageLoading && (
                <div
                  className={`absolute top-1 right-1 ${
                    freshnessColors[freshnessLabel as keyof typeof freshnessColors]
                  } text-white text-xs px-2 py-0.5 rounded`}
                >
                  {freshnessLabel === "hot"
                    ? "🔥"
                    : freshnessLabel === "trending"
                    ? "📈"
                    : freshnessLabel === "recent"
                    ? "🆕"
                    : ""}
                </div>
              )}
            </div>

            {/* Reel Info */}
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold text-lg">@{item.ownerUsername}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {item.timestamp && (
                    <span>
                      {formatDistanceToNow(new Date(item.timestamp), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  )}
                  {item.videoDuration && (
                    <>
                      <span>•</span>
                      <span>{Math.round(item.videoDuration)}s</span>
                    </>
                  )}
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {item.likesCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{item.likesCount.toLocaleString()}</span>
                  </div>
                )}
                {item.commentsCount > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{item.commentsCount.toLocaleString()}</span>
                  </div>
                )}
                {item.videoViewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <PlayCircle className="h-4 w-4" />
                    <span>{item.videoViewCount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* AI Scores */}
              {hasAiScore && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">AI Score:</span>
                  <ScoreBadge score={item.aiScore} size="sm" />
                  {item.freshnessScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Freshness: {item.freshnessScore}
                    </Badge>
                  )}
                  {item.viralityScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Virality: {item.viralityScore}
                    </Badge>
                  )}
                  {item.qualityScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Quality: {item.qualityScore}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          {item.caption && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Caption</Label>
              <p className="text-sm line-clamp-3">{item.caption}</p>
            </div>
          )}

          {/* Transcription */}
          {hasTranscription && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Transcription ({item.language || "Unknown"})
              </Label>
              <div className="p-3 bg-muted/50 rounded-md border">
                <p className={`text-sm whitespace-pre-wrap ${!showFullTranscription ? "line-clamp-4" : ""}`}>
                  {item.transcriptionText}
                </p>
                {item.transcriptionText && item.transcriptionText.length > 200 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFullTranscription(!showFullTranscription)}
                    className="mt-2 h-auto p-0 text-xs"
                  >
                    {showFullTranscription ? "Показать меньше" : "Показать полностью"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.transcriptionText?.length || 0} characters
              </p>
            </div>
          )}

          {/* View on Instagram */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(item.url, "_blank")}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Открыть в Instagram
          </Button>

          {item.userAction === "selected" && (
            <Badge variant="outline" className="w-full justify-center">
              <Play className="h-3 w-3 mr-1" />
              Used in project
            </Badge>
          )}
        </div>

        {/* Right: Analysis */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">AI Анализ</h4>
            {canAnalyze && onAnalyze && (
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
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Анализ
                  </>
                )}
              </Button>
            )}
          </div>

          {hasAiScore || analysis ? (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              {/* Overall Score */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Общая оценка:</span>
                <ScoreBadge score={item.aiScore || analysis?.score || 0} />
              </div>

              {/* AI Comment */}
              {item.aiComment && (
                <div className="p-3 bg-muted/50 rounded text-sm italic border-l-2 border-primary/50">
                  {item.aiComment}
                </div>
              )}

              {/* Breakdown Scores */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                {item.freshnessScore !== null && (
                  <div>
                    <span className="text-xs text-muted-foreground">Свежесть:</span>
                    <p className="text-sm font-medium">{item.freshnessScore}/100</p>
                  </div>
                )}
                {item.viralityScore !== null && (
                  <div>
                    <span className="text-xs text-muted-foreground">Вирусность:</span>
                    <p className="text-sm font-medium">{item.viralityScore}/100</p>
                  </div>
                )}
                {item.qualityScore !== null && (
                  <div>
                    <span className="text-xs text-muted-foreground">Качество:</span>
                    <p className="text-sm font-medium">{item.qualityScore}/100</p>
                  </div>
                )}
              </div>

              {/* Create Script Button */}
              {canCreateScript && onCreateScript && (
                <div className="mt-4 p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Готов создать сценарий?</span>
                    <Badge variant="outline" className="text-xs">
                      Instagram Reel
                    </Badge>
                  </div>
                  {item.aiScore && (
                    <p className="text-xs text-muted-foreground mb-3">
                      AI Score: {item.aiScore}/100
                    </p>
                  )}
                  <Button
                    onClick={() => onCreateScript(item, analysis)}
                    className="w-full"
                    size="sm"
                    disabled={isCreatingScript}
                  >
                    {isCreatingScript ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Создать сценарий
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : !hasTranscription ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
              <Loader2 className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
              <p className="text-sm">Ожидание транскрипции...</p>
              <p className="text-xs mt-1">
                Статус: {item.transcriptionStatus || "pending"}
              </p>
            </div>
          ) : !canAnalyze ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Анализ уже выполнен</p>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нажмите "Анализ" для оценки рилса</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
