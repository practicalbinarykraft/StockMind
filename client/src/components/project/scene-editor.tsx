import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SceneCard } from './scene-card';
import { HistoryModal } from './history-modal';
import { Sparkles, History, CheckCircle2, RefreshCw, XCircle, Loader2, BarChart3 } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/query-client';
import { Separator } from '@/components/ui/separator';

interface Scene {
  id: number;
  text: string;
}

interface SceneRecommendation {
  id: number;
  sceneId: number;
  priority: 'high' | 'medium' | 'low';
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'general';
  currentText: string;
  suggestedText: string;
  reasoning: string;
  expectedImpact: string;
  appliedAt?: string;
}

interface SceneEditorProps {
  projectId: string;
  scenes: Scene[];
  onReanalyze?: (scenes: Scene[], fullScript: string) => void;
  onOpenCompare?: () => void;
  hasCandidate?: boolean;
  reanalyzeJobId?: string | null;
  jobStatus?: any;
}

interface AnalysisResult {
  analysis: {
    overallScore: number;
    breakdown: {
      hook: { score: number };
      structure: { score: number };
      emotional: { score: number };
      cta: { score: number };
    };
    verdict: string;
    strengths: string[];
    weaknesses: string[];
  };
  recommendations: any[];
  review: string;
  cached: boolean;
}

