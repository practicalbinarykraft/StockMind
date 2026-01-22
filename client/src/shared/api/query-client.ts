import { QueryClient } from "@tanstack/react-query";
import { getQueryFn } from "./http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,  // Disable to prevent logout on window focus
      staleTime: 5 * 60 * 1000,  // 5 minutes cache
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
