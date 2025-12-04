import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  History,
  Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Scene {
  id: number;
  label: string;
  text: string;
  start: number;
  end: number;
  visualNotes?: string;
}

interface AutoScript {
  id: string;
  title: string;
  scenes: Scene[];
  fullScript: string;
  formatId: string;
  formatName: string;
  estimatedDuration: number;
  finalScore: number;
  hookScore: number;
  structureScore: number;
  emotionalScore: number;
  ctaScore: number;
  gateDecision: string;
  status: string;
  revisionCount: number;
  createdAt: string;
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
  feedbackSceneIds: number[] | null;
  isCurrent: boolean;
  createdAt: string;
}

interface RevisionDialogProps {
  open: boolean;
  onClose: () => void;
  script: AutoScript;
  maxRevisions?: number;
}

export function RevisionDialog({
  open,
  onClose,
  script,
  maxRevisions = 5,
}: RevisionDialogProps) {
  const { toast } = useToast();
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedSceneIds, setSelectedSceneIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"feedback" | "history">("feedback");

  // Fetch version history for this script
  const { data: versionsData, isLoading: versionsLoading } = useQuery<{
    versions: AutoScriptVersion[];
    currentVersion: number;
  }>({
    queryKey: ["auto-script-versions", script.id],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`/api/auto-scripts/${script.id}/versions`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        // If no versions yet, return empty
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
  const currentVersionNumber = versionsData?.currentVersion || script.revisionCount + 1;
  const canRevise = currentVersionNumber < maxRevisions;

  // Submit revision mutation
  const reviseMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch(`/api/auto-scripts/${script.id}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          feedbackText: feedbackText.trim(),
          selectedSceneIds: selectedSceneIds.length > 0 ? selectedSceneIds : null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        // Show validation errors if available
        if (error.errors && Array.isArray(error.errors)) {
          const errorMessages = error.errors.map((e: any) => e.message).join(", ");
          throw new Error(errorMessages || error.message || "Failed to submit revision");
        }
        throw new Error(error.message || "Failed to submit revision");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-scripts"] });
      queryClient.invalidateQueries({ queryKey: ["auto-script-versions", script.id] });
      toast({
        title: "Запрос на доработку отправлен",
        description: "AI создаст улучшенную версию на основе ваших замечаний",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFeedbackText("");
    setSelectedSceneIds([]);
    setActiveTab("feedback");
    onClose();
  };

  const handleSceneToggle = (sceneIndex: number) => {
    setSelectedSceneIds((prev) =>
      prev.includes(sceneIndex)
        ? prev.filter((id) => id !== sceneIndex)
        : [...prev, sceneIndex]
    );
  };

  const handleSelectAll = () => {
    if (selectedSceneIds.length === script.scenes.length) {
      setSelectedSceneIds([]);
    } else {
      setSelectedSceneIds(script.scenes.map((_, i) => i));
    }
  };

  const handleSubmit = () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Введите рецензию",
        description: "Опишите, что нужно изменить в сценарии",
        variant: "destructive",
      });
      return;
    }
    reviseMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Доработка сценария
          </DialogTitle>
          <DialogDescription>
            Версия {currentVersionNumber} из {maxRevisions}. Выберите сцены для
            переписывания и опишите замечания.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "feedback" | "history")}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="feedback" className="gap-2">
              <FileText className="h-4 w-4" />
              Рецензия
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              История версий
              {versions.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {versions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Feedback Tab */}
          <TabsContent
            value="feedback"
            className="flex-1 overflow-hidden flex flex-col mt-4"
          >
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left: Scene Selection */}
              <div className="space-y-3 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Выберите сцены для переписывания
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {selectedSceneIds.length === script.scenes.length
                      ? "Снять все"
                      : "Выбрать все"}
                  </Button>
                </div>

                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-3 space-y-2">
                    {script.scenes.map((scene, index) => {
                      const isSelected = selectedSceneIds.includes(index);
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleSceneToggle(index)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSceneToggle(index)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {scene.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {scene.start}с - {scene.end}с
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {scene.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {selectedSceneIds.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Выбрано: {selectedSceneIds.length} из {script.scenes.length}{" "}
                    сцен
                  </div>
                )}
              </div>

              {/* Right: Feedback Form */}
              <div className="space-y-3 overflow-hidden flex flex-col">
                <Label htmlFor="feedback" className="text-sm font-medium">
                  Ваши замечания и рецензия *
                </Label>
                <Textarea
                  id="feedback"
                  placeholder={`Опишите, что не так со сценарием и как его улучшить.

Примеры:
• Начало слишком банальное, нужен более провокационный хук
• Убрать клише типа "СТОП!" и "А вы знали?"
• Добавить конкретные цифры и факты
• Сделать тон более уверенным и экспертным
• Слишком много вопросов, нужны утверждения`}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="flex-1 resize-none min-h-[200px]"
                />

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <Brain className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>AI будет учиться на ваших замечаниях.</strong> Чем
                    подробнее вы опишете, что не нравится - тем лучше будущие
                    сценарии.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent
            value="history"
            className="flex-1 overflow-hidden mt-4"
          >
            {versionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mb-4 opacity-50" />
                <p>Это первая версия сценария</p>
                <p className="text-sm">История появится после первой доработки</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-4 p-1">
                  {versions.map((version, index) => (
                    <Card
                      key={version.id}
                      className={version.isCurrent ? "border-primary" : ""}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            Версия {version.versionNumber}
                            {version.isCurrent && (
                              <Badge variant="default">Текущая</Badge>
                            )}
                          </CardTitle>
                          {version.finalScore && (
                            <Badge variant="outline">
                              Оценка: {version.finalScore}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {version.feedbackText && (
                          <div className="text-sm">
                            <span className="font-medium">Замечания:</span>
                            <p className="text-muted-foreground mt-1">
                              {version.feedbackText}
                            </p>
                          </div>
                        )}
                        {version.feedbackSceneIds &&
                          version.feedbackSceneIds.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Сцены:
                              </span>
                              {version.feedbackSceneIds.map((id) => (
                                <Badge key={id} variant="secondary">
                                  {id + 1}
                                </Badge>
                              ))}
                            </div>
                          )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(version.createdAt).toLocaleString("ru-RU")}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <DialogFooter>
          {!canRevise && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mr-auto">
              <AlertCircle className="h-4 w-4" />
              Достигнут лимит доработок ({maxRevisions})
            </div>
          )}
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !feedbackText.trim() ||
              !canRevise ||
              reviseMutation.isPending
            }
            className="gap-2"
          >
            {reviseMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Отправить на доработку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
