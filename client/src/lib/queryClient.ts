import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add authorization header if token exists
  const token = localStorage.getItem('auth_token');
  console.log('apiRequest: localStorage token:', token);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('apiRequest: Added Authorization header:', headers['Authorization']);
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  const responseData = await res.json();
  console.log(`apiRequest response for ${url}:`, responseData);
  return responseData;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add authorization header if token exists
    const token = localStorage.getItem('auth_token');
    console.log('getQueryFn: localStorage token:', token);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('getQueryFn: Added Authorization header:', headers['Authorization']);
    }
    
    // Handle query parameters for search endpoint
    let url = queryKey[0] as string;
    if (queryKey[1] && typeof queryKey[1] === 'object') {
      const params = new URLSearchParams();
      Object.entries(queryKey[1] as Record<string, string>).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      url += '?' + params.toString();
    }
    
    console.log('getQueryFn: Fetching URL:', url);
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