export function SceneEditor({ 
  projectId, 
  scenes: initialScenes, 
  onReanalyze, 
  onOpenCompare, 
  hasCandidate,
  reanalyzeJobId,
  jobStatus 
}: SceneEditorProps) {
  const [scenes, setScenes] = useState(initialScenes);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (scenes.length !== initialScenes.length) return true;
    return scenes.some((s, idx) => s.text !== initialScenes[idx].text);
  }, [scenes, initialScenes]);

  // Analyze script mutation
  const analyzeScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/analysis/run`, { 
        scenes: scenes.map((s, idx) => ({ sceneNumber: idx + 1, text: s.text }))
      });
      return await res.json();
    },
    onSuccess: (response: any) => {
      const data = response?.data ?? response;
      setAnalysisResult(data);
      
      toast({
        title: data.cached ? 'Анализ (кеш)' : 'Анализ завершен',
        description: `Общий балл: ${data.analysis.overallScore}/100`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка анализа',
        description: error.message || 'Не удалось проанализировать сценарий',
        variant: 'destructive',
      });
    },
  });

  // Cancel candidate mutation
  const cancelCandidateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/reanalyze/candidate`, {});
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'reanalyze'] });
      
      // Clear localStorage
      localStorage.removeItem('reanalyzeJobId');
      localStorage.removeItem('reanalyzeProjectId');
      
      toast({
        title: 'Версия отменена',
        description: 'Версия для сравнения удалена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отменить версию',
        variant: 'destructive',
      });
    },
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery<SceneRecommendation[]>({
    queryKey: ['/api/projects', projectId, 'scene-recommendations'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/scene-recommendations`);
      const json = await res.json();
      return json?.data ?? json ?? [];
    },
  });

  // Apply single recommendation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/apply-scene-recommendation`, { recommendationId });
      return await res.json();
    },
    onSuccess: (response: any) => {
      // Unwrap new API format: { success: true, data: { affectedScene, needsReanalysis } }
      const data = response?.data ?? response;
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      // Update local scene text
      if (data?.affectedScene?.sceneNumber && data?.affectedScene?.text) {
        setScenes(prev => prev.map((s, idx) => 
          idx + 1 === data.affectedScene.sceneNumber
            ? { ...s, text: data.affectedScene.text }
            : s
        ));
      }

      toast({
        title: 'Рекомендация применена',
        description: data?.needsReanalysis 
          ? 'Текст обновлен. Рекомендуем пересчитать анализ.'
          : 'Сцена обновлена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось применить рекомендацию',
        variant: 'destructive',
      });
    },
  });

  // Apply all recommendations
  const applyAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/apply-all-recommendations`, {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      // Update all scenes (data already unwrapped)
      if (data?.data?.updatedScenes) {
        setScenes(data.data.updatedScenes);
      }

      toast({
        title: 'Все рекомендации применены',
        description: `Обновлено сцен: ${data?.data?.appliedCount || 0}. Рекомендуем пересчитать анализ.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось применить рекомендации',
        variant: 'destructive',
      });
    },
  });

  // Edit scene text
  const editSceneMutation = useMutation({
    mutationFn: async ({ sceneNumber, newText }: { sceneNumber: number; newText: string }) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/edit-scene`, { sceneNumber, newText });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      toast({
        title: 'Сцена обновлена',
        description: data?.data?.needsReanalysis 
          ? 'Изменения сохранены. Рекомендуем пересчитать анализ.'
          : 'Изменения сохранены',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить изменения',
        variant: 'destructive',
      });
    },
  });

  const handleTextChange = (sceneNumber: number, newText: string) => {
    // Optimistic update - sceneNumber is 1-indexed, array is 0-indexed
    setScenes(prev => prev.map((s, idx) => idx + 1 === sceneNumber ? { ...s, text: newText } : s));
    
    // Save to backend
    editSceneMutation.mutate({ sceneNumber, newText });
  };

  const activeRecommendations = recommendations.filter(r => !r.appliedAt);
  const hasRecommendations = activeRecommendations.length > 0;

  return (
    <div className="flex gap-6" data-testid="scene-editor">
      {/* Left column: Scenes in single column */}
      <div className="flex-1 space-y-4">
        {scenes.map((scene, index) => {
          const sceneNumber = index + 1;
          const sceneRecommendations = recommendations.filter(r => r.sceneId === sceneNumber);
          
          return (
            <SceneCard
              key={sceneNumber}
              sceneNumber={sceneNumber}
              sceneId={sceneNumber}
              text={scene.text}
              recommendations={sceneRecommendations}
              onTextChange={(_, newText) => handleTextChange(sceneNumber, newText)}
              onApplyRecommendation={(recId) => applyRecommendationMutation.mutateAsync(recId)}
              isEditing={editSceneMutation.isPending || applyRecommendationMutation.isPending}
              isApplyingAll={applyAllMutation.isPending}
            />
          );
        })}
      </div>

      {/* Right column: Controls and metadata */}
      <div className="w-80 flex-shrink-0 space-y-4 sticky top-4 h-fit">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Инструменты</h2>
            <p className="text-sm text-muted-foreground">
              {hasRecommendations 
                ? `${activeRecommendations.length} активных рекомендаций`
                : 'Все рекомендации применены'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => analyzeScriptMutation.mutate()}
              disabled={analyzeScriptMutation.isPending}
              className="w-full gap-2"
              data-testid="button-analyze-script"
            >
              {analyzeScriptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Анализируем...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Анализ сценария
                </>
              )}
            </Button>
            
            {hasRecommendations && (
              <Button
                onClick={() => applyAllMutation.mutate()}
                disabled={applyAllMutation.isPending || applyRecommendationMutation.isPending}
                className="w-full gap-2"
                data-testid="button-apply-all"
              >
                {applyAllMutation.isPending ? (
                  <>Применяем...</>
                ) : applyRecommendationMutation.isPending ? (
                  <>Применяем...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Улучшить всё ({activeRecommendations.length})
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="w-full gap-2"
              data-testid="button-show-history"
            >
              <History className="h-4 w-4" />
              Все версии (история)
            </Button>
            
            {/* Candidate draft status panel */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Новая версия</span>
                {reanalyzeJobId && jobStatus?.status === 'running' && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Создаётся
                  </Badge>
                )}
                {hasCandidate && !reanalyzeJobId && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Готов
                  </Badge>
                )}
                {!hasCandidate && !reanalyzeJobId && (
                  <Badge variant="outline">Отсутствует</Badge>
                )}
              </div>
              
              {onReanalyze && !hasCandidate && !reanalyzeJobId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const fullScript = scenes.map(s => s.text).join('\n\n');
                    onReanalyze(scenes, fullScript);
                  }}
                  disabled={!hasChanges}
                  className="w-full gap-2"
                  data-testid="button-reanalyze"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Сохранить новую версию
                </Button>
              )}
              
              {reanalyzeJobId && jobStatus?.status === 'running' && (
                <div className="text-xs text-muted-foreground">
                  Создаём версию… ~10–60 сек
                </div>
              )}
              
              {onOpenCompare && hasCandidate && (
                <>
                  <Button
                    onClick={() => {
                      console.log('[Compare] Открытие сравнения');
                      onOpenCompare();
                    }}
                    className="w-full gap-2"
                    data-testid="button-open-compare"
                    size="sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Сравнение: Текущая vs Новая
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelCandidateMutation.mutate()}
                    disabled={cancelCandidateMutation.isPending}
                    className="w-full gap-2 text-muted-foreground hover:text-destructive"
                    data-testid="button-cancel-candidate"
                  >
                    <XCircle className="h-4 w-4" />
                    Отменить версию
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analysis results */}
        {analysisResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Результаты анализа</h2>
                {analysisResult.cached && (
                  <Badge variant="secondary" className="text-xs">Кеш</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Общий балл</span>
                  <span className="text-2xl font-bold">{analysisResult.analysis.overallScore}/100</span>
                </div>
                <div className="text-xs text-muted-foreground">{analysisResult.analysis.verdict}</div>
              </div>

              <Separator />

              {/* Breakdown scores */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Детали</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Хук:</span>
                    <span className="font-medium">{analysisResult.analysis.breakdown.hook.score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Структура:</span>
                    <span className="font-medium">{analysisResult.analysis.breakdown.structure.score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Эмоции:</span>
                    <span className="font-medium">{analysisResult.analysis.breakdown.emotional.score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CTA:</span>
                    <span className="font-medium">{analysisResult.analysis.breakdown.cta.score}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations count */}
              {analysisResult.recommendations.length > 0 && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="font-medium">{analysisResult.recommendations.length} рекомендаций</span>
                    <span className="text-muted-foreground"> найдено</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* History modal */}
      {showHistory && (
        <HistoryModal
          projectId={projectId}
          currentScenes={scenes}
          onClose={() => setShowHistory(false)}
          onRevert={(scenes: Scene[]) => setScenes(scenes)}
        />
      )}
    </div>
  );
}
