import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { Project } from "@shared/schema";
import type { EnrichedRssItem } from "../utils/news-helpers";

/**
 * Hook for news-related mutations (refresh, parse, dismiss, proceed)
 */
export function useNewsMutations(project: Project) {
  const { toast } = useToast();

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/news/refresh", {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      toast({
        title: "Парсинг завершен",
        description: `Добавлено новых статей: ${data.newItems || 0}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка парсинга",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const parseExtendedMutation = useMutation({
    mutationFn: async (params: { startDate?: string; endDate?: string }) => {
      const res = await apiRequest(
        "POST",
        "/api/news/refresh-extended",
        params
      );
      return await res.json();
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      const message =
        variables.startDate && variables.endDate
          ? `Parsed ${data.totalProcessed || 0} items, ${
              data.newItems || 0
            } new (RSS feeds may not support full date range)`
          : `Loaded ${data.newItems || 0} new articles`;
      toast({
        title: "Расширенный парсинг завершен",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка парсинга",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("PATCH", `/api/news/${itemId}/action`, {
        action: "dismissed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
      toast({
        title: "Статья отклонена",
        description: "Эта статья больше не будет показана",
      });
    },
  });

  const proceedMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 3,
        sourceData: data,
      });
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 2,
        data,
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      // Invalidate and refetch to ensure UI updates to Stage 3
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id],
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", project.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id, "steps"],
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", project.id, "steps"],
      });
      //analysisData

      toast({
        title: "Переход к созданию сценария",
        description: "Загружаем данные...",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNewsSelect = async (newsItem: EnrichedRssItem) => {
    try {
      // Mark as selected
      await apiRequest("PATCH", `/api/news/${newsItem.id}/action`, {
        action: "selected",
        projectId: project.id,
      });

      // Show loading toast
      toast({
        title: "Loading Article",
        description: "Extracting full article text...",
      });

      // Fetch full article content
      const fullContentResponse = await apiRequest(
        "POST",
        `/api/news/${newsItem.id}/fetch-full-content`,
        {}
      );
      const fullContentData = (await fullContentResponse.json()) as {
        success: boolean;
        content?: string;
        error?: string;
        cached?: boolean;
        fallback?: string;
      };

      // Use full content if available, fallback to RSS snippet
      const content = fullContentData.success
        ? fullContentData.content || newsItem.content || ""
        : fullContentData.fallback || newsItem.content || "";

      // Show warning if extraction failed
      if (!fullContentData.success) {
        toast({
          title: "Using Summary",
          description: `Could not load full article (${
            fullContentData.error || "Unknown error"
          }). Using RSS summary instead.`,
          variant: "default",
        });
      } else if (fullContentData.cached) {
        console.log("[Stage 2] Using cached article content");
      } else {
        toast({
          title: "Article Loaded",
          description: `Extracted ${Math.round(
            (content?.length || 0) / 1000
          )}k characters`,
        });
      }

      proceedMutation.mutate({
        type: "news",
        newsId: newsItem.id,
        title: newsItem.title,
        content: content,
        url: newsItem.url,
        score: newsItem.aiScore,
      });
    } catch (error: any) {
      console.error("Error selecting news:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to select article",
        variant: "destructive",
      });
    }
  };

  return {
    refreshMutation,
    parseExtendedMutation,
    dismissMutation,
    proceedMutation,
    handleNewsSelect,
  };
}
