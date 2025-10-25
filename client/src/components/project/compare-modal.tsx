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
    id: string;
    overall: number;
    breakdown: {
      hook: number;
      structure: number;
      emotional: number;
      cta: number;
    };
    review: string;
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
  };
  delta: {
    overall: number;
    hook: number;
    structure: number;
    emotional: number;
    cta: number;
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
          {version.overall}
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Оценки по зонам</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between" data-testid={`text-hook-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Хук:</span>
            <span className="font-medium">{version.breakdown.hook}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-structure-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Структура:</span>
            <span className="font-medium">{version.breakdown.structure}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-emotional-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Эмоции:</span>
            <span className="font-medium">{version.breakdown.emotional}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-cta-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">CTA:</span>
            <span className="font-medium">{version.breakdown.cta}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Рецензия AI архитектора</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground whitespace-pre-wrap">
          {version.review}
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
