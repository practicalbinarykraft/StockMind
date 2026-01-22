import { apiRequest } from "@/shared/api";

export const instagramService = {
  /**
   * Get all Instagram accounts
   */
  getAccounts: async (): Promise<any[]> => {
    const response = await apiRequest("GET", "/api/ig/accounts");
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Delete Instagram account
   */
  deleteAccount: async (accountId: string): Promise<void> => {
    await apiRequest("DELETE", `/api/ig/accounts/${accountId}`);
  },

  /**
   * Get media list for account
   */
  getMedia: async (accountId: string): Promise<any[]> => {
    const response = await apiRequest("GET", `/api/ig/accounts/${accountId}/media`);
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Sync media insights
   */
  syncMedia: async (igMediaId: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/ig/media/${igMediaId}/sync`);
    return response.json();
  },

  /**
   * Get media insights
   */
  getMediaInsights: async (igMediaId: string): Promise<any> => {
    const response = await apiRequest("GET", `/api/ig/media/${igMediaId}/insights`);
    const data = await response.json();
    return data;
  },

  /**
   * Get project performance
   */
  getProjectPerformance: async (projectId: string): Promise<any> => {
    const response = await apiRequest("GET", `/api/ig/projects/${projectId}/performance`);
    return response.json();
  },

  /**
   * Bind media to project version
   */
  bindMedia: async (projectId: string, versionId: string, igMediaId: string, bindType: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/ig/projects/${projectId}/versions/${versionId}/bind`, {
      igMediaId,
      bindType,
    });
    return response.json();
  },
};
