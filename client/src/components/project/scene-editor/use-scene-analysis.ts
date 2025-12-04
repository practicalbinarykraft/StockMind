import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/query-client';
import type { NormalizedScene, AnalysisResult } from './scene-editor-types';

interface UseSceneAnalysisOptions {
  projectId: string;
  scenes: NormalizedScene[];
  activeVersionId?: string;
  onSuccess: (data: AnalysisResult) => void;
}

/**
 * Hook for analyzing script and getting recommendations
 */
export function useSceneAnalysis({
  projectId,
  scenes,
  activeVersionId,
  onSuccess,
}: UseSceneAnalysisOptions) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/analysis/run`, {
        scenes: scenes.map(s => ({
          sceneNumber: s.sceneNumber,
          text: s.text
        }))
      });
      return await res.json();
    },
    onSuccess: (response: any) => {
      const data = response?.data ?? response;

      onSuccess(data);

      const recommendationsCount = data.recommendations?.length || 0;

      // Update recommendations cache if we have them
      if (data.recommendations && data.recommendations.length > 0 && activeVersionId) {
        queryClient.setQueryData(
          ['/api/projects', projectId, 'scene-recommendations', activeVersionId],
          data.recommendations
        );
      }

      toast({
        title: data.cached ? 'Анализ (кеш)' : 'Анализ завершен',
        description: recommendationsCount > 0
          ? `Общий балл: ${data.analysis.overallScore}/100. Рекомендации: ${recommendationsCount}`
          : `Общий балл: ${data.analysis.overallScore}/100`,
      });

      // Invalidate recommendations to refetch from DB
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'scene-recommendations'],
        exact: false
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
}
