import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { queryClient } from "@/shared/api";

/**
 * React Query Configuration
 *
 * SECURITY: Authentication uses httpOnly cookies (automatic with credentials: 'include')
 * No need to manually add Authorization headers - cookies are sent automatically
 */


interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient, ApiError, apiRequest, getQueryFn } from "@/shared/api";
