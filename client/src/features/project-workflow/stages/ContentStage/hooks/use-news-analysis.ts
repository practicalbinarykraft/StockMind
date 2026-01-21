import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/shared/api";
import { useToast } from "@/shared/hooks/use-toast";
import type { EnrichedRssItem } from "../utils/news-helpers";

/**
 * Hook for managing article translation and analysis
 */
export function useNewsAnalysis(filteredNews: EnrichedRssItem[]) {
  const { toast } = useToast();

  const [translations, setTranslations] = useState<
    Record<string, { text: string; language: "en" | "ru" }>
  >({});

  // Initialize analyses from articles (loaded from database)
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  const [analyzingItems, setAnalyzingItems] = useState<Set<string>>(new Set());

  // Load saved analyses and translations from articles when filteredNews changes
  // This effect runs when articles are loaded from API (after page refresh)
  useEffect(() => {
    if (filteredNews.length === 0) return;

    const loadedAnalyses: Record<string, any> = {};
    const loadedTranslations: Record<
      string,
      { text: string; language: "en" | "ru" }
    > = {};
    let foundAnalysisCount = 0;
    let foundTranslationCount = 0;

    filteredNews.forEach((item) => {
      // Check if article has saved analysis (from database)
      let articleAnalysis = (item as any).articleAnalysis;

      // Try to parse if it's a string
      if (typeof articleAnalysis === "string") {
        try {
          articleAnalysis = JSON.parse(articleAnalysis);
        } catch (e) {
          articleAnalysis = null;
        }
      }

      if (articleAnalysis && typeof articleAnalysis === "object") {
        foundAnalysisCount++;
        loadedAnalyses[item.id] = articleAnalysis;
      }

      // Check if article has saved translation (from database)
      let articleTranslation = (item as any).articleTranslation;

      // Try to parse if it's a string
      if (typeof articleTranslation === "string") {
        try {
          articleTranslation = JSON.parse(articleTranslation);
        } catch (e) {
          articleTranslation = null;
        }
      }

      if (
        articleTranslation &&
        articleTranslation.text &&
        articleTranslation.language === "ru"
      ) {
        foundTranslationCount++;
        loadedTranslations[item.id] = {
          text: articleTranslation.text,
          language: "ru" as const,
        };
      }
    });

    // Only log summary, not individual items
    if (foundAnalysisCount > 0 || foundTranslationCount > 0) {
      console.log(
        `[useNewsAnalysis] Loaded ${foundAnalysisCount} analyses and ${foundTranslationCount} translations from ${filteredNews.length} articles`
      );
    }

    // Update analyses state - only if there are new analyses to avoid unnecessary updates
    if (Object.keys(loadedAnalyses).length > 0) {
      setAnalyses((prev) => {
        // Check if we actually have new data
        const hasNewData = Object.keys(loadedAnalyses).some((id) => !prev[id]);
        if (!hasNewData) return prev;
        return { ...prev, ...loadedAnalyses };
      });
    }

    // Update translations state - only if there are new translations to avoid unnecessary updates
    if (Object.keys(loadedTranslations).length > 0) {
      setTranslations((prev) => {
        // Check if we actually have new data
        const hasNewData = Object.keys(loadedTranslations).some(
          (id) => !prev[id]
        );
        if (!hasNewData) return prev;
        return { ...prev, ...loadedTranslations };
      });
    }
  }, [filteredNews]);

  // Auto-translate articles on load (only title + content, not fullContent)
  // Only translate if translation doesn't exist in state AND not in database
  useEffect(() => {
    console.log("articles", filteredNews.length);
    const articlesToTranslate = filteredNews.filter((item) => {
      // Check if translation already exists in state
      if (translations[item.id]) {
        return false;
      }

      // Check if translation exists in database (from article.articleTranslation)
      const dbTranslation = (item as any).articleTranslation;
      if (
        dbTranslation &&
        dbTranslation.text &&
        dbTranslation.language === "ru"
      ) {
        // Translation exists in DB but not in state - it will be loaded by the other useEffect
        return false;
      }

      // Only translate if article has title and content
      return item.title && item.content && item.content.length > 0;
    });

    if (articlesToTranslate.length > 0) {
      console.log(
        `[useNewsAnalysis] Auto-translating ${
          articlesToTranslate.length
        } articles (${
          filteredNews.length - articlesToTranslate.length
        } already have translations)`
      );

      if (articlesToTranslate.length < 10) {
        // Translate articles in batches (max 3 at a time to avoid rate limits)
        const batchSize = 3;
        for (let i = 0; i < articlesToTranslate.length; i += batchSize) {
          const batch = articlesToTranslate.slice(i, i + batchSize);
          console.log("articles in for", articlesToTranslate.length);
          // Add small delay between batches
          setTimeout(() => {
            batch.forEach((item) => {
              // Translate only title + content (not fullContent)
              const textToTranslate = `${item.title}\n\n${item.content}`;
              // Auto-translation - don't show toast
              translateMutation.mutate(
                {
                  itemId: item.id,
                  text: textToTranslate,
                  showToast: false,
                },
                {
                  onSuccess: () => {
                    console.log(
                      `[useNewsAnalysis] ✅ Auto-translated article ${item.id}`
                    );
                  },
                  onError: (error) => {
                    console.warn(
                      `[useNewsAnalysis] ⚠️ Failed to auto-translate article ${item.id}:`,
                      error
                    );
                  },
                }
              );
            });
          }, i * 500); // 500ms delay between batches
        }
      }
    }
  }, [filteredNews, translations]); // Run when articles change or translations are loaded

  const translateMutation = useMutation({
    mutationFn: async ({
      itemId,
      text,
      showToast = false,
    }: {
      itemId: string;
      text: string;
      showToast?: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/news/translate", {
        text,
        articleId: itemId,
      });
      const response = await res.json();
      // Handle both new format { success: true, data: {...} } and old format
      return { ...(response.data || response), showToast };
    },
    onSuccess: (data: any, variables) => {
      const translated = data.translated || data.data?.translated || "";
      if (!translated) {
        toast({
          title: "Ошибка перевода",
          description: "Перевод не получен от сервера",
          variant: "destructive",
        });
        return;
      }

      setTranslations((prev) => ({
        ...prev,
        [variables.itemId]: {
          text: translated,
          language: "ru" as const,
        },
      }));

      // Only show toast if this was a manual translation (showToast flag is true)
      // Auto-translation happens silently in the background
      if (data.showToast) {
        toast({
          title: "Перевод завершен",
          description: "Статья переведена на русский",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Translation error:", error);
      toast({
        title: "Ошибка перевода",
        description: error.message || "Не удалось перевести статью",
        variant: "destructive",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({
      itemId,
      title,
      content,
    }: {
      itemId: string;
      title: string;
      content: string;
    }) => {
      console.log(`[useNewsAnalysis] Starting analysis for article ${itemId}`, {
        title: title.substring(0, 50),
        contentLength: content.length,
      });
      const res = await apiRequest("POST", "/api/news/analyze", {
        title,
        content,
        articleId: itemId,
      });
      const response = await res.json();
      console.log(`[useNewsAnalysis] Received response for article ${itemId}`, {
        hasData: !!response.data,
        hasSuccess: response.success !== undefined,
        keys: Object.keys(response),
      });
      return response;
    },
    onSuccess: (data: any, variables) => {
      console.log(
        `[useNewsAnalysis] onSuccess called for article ${variables.itemId}`,
        {
          rawData: data,
          hasData: !!data.data,
          hasSuccess: data.success !== undefined,
        }
      );

      // Extract analysis data from response
      // Response format: { success: true, data: { ...analysis } }
      const analysisData = data.data || data;

      if (
        !analysisData ||
        (!analysisData.score && !analysisData.overallScore)
      ) {
        console.error(
          `[useNewsAnalysis] Invalid analysis data for article ${variables.itemId}`,
          analysisData
        );
        toast({
          title: "Ошибка анализа",
          description: "Получены некорректные данные анализа",
          variant: "destructive",
        });
        setAnalyzingItems((prev) => {
          const next = new Set(prev);
          next.delete(variables.itemId);
          return next;
        });
        return;
      }

      console.log(
        `[useNewsAnalysis] Analysis completed for article ${variables.itemId}`,
        {
          score: analysisData.score,
          verdict: analysisData.verdict,
          hasBreakdown: !!analysisData.breakdown,
          saved: true, // Saved to database by server
        }
      );

      // Update analyses state
      setAnalyses((prev) => {
        const updated = {
          ...prev,
          [variables.itemId]: analysisData,
        };
        console.log(`[useNewsAnalysis] Updated analyses state`, {
          itemId: variables.itemId,
          totalAnalyses: Object.keys(updated).length,
          thisAnalysis: updated[variables.itemId],
        });
        return updated;
      });

      setAnalyzingItems((prev) => {
        const next = new Set(prev);
        next.delete(variables.itemId);
        return next;
      });

      const score = analysisData.score || analysisData.overallScore || "N/A";
      const verdict = (analysisData.verdict || "moderate") as
        | "excellent"
        | "good"
        | "moderate"
        | "weak";
      const verdictMap: Record<string, string> = {
        excellent: "Отлично",
        good: "Хорошо",
        moderate: "Умеренно",
        weak: "Слабо",
      };
      const verdictText = verdictMap[verdict] || "Умеренно";

      toast({
        title: "Анализ завершен",
        description: `Оценка: ${score}/100 (${verdictText})`,
      });
    },
    onError: (error: Error, variables) => {
      setAnalyzingItems((prev) => {
        const next = new Set(prev);
        next.delete(variables.itemId);
        return next;
      });
      toast({
        title: "Ошибка анализа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeBatchMutation = useMutation({
    mutationFn: async (
      articles: Array<{ id: string; title: string; content: string }>
    ) => {
      const res = await apiRequest("POST", "/api/news/analyze-batch", {
        articles,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      const results = data.data?.results || data.results || [];
      const newAnalyses: Record<string, any> = {};

      results.forEach((result: any) => {
        if (result.analysis && !result.error) {
          newAnalyses[result.articleId] = result.analysis;
        }
      });

      setAnalyses((prev) => ({ ...prev, ...newAnalyses }));
      setAnalyzingItems(new Set());

      const successful = results.filter((r: any) => !r.error).length;
      const failed = results.filter((r: any) => r.error).length;

      toast({
        title: "Анализ завершен",
        description: `Успешно: ${successful}, Ошибок: ${failed}`,
      });
    },
    onError: (error: Error) => {
      setAnalyzingItems(new Set());
      toast({
        title: "Ошибка анализа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = async (item: EnrichedRssItem) => {
    setAnalyzingItems((prev) => new Set(prev).add(item.id));

    // Fetch full content if needed
    let content = item.content || "";
    if (!item.fullContent) {
      try {
        const fullContentResponse = await apiRequest(
          "POST",
          `/api/news/${item.id}/fetch-full-content`,
          {}
        );
        const fullContentData = await fullContentResponse.json();
        content = fullContentData.success
          ? fullContentData.content || content
          : fullContentData.fallback || content;
      } catch (error) {
        console.error("Error fetching full content:", error);
      }
    } else {
      content = item.fullContent;
    }

    analyzeMutation.mutate({
      itemId: item.id,
      title: item.title,
      content,
    });
  };

  const handleAnalyzeAll = async () => {
    const articlesToAnalyze = filteredNews
      .filter((item) => !analyses[item.id] && !analyzingItems.has(item.id))
      .map(async (item) => {
        let content = item.content || "";
        if (!item.fullContent) {
          try {
            const fullContentResponse = await apiRequest(
              "POST",
              `/api/news/${item.id}/fetch-full-content`,
              {}
            );
            const fullContentData = await fullContentResponse.json();
            content = fullContentData.success
              ? fullContentData.content || content
              : fullContentData.fallback || content;
          } catch (error) {
            console.error(`Error fetching full content for ${item.id}:`, error);
          }
        } else {
          content = item.fullContent;
        }

        return {
          id: item.id,
          title: item.title,
          content,
        };
      });

    const articles = await Promise.all(articlesToAnalyze);

    if (articles.length === 0) {
      toast({
        title: "Нет статей для анализа",
        description: "Все статьи уже проанализированы",
      });
      return;
    }

    setAnalyzingItems(new Set(articles.map((a) => a.id)));
    analyzeBatchMutation.mutate(articles);
  };

  const loadSavedAnalysisMutation = useMutation({
    mutationFn: async (itemId: string) => {
      try {
        const res = await fetch(`/api/news/${itemId}/analysis`, {
          method: "GET",
          credentials: "include",
        });

        // Check content type first
        const contentType = res.headers.get("content-type") || "";
        console.log(
          `[useNewsAnalysis] Response status: ${res.status}, content-type: ${contentType}`
        );

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error(
            `[useNewsAnalysis] ❌ Server returned non-JSON response:`,
            {
              contentType,
              preview: text.substring(0, 200),
              isHTML: text.includes("<!DOCTYPE"),
            }
          );
          throw new Error(
            "Сервер вернул некорректный ответ. Возможно, endpoint не зарегистрирован."
          );
        }

        // Check if response is OK
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: res.statusText }));
          throw new Error(
            errorData.error || errorData.message || `HTTP ${res.status}`
          );
        }

        const response = await res.json();
        console.log(
          `[useNewsAnalysis] Received response for article ${itemId}`,
          {
            success: response.success,
            hasData: !!response.data,
          }
        );

        if (!response.success || !response.data) {
          throw new Error(response.error || "No analysis data in response");
        }

        return response.data;
      } catch (error: any) {
        console.error(
          `[useNewsAnalysis] Error loading analysis for article ${itemId}:`,
          error
        );
        // Re-throw to trigger onError
        throw error;
      }
    },
    onSuccess: (analysisData: any, itemId: string) => {
      console.log(
        `[useNewsAnalysis] ✅ Loaded saved analysis for article ${itemId}`,
        {
          score: analysisData?.score,
          verdict: analysisData?.verdict,
        }
      );

      setAnalyses((prev) => ({
        ...prev,
        [itemId]: analysisData,
      }));

      toast({
        title: "Анализ загружен",
        description: `Оценка: ${analysisData?.score || "N/A"}/100`,
      });
    },
    onError: (error: any, itemId: string) => {
      console.error(
        `[useNewsAnalysis] ❌ Failed to load analysis for article ${itemId}:`,
        error
      );

      // Extract error message
      let errorMessage = "Не удалось загрузить анализ";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.body?.error) {
        errorMessage = error.body.error;
      } else if (error.body?.message) {
        errorMessage = error.body.message;
      }

      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleLoadSavedAnalysis = (itemId: string) => {
    loadSavedAnalysisMutation.mutate(itemId);
  };

  return {
    translations,
    analyses,
    analyzingItems,
    translateMutation,
    analyzeMutation,
    analyzeBatchMutation,
    loadSavedAnalysisMutation,
    handleAnalyze,
    handleAnalyzeAll,
    handleLoadSavedAnalysis,
  };
}
