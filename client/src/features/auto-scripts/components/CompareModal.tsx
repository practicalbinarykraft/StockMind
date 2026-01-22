import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";

interface Scene {
  id: number;
  label: string;
  text: string;
  start: number;
  end: number;
}

interface AutoScriptVersion {
  id: string;
  versionNumber: number;
  title: string;
  scenes: Scene[];
  fullScript: string;
  finalScore: number | null;
  hookScore: number | null;
  structureScore: number | null;
  emotionalScore: number | null;
  ctaScore: number | null;
  feedbackText: string | null;
  isCurrent: boolean;
  createdAt: string;
}

interface SceneDiff {
  sceneIndex: number;
  sceneName: string;
  before: string;
  after: string;
}

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  scriptId: string;
  scriptTitle: string;
}

export function AutoScriptCompareModal({
  open,
  onClose,
  scriptId,
  scriptTitle,
}: CompareModalProps) {
  const [leftVersionId, setLeftVersionId] = useState<string>("");
  const [rightVersionId, setRightVersionId] = useState<string>("");

  // Fetch all versions
  const { data: versionsData, isLoading } = useQuery<{
    versions: AutoScriptVersion[];
    currentVersion: number;
  }>({
    queryKey: ["auto-script-versions", scriptId],
    queryFn: async () => {
      const res = await fetch(`/api/auto-scripts/${scriptId}/versions`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) {
          return { versions: [], currentVersion: 1 };
        }
        throw new Error("Failed to fetch versions");
      }
      return res.json();
    },
    enabled: open,
  });

  const versions = versionsData?.versions || [];

  // Auto-select versions on first load (moved to useEffect to avoid setState in render)
  useEffect(() => {
    if (versions.length >= 2 && !leftVersionId && !rightVersionId) {
      setLeftVersionId(versions[1]?.id || "");
      setRightVersionId(versions[0]?.id || "");
    }
  }, [versions, leftVersionId, rightVersionId]);

  const leftVersion = versions.find((v) => v.id === leftVersionId);
  const rightVersion = versions.find((v) => v.id === rightVersionId);

  // Calculate diffs between scenes
  const sceneDiffs: SceneDiff[] = [];
  if (leftVersion && rightVersion) {
    const maxScenes = Math.max(
      leftVersion.scenes.length,
      rightVersion.scenes.length
    );
    for (let i = 0; i < maxScenes; i++) {
      const leftScene = leftVersion.scenes[i];
      const rightScene = rightVersion.scenes[i];

      if (leftScene?.text !== rightScene?.text) {
        sceneDiffs.push({
          sceneIndex: i,
          sceneName: leftScene?.label || rightScene?.label || `Сцена ${i + 1}`,
          before: leftScene?.text || "(отсутствует)",
          after: rightScene?.text || "(отсутствует)",
        });
      }
    }
  }

  // Calculate score deltas
  const calculateDelta = (
    left: number | null,
    right: number | null
  ): number | null => {
    if (left === null || right === null) return null;
    return right - left;
  };

  const DeltaBadge = ({ delta }: { delta: number | null }) => {
    if (delta === null) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          —
        </Badge>
      );
    }

    const isPositive = delta > 0;
    const isNeutral = delta === 0;

    if (isNeutral) {
      return (
        <Badge variant="outline" className="gap-1">
          0
        </Badge>
      );
    }

    return (
      <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {isPositive ? "+" : ""}
        {delta}
      </Badge>
    );
  };

  const ScoreCard = ({
    label,
    leftScore,
    rightScore,
  }: {
    label: string;
    leftScore: number | null;
    rightScore: number | null;
  }) => (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium w-8 text-right">
          {leftScore ?? "—"}
        </span>
        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-medium w-8">{rightScore ?? "—"}</span>
        <DeltaBadge delta={calculateDelta(leftScore, rightScore)} />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Сравнение версий: {scriptTitle}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : versions.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>Недостаточно версий для сравнения</p>
            <p className="text-sm">Сделайте хотя бы одну доработку</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Version Selectors */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Версия ДО (слева)
                </label>
                <Select value={leftVersionId} onValueChange={setLeftVersionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите версию" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={v.id === rightVersionId}
                      >
                        v{v.versionNumber}
                        {v.isCurrent && " (текущая)"}
                        {v.finalScore && ` • ${v.finalScore} баллов`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-6" />

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Версия ПОСЛЕ (справа)
                </label>
                <Select
                  value={rightVersionId}
                  onValueChange={setRightVersionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите версию" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={v.id === leftVersionId}
                      >
                        v{v.versionNumber}
                        {v.isCurrent && " (текущая)"}
                        {v.finalScore && ` • ${v.finalScore} баллов`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {leftVersion && rightVersion && (
              <Tabs defaultValue="scenes" className="flex-1 overflow-hidden">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scenes">Сцены</TabsTrigger>
                  <TabsTrigger value="script">Полный текст</TabsTrigger>
                  <TabsTrigger value="scores">Оценки</TabsTrigger>
                </TabsList>

                {/* Scenes Tab */}
                <TabsContent value="scenes" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[500px]">
                    {sceneDiffs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                        <p>Сцены идентичны</p>
                      </div>
                    ) : (
                      <div className="space-y-4 p-1">
                        {/* Header */}
                        <div className="grid grid-cols-2 gap-4 sticky top-0 bg-background pb-2 border-b">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <div className="h-3 w-3 rounded-full bg-red-500/50" />
                            v{leftVersion.versionNumber} (До)
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <div className="h-3 w-3 rounded-full bg-green-500/50" />
                            v{rightVersion.versionNumber} (После)
                          </div>
                        </div>

                        {sceneDiffs.map((diff) => (
                          <div key={diff.sceneIndex} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{diff.sceneName}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Сцена {diff.sceneIndex + 1}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-md border border-red-500/20 bg-red-500/5">
                                <p className="text-sm whitespace-pre-wrap">
                                  {diff.before}
                                </p>
                              </div>
                              <div className="p-3 rounded-md border border-green-500/20 bg-green-500/5">
                                <p className="text-sm whitespace-pre-wrap">
                                  {diff.after}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Full Script Tab */}
                <TabsContent value="script" className="flex-1 overflow-hidden">
                  <div className="grid grid-cols-2 gap-4 h-[500px]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                        <div className="h-3 w-3 rounded-full bg-red-500/50" />
                        v{leftVersion.versionNumber} (До)
                      </div>
                      <ScrollArea className="flex-1 border rounded-md">
                        <div className="p-3 text-sm whitespace-pre-wrap">
                          {leftVersion.fullScript}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                        <div className="h-3 w-3 rounded-full bg-green-500/50" />
                        v{rightVersion.versionNumber} (После)
                      </div>
                      <ScrollArea className="flex-1 border rounded-md">
                        <div className="p-3 text-sm whitespace-pre-wrap">
                          {rightVersion.fullScript}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                {/* Scores Tab */}
                <TabsContent value="scores" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4 p-1">
                      {/* Overall Score */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Общая оценка</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold">
                                {leftVersion.finalScore ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                v{leftVersion.versionNumber}
                              </div>
                            </div>
                            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                            <div className="text-center">
                              <div className="text-3xl font-bold">
                                {rightVersion.finalScore ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                v{rightVersion.versionNumber}
                              </div>
                            </div>
                            <DeltaBadge
                              delta={calculateDelta(
                                leftVersion.finalScore,
                                rightVersion.finalScore
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Breakdown */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Детализация по зонам
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <ScoreCard
                            label="Хук"
                            leftScore={leftVersion.hookScore}
                            rightScore={rightVersion.hookScore}
                          />
                          <ScoreCard
                            label="Структура"
                            leftScore={leftVersion.structureScore}
                            rightScore={rightVersion.structureScore}
                          />
                          <ScoreCard
                            label="Эмоции"
                            leftScore={leftVersion.emotionalScore}
                            rightScore={rightVersion.emotionalScore}
                          />
                          <ScoreCard
                            label="CTA"
                            leftScore={leftVersion.ctaScore}
                            rightScore={rightVersion.ctaScore}
                          />
                        </CardContent>
                      </Card>

                      {/* Feedback History */}
                      {(leftVersion.feedbackText ||
                        rightVersion.feedbackText) && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              Рецензии к версиям
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {leftVersion.feedbackText && (
                              <div>
                                <div className="text-xs font-medium mb-1">
                                  v{leftVersion.versionNumber}:
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {leftVersion.feedbackText}
                                </p>
                              </div>
                            )}
                            {rightVersion.feedbackText && (
                              <div>
                                <div className="text-xs font-medium mb-1">
                                  v{rightVersion.versionNumber}:
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {rightVersion.feedbackText}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
