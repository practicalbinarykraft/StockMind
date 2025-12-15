import { useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/query-client";
import type { EnrichedRssItem } from "../utils/news-helpers";

/**
 * Hook for batch scoring news items
 * Automatically scores unscored items when they become visible
 */
export function useNewsBatchScoring(
  paginatedArticles: EnrichedRssItem[],
  page: number
) {
  const scoredPagesRef = useRef<Set<number>>(new Set());
  const scoringInProgressRef = useRef(false);

  useEffect(() => {
    // Skip if already scored this page or if scoring is in progress
    if (scoredPagesRef.current.has(page) || scoringInProgressRef.current) {
      return;
    }

    // Find items without AI score
    const unscoredItems = paginatedArticles.filter(
      (item) => item.aiScore === null || item.aiScore === undefined
    );

    if (unscoredItems.length === 0) {
      // Mark page as scored even if no items to score
      scoredPagesRef.current.add(page);
      return;
    }

    // Score items
    const scoreItems = async () => {
      scoringInProgressRef.current = true;
      try {
        const itemIds = unscoredItems.map((item) => item.id);
        
        console.log(`[News Scoring] Requesting batch scoring for page ${page}`, {
          itemCount: itemIds.length,
          itemIds: itemIds.slice(0, 5), // Log first 5 IDs
        });

        const res = await apiRequest("POST", "/api/news/score-batch", {
          itemIds,
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`[News Scoring] Batch scoring initiated for page ${page}`, data);
          scoredPagesRef.current.add(page);
          
          // Refetch news data after a delay to get updated scores
          // AI scoring typically takes 2-5 seconds per item
          const estimatedDelay = Math.min(data.scoredCount * 3000, 15000); // Max 15 seconds
          setTimeout(() => {
            console.log(`[News Scoring] Refetching news data after scoring`);
            queryClient.invalidateQueries({ queryKey: ["/api/news/all"] });
          }, estimatedDelay);
        } else {
          console.error(`[News Scoring] Failed to initiate batch scoring for page ${page}`, {
            status: res.status,
          });
        }
      } catch (error: any) {
        console.error(`[News Scoring] Error in batch scoring for page ${page}`, {
          error: error.message,
        });
      } finally {
        scoringInProgressRef.current = false;
      }
    };

    // Delay scoring slightly to avoid race conditions
    const timeoutId = setTimeout(scoreItems, 500);

    return () => clearTimeout(timeoutId);
  }, [paginatedArticles, page]);
}

