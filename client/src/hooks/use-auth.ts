import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/lib/auth-context";
import { getQueryFn } from "@/lib/query-client";
import type { User } from "@shared/schema";

export function useAuth() {
  const { token, logout } = useAuthToken();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }), // Return null on 401 instead of throwing
    retry: false,
    enabled: !!token, // Only fetch if token exists
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid logout
    refetchOnMount: true, // Only refetch on mount (page load), not on every render
  });

  // If we get 401, token is invalid - but don't clear it here
  // Let PrivateRoute handle the redirect to avoid race conditions

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!token && !!user,
    logout,
  };
}
