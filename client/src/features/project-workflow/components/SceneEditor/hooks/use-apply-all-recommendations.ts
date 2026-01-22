import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { queryClient, apiRequest } from '@/shared/api';
import type { NormalizedScene, SceneRecommendation, AnalysisResult } from '../types';

const PROFITABLE_THRESHOLD = 6;

interface UseApplyAllRecommendationsOptions {
  projectId: string;
  scenes: NormalizedScene[];
  activeRecommendations: SceneRecommendation[];
  analysisResult: AnalysisResult | null;
  setScenes: (scenes: any[] | ((prev: any[]) => any[])) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setDirtySceneIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setHasAppliedRecommendations: (v: boolean) => void;
}

/**
 * Hook for applying all profitable recommendations at once
 */
export function useApplyAllRecommendations({
  projectId,
  scenes,
  activeRecommendations,
  analysisResult,
  setScenes,
  setAnalysisResult,
  setDirtySceneIds,
  setHasAppliedRecommendations,
}: UseApplyAllRecommendationsOptions) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const profitableFilter = (r: SceneRecommendation) => {
        const hasPriority = r.priority === 'high' || r.priority === 'medium';
        const hasDelta = (r.scoreDelta ?? 0) >= PROFITABLE_THRESHOLD;
        return hasPriority && hasDelta;
      };

      const isFresh = (r: SceneRecommendation) => typeof r.id === 'number' && r.id < 0;

      const freshRecs = activeRecommendations.filter(isFresh).filter(profitableFilter);
      const persistedRecs = activeRecommendations.filter(r => !isFresh(r)).filter(profitableFilter);

      // Apply fresh recommendations locally
      const freshUpdatedScenes = freshRecs.length > 0
        ? scenes.map((scene, idx) => {
            const sceneNumber = scene.sceneNumber || (idx + 1);
            const sceneRec = freshRecs.find(r => r.sceneId === sceneNumber);
            return sceneRec
              ? { ...scene, sceneNumber, text: sceneRec.suggestedText }
              : { ...scene, sceneNumber };
          })
        : null;

      // Apply persisted via backend
      let persistedResult = null;
      if (persistedRecs.length > 0) {
        const recommendationIds = persistedRecs
          .map(r => r.id)
          .filter(Boolean)
          .map(id => String(id));

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
    onSuccess: async (response) => {
      const { freshCount, persistedCount, freshUpdatedScenes, persistedResult } = response;
      const modifiedSceneIds = new Set<number>();

      if (persistedCount > 0) {
        queryClient.invalidateQueries({
          queryKey: ['/api/projects', projectId, 'scene-recommendations'],
          exact: false
        });

        try {
          const historyRes = await apiRequest('GET', `/api/projects/${projectId}/script-history`);
          const historyData = await historyRes.json();
          const currentVersion = historyData?.data?.currentVersion || historyData?.currentVersion;

          if (currentVersion?.scenes) {
            if (freshCount > 0 && freshUpdatedScenes) {
              const originalSceneMap = new Map<number, string>();
              scenes.forEach((scene: NormalizedScene) => {
                if (scene.sceneNumber) originalSceneMap.set(scene.sceneNumber, scene.text);
              });

              const freshBySceneNumber = new Map<number, string>();
              freshUpdatedScenes.forEach((scene: any) => {
                if (scene.sceneNumber && scene.text !== originalSceneMap.get(scene.sceneNumber)) {
                  freshBySceneNumber.set(scene.sceneNumber, scene.text);
                }
              });

              const mergedScenes = currentVersion.scenes.map((dbScene: any) => {
                const freshText = dbScene.sceneNumber ? freshBySceneNumber.get(dbScene.sceneNumber) : null;
                return freshText ? { ...dbScene, text: freshText } : dbScene;
              });
              setScenes(mergedScenes);
            } else {
              setScenes(currentVersion.scenes);
            }
          } else if (persistedResult?.data?.updatedScenes) {
            setScenes(persistedResult.data.updatedScenes);
          }
        } catch {
          if (persistedResult?.data?.updatedScenes) {
            setScenes(persistedResult.data.updatedScenes);
          } else if (freshUpdatedScenes) {
            setScenes(freshUpdatedScenes);
          }
        }
      } else if (freshUpdatedScenes) {
        setScenes(freshUpdatedScenes);
      }

      if (freshCount > 0 && analysisResult) {
        setAnalysisResult({ ...analysisResult, recommendations: [] });
      }

      const totalCount = freshCount + persistedCount;

      if (totalCount > 0) {
        freshUpdatedScenes?.forEach((scene: any) => {
          if (scene.sceneNumber) modifiedSceneIds.add(scene.sceneNumber);
        });
        persistedResult?.data?.affectedScenes?.forEach((scene: any) => {
          if (scene.sceneNumber) modifiedSceneIds.add(scene.sceneNumber);
        });

        setDirtySceneIds(prev => {
          const next = new Set(prev);
          modifiedSceneIds.forEach(id => next.add(id));
          return next;
        });
        setHasAppliedRecommendations(true);
      }

      toast({
        title: totalCount > 0 ? `Применено: ${totalCount}` : 'Нет выгодных рекомендаций',
        description: totalCount > 0
          ? 'Сцены обновлены. Сохраните новую версию.'
          : 'Все рекомендации низкого приоритета или с малым приростом',
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
}
