import { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";


interface ProvidersProps {
  children: ReactNode;
}

/**
 * Composite Provider
 * Combines all app-level providers in the correct order
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export { QueryProvider, queryClient, apiRequest, ApiError, getQueryFn } from "./QueryProvider";
export { AuthProvider, useAuth, useAuthToken, type User } from "./AuthProvider";
export { ThemeProvider, useTheme } from "./ThemeProvider"; // проверить после всех изменений
