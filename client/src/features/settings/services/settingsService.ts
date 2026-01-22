import { apiRequest } from "@/shared/api";

export const settingsService = {
  /**
   * Get all API keys
   */
  getApiKeys: async (): Promise<any[]> => {
    const response = await apiRequest("GET", "/api/settings/api-keys");
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Add API key
   */
  addApiKey: async (provider: string, key: string, description?: string): Promise<any> => {
    const response = await apiRequest("POST", "/api/settings/api-keys", {
      provider,
      key,
      description,
    });
    return response.json();
  },

  /**
   * Delete API key
   */
  deleteApiKey: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/settings/api-keys/${id}`, {});
  },

  /**
   * Test API key
   */
  testApiKey: async (id: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/settings/api-keys/${id}/test`, {});
    return response.json();
  },

  /**
   * Get all RSS sources
   */
  getRssSources: async (): Promise<any[]> => {
    const response = await apiRequest("GET", "/api/settings/rss-sources");
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Add RSS source
   */
  addRssSource: async (name: string, url: string, topic?: string): Promise<any> => {
    const response = await apiRequest("POST", "/api/settings/rss-sources", {
      name,
      url,
      topic,
    });
    return response.json();
  },

  /**
   * Update RSS source
   */
  updateRssSource: async (id: string, data: any): Promise<any> => {
    const response = await apiRequest("PATCH", `/api/settings/rss-sources/${id}`, data);
    return response.json();
  },

  /**
   * Delete RSS source
   */
  deleteRssSource: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/settings/rss-sources/${id}`, {});
  },

  /**
   * Parse RSS source
   */
  parseRssSource: async (id: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/settings/rss-sources/${id}/parse`, {});
    return response.json();
  },

  /**
   * Get all Instagram sources
   */
  getInstagramSources: async (): Promise<any[]> => {
    const response = await apiRequest("GET", "/api/settings/instagram-sources");
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Add Instagram source
   */
  addInstagramSource: async (data: any): Promise<any> => {
    const response = await apiRequest("POST", "/api/settings/instagram-sources", data);
    return response.json();
  },

  /**
   * Delete Instagram source
   */
  deleteInstagramSource: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/settings/instagram-sources/${id}`, {});
  },
};
