import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  RefreshCw,
  Clock,
  FileText,
  Star,
  ArrowLeftRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { RevisionDialog } from "@/components/auto-scripts/revision-dialog";
import { AutoScriptCompareModal } from "@/components/auto-scripts/compare-modal";
import { RevisionProgress } from "./components/RevisionProgress";
import { RevisionStatus } from "./components/RevisionStatus";
import { useRevisionProgress } from "./hooks/use-revision-progress";

interface AutoScript {
  id: string;
  title: string;
  scenes: any[];
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
  sourceType: string;
  conveyorItemId: string;
  sourceData?: any;
  analysisData?: any;
}

interface RejectionCategory {
  id: string;
  label: string;
  emoji: string;
}

export default function AutoScriptsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedScript, setSelectedScript] = useState<AutoScript | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCategory, setRejectCategory] = useState("");

  // Get revision progress for selected script
  const { progress: revisionProgress } = useRevisionProgress(
    selectedScript?.conveyorItemId,
    selectedScript?.status === "revision"
  );

  // Fetch scripts - poll every 5s if there's a revision in progress
  const { data: scripts, isLoading } = useQuery<AutoScript[]>({
    queryKey: ["auto-scripts", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/auto-scripts?status=pending", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
    // Auto-refresh every 5s if any script is in revision status
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some(s => s.status === "revision") ? 5000 : false;
    },
  });

  // Update selectedScript when scripts list changes
  useEffect(() => {
    if (selectedScript && scripts) {
      const updated = scripts.find(s => s.id === selectedScript.id);
      if (updated && (
        updated.status !== selectedScript.status ||
        updated.fullScript !== selectedScript.fullScript ||
        updated.finalScore !== selectedScript.finalScore
      )) {
        setSelectedScript(updated);
        // Show toast if revision completed
        if (selectedScript.status === "revision" && updated.status === "pending") {
          toast({
            title: "Ревизия завершена!",
            description: "Сценарий обновлён. Проверьте новую версию.",
          });
        }
      }
    }
  }, [scripts, selectedScript?.id]);

  // Reset revision mutation
  const resetRevisionMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      const res = await fetch(`/api/auto-scripts/${scriptId}/reset-revision`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auto-scripts"] });
      toast({
        title: "Ревизия сброшена",
        description: "Счётчик доработок сброшен",
      });
      if (data.script) {
        setSelectedScript(data.script);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch rejection categories
  const { data: categoriesData } = useQuery<{ categories: RejectionCategory[] }>({
    queryKey: ["rejection-categories"],
    queryFn: async () => {
      const res = await fetch("/api/auto-scripts/rejection-categories", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      const res = await fetch(`/api/auto-scripts/${scriptId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auto-scripts"] });
      toast({
        title: "Сценарий одобрен",
        description: "Проект создан успешно",
      });
      setSelectedScript(null);
      if (data.projectId) {
        navigate(`/project/${data.projectId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      scriptId,
      reason,
      category,
    }: {
      scriptId: string;
      reason: string;
      category: string;
    }) => {
      const res = await fetch(`/api/auto-scripts/${scriptId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, category }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-scripts"] });
      toast({
        title: "Сценарий отклонён",
        description: "Система учтёт ваши предпочтения",
      });
      setRejectDialogOpen(false);
      setSelectedScript(null);
      setRejectReason("");
      setRejectCategory("");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    if (selectedScript && rejectCategory) {
      rejectMutation.mutate({
        scriptId: selectedScript.id,
        reason: rejectReason || "Не указана",
        category: rejectCategory,
      });
    }
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="border-b -mt-6 -mx-6 mb-6">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Сценарии на ревью</h1>
            {scripts && scripts.length > 0 && (
              <Badge variant="secondary">{scripts.length}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-96" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : scripts && scripts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scripts List */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Ожидают ревью</h2>
              {scripts.map((script) => (
                <Card
                  key={script.id}
                  className={`cursor-pointer transition-colors hover:border-primary ${
                    selectedScript?.id === script.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedScript(script)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base line-clamp-1">
                          {script.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {script.formatName}
                          </Badge>
                          <span className="text-xs">
                            {script.estimatedDuration}с
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{script.finalScore}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {script.fullScript.slice(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(script.createdAt), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </span>
                      {script.status === "revision" && (
                        <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          На ревизии
                        </Badge>
                      )}
                      {script.revisionCount > 0 && script.status !== "revision" && (
                        <Badge variant="secondary" className="text-xs">
                          Ревизия #{script.revisionCount}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-8">
              {selectedScript ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedScript.title}</CardTitle>
                    <CardDescription>
                      {selectedScript.formatName} •{" "}
                      {selectedScript.estimatedDuration}с
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scores */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-muted">
                        <div className="text-lg font-bold">
                          {selectedScript.hookScore}
                        </div>
                        <div className="text-xs text-muted-foreground">Хук</div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="text-lg font-bold">
                          {selectedScript.structureScore}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Структура
                        </div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="text-lg font-bold">
                          {selectedScript.emotionalScore}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Эмоции
                        </div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="text-lg font-bold">
                          {selectedScript.ctaScore}
                        </div>
                        <div className="text-xs text-muted-foreground">CTA</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Script Text */}
                    <div className="space-y-2">
                      <Label>Сценарий:</Label>
                      <div className="max-h-64 overflow-y-auto rounded border p-3 text-sm whitespace-pre-wrap">
                        {selectedScript.fullScript}
                      </div>
                    </div>

                    {/* Scenes */}
                    {selectedScript.scenes && selectedScript.scenes.length > 0 && (
                      <div className="space-y-2">
                        <Label>Сцены ({selectedScript.scenes.length}):</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedScript.scenes.map((scene: any, i: number) => (
                            <div
                              key={i}
                              className="p-2 rounded border text-sm"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {scene.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {scene.start}с - {scene.end}с
                                </span>
                              </div>
                              <p className="text-muted-foreground">
                                {scene.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Revision Progress */}
                    {selectedScript.status === "revision" && (
                      <RevisionProgress conveyorItemId={selectedScript.conveyorItemId} />
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => approveMutation.mutate(selectedScript.id)}
                        disabled={approveMutation.isPending || selectedScript.status === "revision"}
                      >
                        <Check className="h-4 w-4" />
                        Одобрить
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setReviseDialogOpen(true)}
                        disabled={selectedScript.revisionCount >= 5 || selectedScript.status === "revision"}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Доработать
                      </Button>
                      <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={selectedScript.status === "revision"}
                      >
                        <X className="h-4 w-4" />
                        Отклонить
                      </Button>
                    </div>

                    {/* Additional actions row */}
                    {selectedScript.revisionCount > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => setCompareDialogOpen(true)}
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                          Сравнить версии
                        </Button>
                      </div>
                    )}

                    <RevisionStatus
                      status={selectedScript.status as "pending" | "approved" | "rejected" | "revision"}
                      revisionCount={selectedScript.revisionCount}
                      onReset={() => resetRevisionMutation.mutate(selectedScript.id)}
                      isResetting={resetRevisionMutation.isPending}
                      progressStatus={revisionProgress?.status}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Выберите сценарий для просмотра</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Нет сценариев на ревью</h3>
              <p className="text-muted-foreground mb-4">
                Content Factory пока не создал новых сценариев
              </p>
              <Button variant="outline" onClick={() => navigate("/settings")}>
                Настроить Content Factory
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить сценарий</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения. Система учтёт это для улучшения
              будущих сценариев.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Категория *</Label>
              <Select value={rejectCategory} onValueChange={setRejectCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите причину" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Комментарий (опционально)</Label>
              <Textarea
                placeholder="Дополнительные детали..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectCategory || rejectMutation.isPending}
            >
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog with scene selection */}
      {selectedScript && (
        <RevisionDialog
          open={reviseDialogOpen}
          onClose={() => setReviseDialogOpen(false)}
          script={selectedScript}
          maxRevisions={5}
        />
      )}

      {/* Compare Versions Modal */}
      {selectedScript && (
        <AutoScriptCompareModal
          open={compareDialogOpen}
          onClose={() => setCompareDialogOpen(false)}
          scriptId={selectedScript.id}
          scriptTitle={selectedScript.title}
        />
      )}
    </Layout>
  );
}
