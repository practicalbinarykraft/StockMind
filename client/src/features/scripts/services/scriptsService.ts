import { apiRequest } from "@/shared/api";

export const scriptsService = {
  /**
   * Get all scripts
   */
  getAll: async (params?: {
    status?: string;
    sourceType?: string;
    search?: string;
  }): Promise<any[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.sourceType) searchParams.append("sourceType", params.sourceType);
    if (params?.search) searchParams.append("search", params.search);

    const query = searchParams.toString();
    const url = `/api/scripts${query ? `?${query}` : ""}`;
    
    const response = await apiRequest("GET", url);
    const data = await response.json();
    return data.data || data || [];
  },

  /**
   * Get script by ID
   */
  getById: async (id: string): Promise<any> => {
    const response = await apiRequest("GET", `/api/scripts/${id}`);
    return response.json();
  },

  /**
   * Delete script
   */
  delete: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/scripts/${id}`);
  },

  /**
   * Analyze script
   */
  analyze: async (id: string): Promise<any> => {
    const response = await apiRequest("POST", `/api/scripts/${id}/analyze`);
    return response.json();
  },
};
