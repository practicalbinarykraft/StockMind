import { useQuery } from "@tanstack/react-query";
import { newsService } from "../services";

interface UseNewsParams {
  source?: string;
  score?: string;
  sort?: string;
}

/**
 * Hook for fetching news articles
 */
export function useNews(params?: UseNewsParams) {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["/api/news/all", params],
    queryFn: () => newsService.getAll(params),
  });

  return {
    articles: articles || [],
    isLoading,
  };
}

/**
 * Hook for fetching favorite news articles
 */
export function useNewsFavorites() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["/api/news/favorites"],
    queryFn: () => newsService.getFavorites(),
  });

  return {
    articles: articles || [],
    isLoading,
  };
}
