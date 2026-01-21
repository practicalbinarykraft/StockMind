import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/query-client';
import type { NormalizedScene, SceneRecommendation, AnalysisResult } from './scene-editor-types';
import { useApplyAllRecommendations } from './use-apply-all-recommendations';

interface UseSceneRecommendationsOptions {
  projectId: string;
  scenes: NormalizedScene[];
  activeVersionId?: string;
  analysisResult: AnalysisResult | null;
  setScenes: (scenes: any[] | ((prev: any[]) => any[])) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setDirtySceneIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setHasAppliedRecommendations: (v: boolean) => void;
}

/**
 * Hook for fetching and applying scene recommendations
 */
export function useSceneRecommendations({
  projectId,
  scenes,
  activeVersionId,
  analysisResult,
  setScenes,
  setAnalysisResult,
  setDirtySceneIds,
  setHasAppliedRecommendations,
}: UseSceneRecommendationsOptions) {
  const { toast } = useToast();

  // Fetch persisted recommendations from DB
  const { data: persistedRecommendations = [] } = useQuery<SceneRecommendation[]>({
    queryKey: ['/api/projects', projectId, 'scene-recommendations', activeVersionId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/scene-recommendations`);
      const json = await res.json();
      return json?.data ?? json ?? [];
    },
    enabled: Boolean(activeVersionId),
  });

  // Use fresh recommendations if available, otherwise persisted
  const freshRecommendations = analysisResult?.recommendations
    ? analysisResult.recommendations.map((r: any, idx: number) => ({
        ...r,
        id: r.id || -(idx + 1) // Temporary negative ID
      }))
    : null;

  const recommendations = freshRecommendations || persistedRecommendations;
  const activeRecommendations = recommendations.filter(r => !r.appliedAt);

  // Apply single recommendation mutation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (recommendation: SceneRecommendation) => {
      // Fresh recommendations (negative ID) - apply directly
      if (recommendation.id && typeof recommendation.id === 'number' && recommendation.id < 0) {
        return {
          fresh: true,
          sceneId: recommendation.sceneId,
          suggestedText: recommendation.suggestedText
        };
      }

      // Persisted recommendations - use backend API
      const res = await apiRequest('POST', `/api/projects/${projectId}/apply-scene-recommendation`, {
        recommendationId: recommendation.id
      });
      return await res.json();
    },
    onSuccess: (response: any) => {
      if (response?.fresh) {
        const sceneId = response.sceneId;

        setScenes((prev: NormalizedScene[]) => prev.map((s, idx) => {
          const currentSceneNumber = s.sceneNumber !== undefined ? s.sceneNumber : (idx + 1);
          return currentSceneNumber === sceneId
            ? { ...s, text: response.suggestedText }
            : s;
        }));

        // Remove applied recommendation from analysisResult
        if (analysisResult) {
          setAnalysisResult({
            ...analysisResult,
            recommendations: analysisResult.recommendations.filter(
              (r: any) => !(r.sceneId === sceneId && r.suggestedText === response.suggestedText)
            )
          });
        }

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

      // Handle persisted recommendations
      const data = response?.data ?? response;

      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'scene-recommendations'],
        exact: false
      });

      if (data?.affectedScene?.sceneNumber && data?.affectedScene?.text) {
        const sceneNumber = data.affectedScene.sceneNumber;

        setScenes((prev: NormalizedScene[]) => prev.map((s, idx) => {
          const currentSceneNumber = s.sceneNumber !== undefined ? s.sceneNumber : (idx + 1);
          return currentSceneNumber === sceneNumber
            ? { ...s, text: data.affectedScene.text }
            : s;
        }));

        setDirtySceneIds(prev => {
          const next = new Set(prev);
          next.add(sceneNumber);
          return next;
        });
      }

      setHasAppliedRecommendations(true);

      toast({
        title: 'Рекомендация применена',
        description: 'Сцена обновлена. Сохраните новую версию для повторного анализа.',
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

  // Apply all profitable recommendations (delegated to separate hook)
  const applyAllMutation = useApplyAllRecommendations({
    projectId,
    scenes,
    activeRecommendations,
    analysisResult,
    setScenes,
    setAnalysisResult,
    setDirtySceneIds,
    setHasAppliedRecommendations,
  });

  return {
    recommendations,
    activeRecommendations,
    applyRecommendationMutation,
    applyAllMutation,
  };
}
