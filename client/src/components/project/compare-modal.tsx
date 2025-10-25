import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface CompareData {
  base: {
    versionId: string;
    overallScore: number;
    metrics: {
      estimatedRetention: string;
      estimatedSaves: string;
      estimatedShares: string;
    };
    scenes: Array<{
      sceneNumber: number;
      text: string;
      score: number;
    }>;
  };
  candidate: {
    versionId: string;
    overallScore: number;
    metrics: {
      estimatedRetention: string;
      estimatedSaves: string;
      estimatedShares: string;
    };
    scenes: Array<{
      sceneNumber: number;
      text: string;
      score: number;
    }>;
  };
  deltas: {
    overallScoreDelta: number;
    scenes: Array<{
      sceneNumber: number;
      scoreDelta: number;
    }>;
  };
}

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CompareModal({ open, onClose, projectId }: CompareModalProps) {
  const { toast } = useToast();

  useEffect(() => {
    console.log('[CompareModal] open=', open);
  }, [open]);

  // Load comparison data when modal opens
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/projects', projectId, 'reanalyze', 'compare', 'latest'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/reanalyze/compare/latest`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: open && !!projectId,
    retry: false
  });

  // Choose version mutation
  const chooseMutation = useMutation({
    mutationFn: async (keep: 'base' | 'candidate') => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/reanalyze/compare/choose`, { keep });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      return json;
    },
    onSuccess: async () => {
      toast({
        title: "Выбор сохранен",
      });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script-history"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scene-recommendations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const DeltaBadge = ({ delta }: { delta: number }) => {
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
    isPrimary 
  }: { 
    version: CompareData['base'] | CompareData['candidate']; 
    title: string;
    isPrimary: boolean;
  }) => (
    <div className="flex-1 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="text-4xl font-bold" data-testid={`text-score-${isPrimary ? 'base' : 'candidate'}`}>
          {version.overallScore}
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Прогнозные метрики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between" data-testid={`text-retention-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Удержание:</span>
            <span className="font-medium">{version.metrics.estimatedRetention}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-saves-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Сохранения:</span>
            <span className="font-medium">{version.metrics.estimatedSaves}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-shares-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Репосты:</span>
            <span className="font-medium">{version.metrics.estimatedShares}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Сцены ({version.scenes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {version.scenes.map((scene, idx) => (
            <div 
              key={idx} 
              className="text-xs p-2 rounded bg-muted/50"
              data-testid={`text-scene-${isPrimary ? 'base' : 'candidate'}-${scene.sceneNumber}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Сцена {scene.sceneNumber}</span>
                <Badge variant="outline" className="text-xs">
                  {scene.score}
                </Badge>
              </div>
              <p className="text-muted-foreground line-clamp-2">{scene.text}</p>
            </div>
          ))}
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
          <DialogTitle>Сравнение версий (ДО / ПОСЛЕ)</DialogTitle>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Загружаем сравнение…</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-center max-w-md">
              {error?.message === 'No candidate version found' || (error as any)?.status === 404
                ? 'Нет версии для сравнения. Сначала нажмите "Сделать версию для сравнения".'
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

        {/* Success state - show comparison */}
        {data && !isLoading && !isError && (
          <>
            {/* Overall Delta */}
            <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Изменение общего балла:</span>
              <DeltaBadge delta={data.deltas.overallScoreDelta} />
            </div>

            {/* Side-by-side comparison */}
            <div className="flex gap-6">
              <VersionColumn 
                version={data.base}
                title="ДО (Базовая версия)"
                isPrimary={true}
              />

              <div className="flex items-center">
                <div className="h-px w-8 bg-border" />
              </div>

              <VersionColumn 
                version={data.candidate}
                title="ПОСЛЕ (Новая версия)"
                isPrimary={false}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => chooseMutation.mutate('base')}
                disabled={chooseMutation.isPending}
                data-testid="button-choose-base"
                className="flex-1"
              >
                {chooseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Оставить ДО
              </Button>

              <Button
                type="button"
                onClick={() => chooseMutation.mutate('candidate')}
                disabled={chooseMutation.isPending}
                data-testid="button-choose-candidate"
                className="flex-1"
              >
                {chooseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Выбрать ПОСЛЕ
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
