import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/shared/hooks/use-toast";
import type { Project } from "@shared/schema";
import { newsService } from "../services";

/**
 * Custom hook for news-related mutations
 * Handles RSS refresh, project creation, and favorite toggling
 */
export function useNewsMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Manual RSS refresh mutation
  const refreshRssMutation = useMutation({
    mutationFn: async () => {
      return await newsService.refresh();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      toast({
        title: "Парсинг завершен",
        description: `Добавлено новых статей: ${data.newItems || 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка парсинга",
        description: error.message || "Не удалось обновить новости",
        variant: "destructive",
      });
    },
  });

  // Create project from news article mutation
  const createProjectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await newsService.createProjectFromNews(itemId);
    },
    onSuccess: async (project: any) => {
      console.log("[useNewsMutations] Project created:", {
        id: project.id,
        currentStage: project.currentStage,
        title: project.title
      });
      
      // CRITICAL: Force currentStage to 3 if it's not already 3
      // This ensures we always go to Stage 3 when creating from news
      if (project.currentStage !== 3) {
        console.warn(`[useNewsMutations] ⚠️ Project has wrong currentStage: ${project.currentStage}, forcing to 3`);
        project.currentStage = 3;
      }
      
      // Update project cache immediately with the correct stage
      queryClient.setQueryData(["/api/projects", project.id], project);
      console.log("[useNewsMutations] Project cache updated with currentStage:", project.currentStage);
      
      // Invalidate queries to force refetch (but keep our cached version)
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      
      toast({
        title: "Проект создан",
        description: "Переход к созданию сценария...",
      });
      
      // Navigate immediately - the page will use our cached version
      console.log("[useNewsMutations] Navigating to project:", project.id, "with currentStage:", project.currentStage);
      setLocation(`/project/${project.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка создания проекта",
        description: error.message || "Не удалось создать проект из статьи",
        variant: "destructive",
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      await newsService.toggleFavorite(id, isFavorite);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/favorites"] });
      toast({
        title: "Избранное обновлено",
        description: "Статья добавлена в избранное",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить избранное",
        variant: "destructive",
      });
    },
  });

  return {
    refreshRssMutation,
    createProjectMutation,
    toggleFavoriteMutation,
  };
}
