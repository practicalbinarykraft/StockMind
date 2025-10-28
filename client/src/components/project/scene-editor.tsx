import { useState, useMemo, useRef, useEffect } from 'react';
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
  id: number | string; // number for fresh (temp), string (UUID) for persisted
  sceneId: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  area: string; // Accept any string, will normalize to known areas
  currentText: string;
  suggestedText: string;
  reasoning: string;
  expectedImpact: string;
  appliedAt?: string;
  sourceAgent?: string;
  scoreDelta?: number;
  confidence?: number;
}

interface SceneEditorProps {
  projectId: string;
  scenes: Scene[];
  activeVersionId?: string; // ID of the version we're editing (candidate or current)
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
  activeVersionId,
  onReanalyze, 
  onOpenCompare, 
  hasCandidate,
  reanalyzeJobId,
  jobStatus 
}: SceneEditorProps) {
  // Normalize scenes to ensure they always have sceneNumber property
  // This eliminates the need for index-based fallbacks throughout the component
  const normalizeScenes = (scenes: any[]) => {
    return scenes.map((scene, idx) => ({
      ...scene,
      sceneNumber: scene.sceneNumber !== undefined ? scene.sceneNumber : (idx + 1)
    }));
  };
  
  const [scenesState, setScenesState] = useState(() => normalizeScenes(initialScenes));
  
  // Wrapper that auto-normalizes scenes before setting state
  const setScenes = (newScenes: any[] | ((prev: any[]) => any[])) => {
    setScenesState(prev => {
      const resolved = typeof newScenes === 'function' ? newScenes(prev) : newScenes;
      return normalizeScenes(resolved);
    });
  };
  
  // Use normalized scenes
  const scenes = scenesState;
  
  const [showHistory, setShowHistory] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [hasAppliedRecommendations, setHasAppliedRecommendations] = useState(false);
  const [dirtySceneIds, setDirtySceneIds] = useState<Set<number>>(new Set());
  const [baseVersionId, setBaseVersionId] = useState(activeVersionId);
  const initialTextsRef = useRef<Map<number, string>>(new Map());
  const { toast } = useToast();

  // Initialize baseline texts on mount
  useEffect(() => {
    const m = new Map<number, string>();
    initialScenes.forEach((s: any, idx) => {
      const sceneNumber = s.sceneNumber !== undefined ? s.sceneNumber : (idx + 1);
      m.set(sceneNumber, (s.text ?? '').trim());
    });
    initialTextsRef.current = m;
  }, [initialScenes]);

  // Reset dirty flags ONLY when version changes (not on every initialScenes update)
  useEffect(() => {
    if (activeVersionId !== baseVersionId) {
      console.log('[SceneEditor] Version changed, resetting flags:', { from: baseVersionId, to: activeVersionId });
      setBaseVersionId(activeVersionId);
      setDirtySceneIds(new Set());
      setHasAppliedRecommendations(false);
    }
  }, [activeVersionId, baseVersionId]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (scenes.length !== initialScenes.length) return true;
    return scenes.some((s, idx) => s.text !== initialScenes[idx].text);
  }, [scenes, initialScenes]);
  
  // Enable save button if there are changes OR recommendations were applied OR manual edits made
  const canSave = hasChanges || hasAppliedRecommendations || dirtySceneIds.size > 0;

  // Analyze script mutation
  const analyzeScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/analysis/run`, { 
        scenes: scenes.map(s => ({ 
          sceneNumber: s.sceneNumber, // Use stabilized sceneNumber (guaranteed by normalization)
          text: s.text 
        }))
      });
      return await res.json();
    },
    onSuccess: (response: any) => {
      const data = response?.data ?? response;
      
      console.log('[Analyze Script] Success:', {
        hasRecommendations: !!data.recommendations,
        recommendationsCount: data.recommendations?.length || 0,
        cached: data.cached,
        overallScore: data.analysis?.overallScore
      });
      
      setAnalysisResult(data);
      
      const recommendationsCount = data.recommendations?.length || 0;
      
      // If we have recommendations in the response, also set them in the cache
      if (data.recommendations && data.recommendations.length > 0 && activeVersionId) {
        console.log('[Analyze Script] Updating recommendations cache with', recommendationsCount, 'items');
        queryClient.setQueryData(
          ['/api/projects', projectId, 'scene-recommendations', activeVersionId],
          data.recommendations
        );
      }
      
      toast({
        title: data.cached ? 'Анализ (кеш)' : 'Анализ завершен',
        description: recommendationsCount > 0 
          ? `Общий балл: ${data.analysis.overallScore}/100. Рекомендации загружены: ${recommendationsCount} сцен`
          : `Общий балл: ${data.analysis.overallScore}/100`,
      });
      
      // Invalidate recommendations to refetch from DB (exact: false to match all activeVersionId variants)
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false });
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
      // Invalidate all related queries (exact: false to match all activeVersionId variants)
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'reanalyze'], exact: false });
      
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

  // Fetch recommendations from DB (persisted) for the ACTIVE version (candidate or current)
  // This ensures recommendations match the scenes we're displaying
  const { data: persistedRecommendations = [] } = useQuery<SceneRecommendation[]>({
    queryKey: ['/api/projects', projectId, 'scene-recommendations', activeVersionId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/scene-recommendations`);
      const json = await res.json();
      return json?.data ?? json ?? [];
    },
    enabled: Boolean(activeVersionId), // Only fetch if we have a version ID
  });

  // Use recommendations from analysisResult if available (fresh analysis), otherwise use persisted
  // Add temporary IDs to fresh recommendations (using negative numbers to avoid conflicts with DB IDs)
  const freshRecommendations = analysisResult?.recommendations 
    ? analysisResult.recommendations.map((r: any, idx: number) => ({
        ...r,
        id: r.id || -(idx + 1) // Temporary negative ID if not from DB
      }))
    : null;
  
  const recommendations = freshRecommendations || persistedRecommendations;

  // Apply single recommendation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (recommendation: SceneRecommendation) => {
      // For fresh recommendations (negative ID), apply directly without backend
      if (recommendation.id && typeof recommendation.id === 'number' && recommendation.id < 0) {
        return {
          fresh: true,
          sceneId: recommendation.sceneId, // sceneId is 1-indexed scene number (1, 2, 3...)
          suggestedText: recommendation.suggestedText
        };
      }
      
      // For persisted recommendations, use backend API
      const res = await apiRequest('POST', `/api/projects/${projectId}/apply-scene-recommendation`, { 
        recommendationId: recommendation.id 
      });
      return await res.json();
    },
    onSuccess: (response: any) => {
      // Handle fresh recommendations (direct apply)
      if (response?.fresh) {
        const sceneId = response.sceneId;
        
        // NOTE: Match by scene.sceneNumber property (stable), not array index
        // Only update scenes that have sceneNumber defined
        setScenes(prev => prev.map((s, idx) => {
          const currentSceneNumber = s.sceneNumber !== undefined ? s.sceneNumber : (idx + 1);
          return currentSceneNumber === sceneId
            ? { ...s, text: response.suggestedText }
            : s;
        }));
        
        // Remove only the applied recommendation from analysisResult
        // Filter by both sceneId AND suggestedText for precise matching
        if (analysisResult) {
          setAnalysisResult({
            ...analysisResult,
            recommendations: analysisResult.recommendations.filter(
              (r: any) => !(r.sceneId === sceneId && r.suggestedText === response.suggestedText)
            )
          });
        }
        
        // Mark scene as dirty and set flag for save button
        setDirtySceneIds(prev => {
          const next = new Set(prev);
          next.add(sceneId);
          return next;
        });
        setHasAppliedRecommendations(true);
        
        toast({
          title: 'Рекомендация применена',
          description: 'Текст обновлён. Сохраните новую версию для повторного анализа.',
        });
        return;
      }
      
      // Handle persisted recommendations (backend response)
      const data = response?.data ?? response;
      
      // Only invalidate recommendations, NOT script-history (to avoid resetting dirty flags)
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false });
      
      // Update local scene text - match by sceneNumber property
      if (data?.affectedScene?.sceneNumber && data?.affectedScene?.text) {
        const sceneNumber = data.affectedScene.sceneNumber;
        
        setScenes(prev => prev.map((s, idx) => {
          const currentSceneNumber = s.sceneNumber !== undefined ? s.sceneNumber : (idx + 1);
          return currentSceneNumber === sceneNumber
            ? { ...s, text: data.affectedScene.text }
            : s;
        }));
        
        // Mark scene as dirty
        setDirtySceneIds(prev => {
          const next = new Set(prev);
          next.add(sceneNumber);
          return next;
        });
      }

      // Mark that recommendations were applied to enable save button
      setHasAppliedRecommendations(true);
      
      toast({
        title: 'Рекомендация применена',
        description: data?.needsReanalysis 
          ? 'Текст обновлен. Сохраните новую версию для повторного анализа.'
          : 'Сцена обновлена. Сохраните новую версию для повторного анализа.',
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

  // Apply all PROFITABLE recommendations (high/medium priority + delta >= 6)
  const applyAllMutation = useMutation({
    mutationFn: async () => {
      // Filter for profitable recommendations only
      const PROFITABLE_THRESHOLD = 6;
      const profitableFilter = (r: any) => {
        const hasPriority = r.priority === 'high' || r.priority === 'medium';
        const hasDelta = (r.scoreDelta ?? 0) >= PROFITABLE_THRESHOLD;
        return hasPriority && hasDelta;
      };
      
      // Separate fresh and persisted recommendations (filtered)
      // Fresh: negative number IDs (temp), Persisted: positive numbers or string UUIDs
      const isFresh = (r: any) => typeof r.id === 'number' && r.id < 0;
      const isPersisted = (r: any) => !r.id || typeof r.id === 'string' || (typeof r.id === 'number' && r.id > 0);
      
      const freshRecs = activeRecommendations.filter(isFresh).filter(profitableFilter);
      const persistedRecs = activeRecommendations.filter(isPersisted).filter(profitableFilter);
      
      // Apply fresh recommendations locally (always create new array to ensure React detects changes)
      const freshUpdatedScenes = freshRecs.length > 0
        ? scenes.map((scene, idx) => {
            // Use scene.sceneNumber if available, otherwise derive from index
            // NOTE: sceneNumber is 1-indexed (1, 2, 3...), scene array is 0-indexed
            const sceneNumber = scene.sceneNumber || (idx + 1);
            const sceneRec = freshRecs.find(r => r.sceneId === sceneNumber);
            
            if (sceneRec) {
              return { ...scene, sceneNumber, text: sceneRec.suggestedText };
            }
            return { ...scene, sceneNumber };
          })
        : null;
      
      // Apply persisted recommendations via backend (send filtered IDs)
      let persistedResult = null;
      
      if (persistedRecs.length > 0) {
        // Extract IDs and ensure they're strings (UUIDs) for backend
        const recommendationIds = persistedRecs
          .map(r => r.id)
          .filter(Boolean)
          .map(id => String(id)); // Convert to string in case of number IDs
        
        const res = await apiRequest('POST', `/api/projects/${projectId}/apply-all-recommendations`, {
          recommendationIds,
        });
        persistedResult = await res.json();
      }
      
      return {
        freshCount: freshRecs.length,
        persistedCount: persistedRecs.length,
        freshUpdatedScenes,
        persistedResult
      };
    },
    onSuccess: async (response: any) => {
      const { freshCount, persistedCount, freshUpdatedScenes, persistedResult } = response;
      
      // Collect modified scene IDs for dirtySceneIds
      const modifiedSceneIds = new Set<number>();
      
      // For mixed scenarios or persisted-only, refetch to ensure consistency
      if (persistedCount > 0) {
        // Only invalidate recommendations, NOT script-history (to avoid resetting dirty flags)
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false });
        
        try {
          // Refetch current version from backend to ensure database consistency
          const historyRes = await apiRequest('GET', `/api/projects/${projectId}/script-history`);
          const historyData = await historyRes.json();
          const currentVersion = historyData?.data?.currentVersion || historyData?.currentVersion;
          
          if (currentVersion?.scenes) {
            // Apply fresh changes on top of refetched scenes for mixed scenarios
            if (freshCount > 0 && freshUpdatedScenes) {
              // Build map of fresh changes by sceneNumber for stable matching
              // NOTE: Using scene.sceneNumber property, not array index
              const freshBySceneNumber = new Map<number, string>();
              
              // Build set of original scene numbers that were modified
              const originalSceneMap = new Map<number, string>();
              scenes.forEach((scene: any) => {
                if (scene.sceneNumber) {
                  originalSceneMap.set(scene.sceneNumber, scene.text);
                }
              });
              
              freshUpdatedScenes.forEach((scene: any) => {
                if (scene.sceneNumber) {
                  const originalText = originalSceneMap.get(scene.sceneNumber);
                  // Check if this scene was actually modified
                  if (scene.text !== originalText) {
                    freshBySceneNumber.set(scene.sceneNumber, scene.text);
                  }
                }
              });
              
              // Merge: use DB scenes as base, overlay fresh text changes by sceneNumber
              const mergedScenes = currentVersion.scenes.map((dbScene: any) => {
                const freshText = dbScene.sceneNumber ? freshBySceneNumber.get(dbScene.sceneNumber) : null;
                
                if (freshText) {
                  return { ...dbScene, text: freshText };
                }
                return dbScene;
              });
              setScenes(mergedScenes);
            } else {
              // Persisted-only: use DB scenes directly
              setScenes(currentVersion.scenes);
            }
          } else if (persistedResult?.data?.updatedScenes) {
            // Fallback 1: Use API response if refetch structure unexpected
            setScenes(persistedResult.data.updatedScenes);
          }
        } catch (error) {
          // Fallback 2: Network/parse error - use API response or fresh updates
          console.error('Failed to refetch scenes:', error);
          if (persistedResult?.data?.updatedScenes) {
            setScenes(persistedResult.data.updatedScenes);
          } else if (freshUpdatedScenes) {
            setScenes(freshUpdatedScenes);
          }
        }
      } else if (freshUpdatedScenes) {
        // Fresh-only: just update local state
        setScenes(freshUpdatedScenes);
      }
      
      // Clear fresh recommendations from analysisResult
      if (freshCount > 0 && analysisResult) {
        setAnalysisResult({
          ...analysisResult,
          recommendations: [] // Clear all since we applied all fresh
        });
      }

      const totalCount = freshCount + persistedCount;
      
      // Mark scenes as dirty and set flag for save button
      if (totalCount > 0) {
        // Mark all modified scenes as dirty
        if (freshUpdatedScenes) {
          freshUpdatedScenes.forEach((scene: any) => {
            if (scene.sceneNumber) {
              modifiedSceneIds.add(scene.sceneNumber);
            }
          });
        }
        if (persistedResult?.data?.affectedScenes) {
          persistedResult.data.affectedScenes.forEach((scene: any) => {
            if (scene.sceneNumber) {
              modifiedSceneIds.add(scene.sceneNumber);
            }
          });
        }
        
        // Update dirtySceneIds
        setDirtySceneIds(prev => {
          const next = new Set(prev);
          modifiedSceneIds.forEach(id => next.add(id));
          return next;
        });
        setHasAppliedRecommendations(true);
      }
      
      toast({
        title: totalCount > 0 ? `Применено рекомендаций: ${totalCount}` : 'Нет выгодных рекомендаций',
        description: totalCount > 0
          ? (freshCount > 0 
            ? 'Сцены обновлены. Сохраните новую версию для повторного анализа.'
            : 'Сцены обновлены. Рекомендуем пересчитать анализ.')
          : 'Все рекомендации либо низкого приоритета, либо с малым приростом (<6 баллов)',
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

  // Note: Scene text changes are now only saved when user clicks "Save new version"
  // This allows for batch editing and proper version management

  const handleTextChange = (sceneNumber: number, newText: string) => {
    // Optimistic update using stable sceneNumber matching
    setScenes(prev => prev.map(s => 
      s.sceneNumber === sceneNumber ? { ...s, text: newText } : s
    ));
    
    // Compare with baseline to determine if scene is modified
    const baseline = (initialTextsRef.current.get(sceneNumber) ?? '').trim();
    const current = (newText ?? '').trim();
    const isModified = current !== baseline;
    
    // Update dirty scenes set
    setDirtySceneIds(prev => {
      const next = new Set(prev);
      if (isModified) {
        next.add(sceneNumber);
      } else {
        next.delete(sceneNumber);
      }
      return next;
    });
    
    // Mark that we have manual edits to enable save button
    if (isModified) {
      setHasAppliedRecommendations(true);
    }
  };

  const activeRecommendations = recommendations.filter(r => !r.appliedAt);
  const hasRecommendations = activeRecommendations.length > 0;

  return (
    <div className="flex gap-6" data-testid="scene-editor">
      {/* Left column: Scenes in single column */}
      <div className="flex-1 space-y-4">
        {scenes.map((scene, index) => {
          // Use scene.sceneNumber if available, otherwise derive from index as fallback
          // IMPORTANT: We should ensure scenes always have sceneNumber property
          const sceneNumber = scene.sceneNumber !== undefined ? scene.sceneNumber : (index + 1);
          const sceneRecommendations = recommendations.filter(r => r.sceneId === sceneNumber);
          
          return (
            <SceneCard
              key={scene.id || sceneNumber}
              sceneNumber={sceneNumber}
              sceneId={sceneNumber}
              text={scene.text}
              recommendations={sceneRecommendations}
              onTextChange={(_, newText) => handleTextChange(sceneNumber, newText)}
              onApplyRecommendation={(rec) => applyRecommendationMutation.mutateAsync(rec)}
              isEditing={applyRecommendationMutation.isPending}
              isApplyingAll={applyAllMutation.isPending}
              isModified={dirtySceneIds.has(sceneNumber)}
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
            {hasRecommendations && (
              <p className="text-xs text-muted-foreground pt-1">
                Выгодные: приоритет high/medium с приростом ≥6 баллов
              </p>
            )}
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
                variant="default"
                data-testid="button-apply-all"
              >
                {applyAllMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Применяем...
                  </>
                ) : applyRecommendationMutation.isPending ? (
                  <>Применяем...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Применить всё (выгодные)
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
                    // Reset flags after save initiated - new baseline will be set
                    setHasAppliedRecommendations(false);
                    setDirtySceneIds(new Set());
                  }}
                  disabled={!canSave}
                  className="w-full gap-2"
                  data-testid="button-reanalyze"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  {dirtySceneIds.size > 0 
                    ? `Сохранить новую версию (изменено: ${dirtySceneIds.size})`
                    : 'Сохранить новую версию'
                  }
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

              {/* Architect Review */}
              {analysisResult.review && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Рецензия AI архитектора</div>
                    <div className="text-xs text-muted-foreground whitespace-pre-line rounded-md bg-muted/50 p-3">
                      {analysisResult.review}
                    </div>
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
