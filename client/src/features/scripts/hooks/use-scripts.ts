import { useQuery, useMutation } from "@tanstack/react-query";
import { scriptsService } from "../services";
import { queryClient } from "@/shared/api";
import { useToast } from "@/shared/hooks/use-toast";

interface UseScriptsParams {
  status?: string;
  sourceType?: string;
  search?: string;
}

/**
 * Hook for fetching scripts
 */
export function useScripts(params?: UseScriptsParams) {
  const { data: scripts, isLoading } = useQuery({
    queryKey: ["/api/scripts", params],
    queryFn: () => scriptsService.getAll(params),
  });

  return {
    scripts: scripts || [],
    isLoading,
  };
}

/**
 * Hook for fetching single script
 */
export function useScript(id: string) {
  const { data: script, isLoading } = useQuery({
    queryKey: ["/api/scripts", id],
    queryFn: () => scriptsService.getById(id),
    enabled: !!id,
  });

  return {
    script,
    isLoading,
  };
}

/**
 * Hook for script mutations
 */
export function useScriptMutations() {
  const { toast } = useToast();

  // Delete script mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => scriptsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({
        title: "Сценарий удален",
        description: "Сценарий успешно удален из библиотеки",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить сценарий",
        variant: "destructive",
      });
    },
  });

  // Analyze script mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => scriptsService.analyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({
        title: "Анализ завершен",
        description: "Сценарий успешно проанализирован",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось проанализировать сценарий",
        variant: "destructive",
      });
    },
  });

  return {
    deleteMutation,
    analyzeMutation,
  };
}
