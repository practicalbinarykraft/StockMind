export const conveyorService = {
  /**
   * Get dashboard data
   */
  getDashboard: async (): Promise<any> => {
    const res = await fetch("/api/conveyor/dashboard", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch dashboard");
    return res.json();
  },

  /**
   * Get conveyor items
   */
  getItems: async (limit: number = 20): Promise<any[]> => {
    const res = await fetch(`/api/conveyor/items?limit=${limit}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch items");
    return res.json();
  },

  /**
   * Trigger conveyor manually
   */
  trigger: async (): Promise<any> => {
    const res = await fetch("/api/conveyor/trigger", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message);
    }
    return res.json();
  },

  /**
   * Pause conveyor (sets enabled: false)
   */
  pause: async (): Promise<any> => {
    const res = await fetch("/api/conveyor/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled: false }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message);
    }
    return res.json();
  },

  /**
   * Resume conveyor (sets enabled: true)
   */
  resume: async (): Promise<any> => {
    const res = await fetch("/api/conveyor/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled: true }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message);
    }
    return res.json();
  },
};
