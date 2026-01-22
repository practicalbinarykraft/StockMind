import { apiRequest } from "@/shared/api";
import type { RssItem } from "@shared/schema";

export const newsService = {
  /**
   * Get all news articles
   */
  getAll: async (params?: {
    source?: string;
    score?: string;
    sort?: string;
  }): Promise<RssItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.append("source", params.source);
    if (params?.score) searchParams.append("score", params.score);
    if (params?.sort) searchParams.append("sort", params.sort);

    const query = searchParams.toString();
    const url = `/api/news/all${query ? `?${query}` : ""}`;
    
    const response = await apiRequest("GET", url);
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Get favorite news articles
   */
  getFavorites: async (): Promise<RssItem[]> => {
    const response = await apiRequest("GET", "/api/news/favorites");
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Refresh RSS feeds manually
   */
  refresh: async (): Promise<{ newItems: number }> => {
    const response = await apiRequest("POST", "/api/news/refresh", {});
    return response.json();
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite: async (id: string, isFavorite: boolean): Promise<void> => {
    if (isFavorite) {
      await apiRequest("POST", `/api/news/${id}/favorite`);
    } else {
      await apiRequest("DELETE", `/api/news/${id}/favorite`);
    }
  },

  /**
   * Create project from news article
   */
  createProjectFromNews: async (itemId: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/projects/from-news/${itemId}`, {});
    return response.json();
  },
};
