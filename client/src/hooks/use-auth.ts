import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/lib/auth-context";
import type { User } from "@shared/schema";

export function useAuth() {
  const { token, logout } = useAuthToken();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !!token, // Only fetch if token exists
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!token && !!user,
    logout,
  };
}
