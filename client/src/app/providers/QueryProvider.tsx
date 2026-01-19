import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

/**
 * React Query Configuration
 *
 * SECURITY: Authentication uses httpOnly cookies (automatic with credentials: 'include')
 * No need to manually add Authorization headers - cookies are sent automatically
 */

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Try to parse JSON, but handle HTML error pages gracefully
    let body: any;
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch {
        body = { message: res.statusText || 'Unknown error' };
      }
    } else {
      // Server returned HTML or other non-JSON content (likely an error page)
      const text = await res.text().catch(() => '');
      body = {
        message: res.statusText || 'Server error',
        details: text.includes('<!DOCTYPE') ? 'Server returned HTML error page' : text.substring(0, 200)
      };
    }

    throw new ApiError(res.status, body);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};

  // Set Content-Type for requests with body
  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Sends httpOnly cookies automatically
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T,>(options: {
  on401: UnauthorizedBehavior;
}) => async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const res = await fetch(queryKey.join("/") as string, {
    credentials: "include", // Sends httpOnly cookies automatically
  });

  if (options.on401 === "returnNull" && res.status === 401) {
    return null;
  }

  await throwIfResNotOk(res);
  const response = await res.json();
  // Unwrap new API format: { success: true, data: {...} }
  return response.data || response;
};

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
