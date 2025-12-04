import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getToken } from "./auth-context";

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
      } catch (e) {
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

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Always use getAuthHeaders to ensure token is included
  const headers: Record<string, string> = getAuthHeaders() as Record<string, string>;

  // Override Content-Type for POST/PUT/PATCH requests with data
  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    headers["Content-Type"] = "application/json";
  } else if (!data) {
    // Remove Content-Type if no data (GET/DELETE requests)
    delete headers["Content-Type"];
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Still include for compatibility
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getToken();
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
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
      staleTime: 5 * 60 * 1000,  // ✅ 5 minutes (reasonable cache time)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
