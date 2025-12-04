/**
 * Hook for tracking revision progress
 * Отслеживает прогресс обработки ревизии через API
 */
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth-context";

export interface RevisionProgress {
  currentStage: number;
  stageName: string;
  progress: number; // 0-100
  elapsedTime: number; // seconds
  estimatedTimeRemaining: number; // seconds
  status: "processing" | "completed" | "failed";
  stages: Array<{
    stage: number;
    name: string;
    status: "completed" | "processing" | "pending";
    duration: number;
    startedAt?: string;
    completedAt?: string;
  }>;
  lastCompletedStage: {
    stage: number;
    name: string;
    completedAt: string;
  } | null;
}

export interface UseRevisionProgressResult {
  progress: RevisionProgress | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook для отслеживания прогресса обработки ревизии
 * 
 * @param conveyorItemId - ID conveyor_item для отслеживания
 * @param enabled - Включить/выключить запросы (по умолчанию true)
 * @returns Объект с прогрессом, состоянием загрузки и ошибкой
 */
export function useRevisionProgress(
  conveyorItemId: string | null | undefined,
  enabled: boolean = true
): UseRevisionProgressResult {
  const { data, isLoading, error } = useQuery<RevisionProgress>({
    queryKey: ["conveyor-progress", conveyorItemId],
    queryFn: async () => {
      if (!conveyorItemId) {
        throw new Error("Conveyor item ID is required");
      }

      const token = getToken();
      const res = await fetch(`/api/conveyor/items/${conveyorItemId}/progress`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch progress: ${res.statusText}`);
      }

      const json = await res.json();
      return json.data;
    },
    enabled: enabled && !!conveyorItemId,
    // Обновляем каждые 2 секунды, если статус "processing"
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "processing" ? 2000 : false;
    },
    // Не показываем ошибку, если просто нет данных
    retry: false,
  });

  return {
    progress: data || null,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Форматирует время в читаемый формат
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} сек`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} мин`;
  }
  return `${minutes} мин ${remainingSeconds} сек`;
}

