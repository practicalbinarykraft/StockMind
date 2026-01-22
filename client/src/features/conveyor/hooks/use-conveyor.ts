import { useQuery, useMutation } from "@tanstack/react-query";
import { conveyorService } from "../services";
import { useToast } from "@/shared/hooks/use-toast";
import { queryClient } from "@/shared/api";

/**
 * Hook for conveyor dashboard data
 */
export function useConveyorDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["conveyor-dashboard"],
    queryFn: () => conveyorService.getDashboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    dashboard,
    isLoading,
  };
}

/**
 * Hook for conveyor items
 */
export function useConveyorItems(limit: number = 20) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["conveyor-items", limit],
    queryFn: () => conveyorService.getItems(limit),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return {
    items: items || [],
    isLoading,
  };
}

/**
 * Hook for conveyor mutations
 */
export function useConveyorMutations() {
  const { toast } = useToast();

  // Trigger conveyor manually
  const triggerMutation = useMutation({
    mutationFn: () => conveyorService.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["conveyor-items"] });
      toast({
        title: "Конвейер запущен",
        description: "Обработка началась в фоновом режиме",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pause conveyor
  const pauseMutation = useMutation({
    mutationFn: () => conveyorService.pause(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-dashboard"] });
      toast({
        title: "Конвейер остановлен",
        description: "Новые элементы не будут добавляться. Текущие задачи завершатся.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resume conveyor
  const resumeMutation = useMutation({
    mutationFn: () => conveyorService.resume(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-dashboard"] });
      toast({
        title: "Конвейер возобновлен",
        description: "Обработка новых элементов возобновлена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    triggerMutation,
    pauseMutation,
    resumeMutation,
  };
}
