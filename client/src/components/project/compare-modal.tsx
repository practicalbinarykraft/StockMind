import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface Scene {
  id: number;
  text: string;
}

interface CompareData {
  status?: 'done' | 'running';
  base: {
    id: string;
    overall: number;
    breakdown: {
      hook: number;
      structure: number;
      emotional: number;
      cta: number;
    };
    review: string;
    scenes: Scene[];
  };
  candidate: {
    id: string;
    overall: number;
    breakdown: {
      hook: number;
      structure: number;
      emotional: number;
      cta: number;
    };
    review: string;
    scenes: Scene[];
  };
  delta: {
    overall: number | null;
    hook: number | null;
    structure: number | null;
    emotional: number | null;
    cta: number | null;
  };
}

interface JobStatus {
  status: 'queued' | 'running' | 'done' | 'error';
  progress?: number;
  step?: string;
  error?: string;
  canRetry?: boolean;
}

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  reanalyzeJobId?: string | null;
  jobStatus?: JobStatus | null;
  onNavigateToVoice?: () => void;
  baseVersionId?: string;
  targetVersionId?: string;
}

export function CompareModal({ open, onClose, projectId, reanalyzeJobId, jobStatus, onNavigateToVoice, baseVersionId, targetVersionId }: CompareModalProps) {
  const { toast } = useToast();
  
  // Determine if job is currently running
  const isJobRunning = !!(reanalyzeJobId && jobStatus && jobStatus.status !== 'done' && jobStatus.status !== 'error');

  // Use new endpoint if both version IDs are provided, otherwise fall back to legacy endpoint
  const useNewEndpoint = !!(baseVersionId && targetVersionId);
  
  useEffect(() => {
    console.log('[CompareModal] open=', open, 'jobRunning=', isJobRunning, 'useNewEndpoint=', useNewEndpoint);
  }, [open, isJobRunning, useNewEndpoint]);

  // Load comparison data when modal opens (with polling if analysis running)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: useNewEndpoint 
      ? ['/api/projects', projectId, 'compare', baseVersionId, targetVersionId]
      : ['/api/projects', projectId, 'reanalyze', 'compare', 'latest'],
    queryFn: async () => {
      const endpoint = useNewEndpoint
        ? `/api/projects/${projectId}/compare?baseVersionId=${baseVersionId}&targetVersionId=${targetVersionId}`
        : `/api/projects/${projectId}/reanalyze/compare/latest`;
      
      const res = await apiRequest('GET', endpoint);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: open && !!projectId,
    retry: false,
    // Poll every 2 seconds if analysis is running
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'running' ? 2000 : false;
    }
  });

  // Choose version mutation
  const chooseMutation = useMutation({
    mutationFn: async (keep: 'base' | 'candidate') => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/reanalyze/compare/choose`, { keep });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      return { ...json, keep };
    },
    onSuccess: async (data: any) => {
      const wasCandidate = data.keep === 'candidate';
      toast({
        title: wasCandidate ? "Новая версия принята" : "Текущая версия сохранена",
        description: wasCandidate ? "Создана новая версия и назначена текущей" : "Версия отклонена",
      });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script-history"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scene-recommendations"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "reanalyze"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const DeltaBadge = ({ delta }: { delta: number | null }) => {
    // If analysis not complete, don't show delta
    if (delta === null) {
      return <Badge variant="outline" className="gap-1 text-muted-foreground">—</Badge>;
    }
    
    const isPositive = delta > 0;
    const isNeutral = delta === 0;
    
    if (isNeutral) {
      return <Badge variant="outline" className="gap-1">0</Badge>;
    }
    
    return (
      <Badge 
        variant={isPositive ? "default" : "destructive"} 
        className="gap-1"
        data-testid={`badge-delta-${isPositive ? 'positive' : 'negative'}`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{delta}
      </Badge>
    );
  };

  const VersionColumn = ({ 
    version, 
    title, 
    isPrimary,
    isRunning 
  }: { 
    version: CompareData['base'] | CompareData['candidate']; 
    title: string;
    isPrimary: boolean;
    isRunning?: boolean;
  }) => (
    <div className="flex-1 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {isRunning ? (
          <Skeleton className="h-12 w-32 mx-auto" data-testid={`skeleton-score-${isPrimary ? 'base' : 'candidate'}`} />
        ) : (
          <div className="text-4xl font-bold" data-testid={`text-score-${isPrimary ? 'base' : 'candidate'}`}>
            {version.overall}
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Оценки по зонам</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between" data-testid={`text-hook-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Хук:</span>
            {isRunning ? <Skeleton className="h-5 w-12" /> : <span className="font-medium">{version.breakdown.hook}</span>}
          </div>
          <div className="flex justify-between" data-testid={`text-structure-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Структура:</span>
            {isRunning ? <Skeleton className="h-5 w-12" /> : <span className="font-medium">{version.breakdown.structure}</span>}
          </div>
          <div className="flex justify-between" data-testid={`text-emotional-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Эмоции:</span>
            {isRunning ? <Skeleton className="h-5 w-12" /> : <span className="font-medium">{version.breakdown.emotional}</span>}
          </div>
          <div className="flex justify-between" data-testid={`text-cta-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">CTA:</span>
            {isRunning ? <Skeleton className="h-5 w-12" /> : <span className="font-medium">{version.breakdown.cta}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Рецензия AI архитектора</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground whitespace-pre-wrap">
          {isRunning ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            version.review
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
        data-testid="modal-compare"
      >
        <DialogHeader>
          <DialogTitle>Сравнение версий: Текущая ↔ Новая</DialogTitle>
        </DialogHeader>

        {/* Loading state (initial load) */}
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Загружаем сравнение…</p>
          </div>
        )}

        {/* Error state */}
        {isError && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-center max-w-md">
              {error?.message === 'No candidate version found' || (error as any)?.status === 404
                ? 'Нет версии для сравнения. Сначала нажмите "Сохранить новую версию".'
                : `Ошибка загрузки: ${error?.message || 'Неизвестная ошибка'}`}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-close-error"
            >
              Закрыть
            </Button>
          </div>
        )}

        {/* Comparison view (shows skeleton if analysis running) */}
        {data && (
          <div className="space-y-4">
            {/* Analysis running banner */}
            {data.status === 'running' && (
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Анализируем новую версию...</p>
                  <p className="text-xs text-muted-foreground">Метрики будут доступны через несколько секунд</p>
                </div>
              </div>
            )}

            <Tabs defaultValue="metrics" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="metrics" data-testid="tab-metrics">Метрики</TabsTrigger>
                <TabsTrigger value="scenes" data-testid="tab-scenes">Сцены</TabsTrigger>
              </TabsList>

            {/* Tab 1: Metrics */}
            <TabsContent value="metrics" className="space-y-4">
              {/* Overall Delta */}
              <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Изменение общего балла:</span>
                <DeltaBadge delta={data.delta.overall} />
              </div>

              {/* Breakdown deltas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Изменения по зонам</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground mb-1">Хук</div>
                    <DeltaBadge delta={data.delta.hook} />
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground mb-1">Структура</div>
                    <DeltaBadge delta={data.delta.structure} />
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground mb-1">Эмоции</div>
                    <DeltaBadge delta={data.delta.emotional} />
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground mb-1">CTA</div>
                    <DeltaBadge delta={data.delta.cta} />
                  </div>
                </CardContent>
              </Card>

              {/* Side-by-side comparison */}
              <div className="flex gap-6">
                <VersionColumn 
                  version={data.base}
                  title="ДО (Базовая версия)"
                  isPrimary={true}
                  isRunning={data.status === 'running'}
                />

                <div className="flex items-center">
                  <div className="h-px w-8 bg-border" />
                </div>

                <VersionColumn 
                  version={data.candidate}
                  title="ПОСЛЕ (Новая версия)"
                  isPrimary={false}
                  isRunning={data.status === 'running'}
                />
              </div>
            </TabsContent>

            {/* Tab 2: Scenes */}
            <TabsContent value="scenes" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Base scenes */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-center">ДО (Базовая версия)</h3>
                  {data.base.scenes.map((scene: Scene) => {
                    const candidateScene = data.candidate.scenes.find((s: Scene) => s.id === scene.id);
                    const isChanged = candidateScene && candidateScene.text !== scene.text;
                    
                    return (
                      <Card key={scene.id} className={isChanged ? "border-amber-500" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Сцена {scene.id}</CardTitle>
                            {isChanged && <Badge variant="outline" className="text-xs">Изменена</Badge>}
                            {!isChanged && <Badge variant="secondary" className="text-xs">Без изменений</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scene.text}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Candidate scenes */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-center">ПОСЛЕ (Новая версия)</h3>
                  {data.candidate.scenes.map((scene: Scene) => {
                    const baseScene = data.base.scenes.find((s: Scene) => s.id === scene.id);
                    const isChanged = baseScene && baseScene.text !== scene.text;
                    
                    return (
                      <Card key={scene.id} className={isChanged ? "border-green-500" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Сцена {scene.id}</CardTitle>
                            {isChanged && <Badge variant="outline" className="text-xs">Изменена</Badge>}
                            {!isChanged && <Badge variant="secondary" className="text-xs">Без изменений</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scene.text}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action buttons - outside tabs */}
          <div className="space-y-3 pt-4 border-t mt-4">
              {/* Version choice buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => chooseMutation.mutate('base')}
                  disabled={chooseMutation.isPending || data.status === 'running'}
                  data-testid="button-choose-base"
                  className="flex-1"
                >
                  {chooseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Оставить текущую
                </Button>

                <Button
                  type="button"
                  onClick={() => chooseMutation.mutate('candidate')}
                  disabled={chooseMutation.isPending || data.status === 'running'}
                  data-testid="button-choose-candidate"
                  className="flex-1"
                >
                  {chooseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Принять новую версию
                </Button>
              </div>

              {/* Navigation buttons (only shown if onNavigateToVoice provided) */}
              {onNavigateToVoice && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    data-testid="button-back-to-editing"
                    className="flex-1"
                  >
                    Вернуться к редактированию
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    onClick={onNavigateToVoice}
                    data-testid="button-navigate-to-voice"
                    className="flex-1"
                  >
                    Перейти к озвучке
                  </Button>
                </div>
              )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
