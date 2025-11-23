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
    const body = await res.json().catch(() => ({ message: res.statusText }));
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
  const headers = data ? getAuthHeaders() : {};

  // Add auth header even without data
  const token = getToken();
  if (token && !data) {
    headers["Authorization"] = `Bearer ${token}`;
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
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,  // ✅ Refresh when user returns to tab
      staleTime: 5 * 60 * 1000,  // ✅ 5 minutes (reasonable cache time)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
