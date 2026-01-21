import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/query-client';

interface UseCancelCandidateOptions {
  projectId: string;
}

/**
 * Hook for cancelling candidate version
 */
export function useCancelCandidate({ projectId }: UseCancelCandidateOptions) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/reanalyze/candidate`, {});
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'script-history'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'scene-recommendations'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'reanalyze'],
        exact: false
      });

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
}
