import { QueryClient, QueryFunction, infiniteQueryOptions } from "@tanstack/react-query";

/**
 * Utility function to handle response errors with improved error details
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    try {
      // Try to parse JSON error message
      const errorData = await res.json();
      
      // Special handling for password validation errors
      if (res.url.includes('/api/auth/change-password') && errorData.message === "Current password is incorrect") {
        throw new Error("Current password is incorrect");
      }
      
      errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
    } catch (e) {
      // If it's already a custom error, rethrow it
      if (e instanceof Error && e.message === "Current password is incorrect") {
        throw e;
      }
      
      // Fall back to text if not JSON
      errorMessage = await res.text() || res.statusText;
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

/**
 * Enhanced API request function with performance optimizations and improved authentication support
 * Supports optimistic cache updates, request cancellation, and better error handling
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    updateCache?: boolean;
    queryKey?: string | string[];
    updater?: (oldData: any, newData: any) => any;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
    retries?: number;
    timeout?: number;
    parseResponse?: boolean; // Whether to parse and handle response directly
  }
): Promise<Response> {
  // Log auth-related requests in development for debugging
  if (process.env.NODE_ENV === 'development' && url.includes('/api/auth/')) {
    console.log(`Making ${method} request to ${url}`);
  }

  // Create headers with content type if data is provided
  const headers = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...options?.headers,
  };

  // Set up timeout if specified
  const controller = new AbortController();
  const timeoutId = options?.timeout ? 
    setTimeout(() => controller.abort(), options.timeout) : 
    null;
  
  // Create a local controller if not provided through options
  const signal = options?.abortSignal || controller.signal;

  // Track retries
  let retryCount = 0;
  const maxRetries = options?.retries ?? 1;

  async function executeRequest(): Promise<Response> {
    try {
      const startTime = Date.now(); // For tracking request duration
      
      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include", // Always include credentials
        signal,
      });

      const duration = Date.now() - startTime;
      
      // Log slow requests for performance monitoring
      if (duration > 1000 && process.env.NODE_ENV === 'development') {
        console.warn(`Slow request to ${url} took ${duration}ms`);
      }

      // Special handling for auth endpoints - only login and register can bypass validation
      if ((url.includes('/api/auth/login') || url.includes('/api/auth/register')) && res.ok) {
        // Return successful response without validation for login/register
        return res;
      }

      // Special handling for rate limiting (HTTP 429)
      if (res.status === 429 && retryCount < maxRetries) {
        retryCount++;
        const retryAfter = res.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * retryCount;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return executeRequest();
      }

      // Check for 401 unauthorized and session timeout
      if (res.status === 401) {
        console.log("Unauthorized response from server - session may have expired");
        // We don't throw here for auth endpoints to let the component handle it
        if (!url.includes('/api/auth/')) {
          throw new Error("Your session has expired. Please log in again.");
        }
      }

      // Validate all responses, including auth endpoints
      await throwIfResNotOk(res);
      
      // Optimistically update cache directly for immediate UI updates
      if (options?.updateCache && options.queryKey) {
        try {
          const responseData = await res.clone().json();
          const queryKeyArray = Array.isArray(options.queryKey) 
            ? options.queryKey 
            : [options.queryKey];
          
          if (options.updater) {
            // Use custom updater function for fine-grained control
            queryClient.setQueryData(queryKeyArray, (oldData: any) => 
              options.updater!(oldData, responseData)
            );
          } else {
            // Direct replacement with new data
            queryClient.setQueryData(queryKeyArray, responseData);
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Failed to update cache with response data:", error);
          }
        }
      }
      
      return res;
    } catch (error) {
      // Retry network errors a limited number of times
      if (error instanceof TypeError && error.message.includes('network') && retryCount < maxRetries) {
        retryCount++;
        const delayMs = 1000 * retryCount;
        console.log(`Network error, retrying in ${delayMs}ms (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return executeRequest();
      }
      
      // Enhanced error handling
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error(`API request failed for ${method} ${url}:`, error.message);
      }
      throw error;
    }
  }

  try {
    return await executeRequest();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Type for unauthorized behavior options
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Enhanced query function factory with advanced caching control, 
 * connection resilience, and preloading optimizations
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  cacheTime?: number;
  priority?: "high" | "normal" | "low";
  timeout?: number;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, cacheTime, priority = "normal", timeout = 30000 }) =>
  async ({ queryKey, signal, meta }) => {
    // Handle array query keys
    const endpoint = typeof queryKey[0] === 'string' ? queryKey[0] : 
      Array.isArray(queryKey[0]) ? queryKey[0][0] : String(queryKey[0]);
    
    // Create composite signal that respects both the query signal and a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Combine signals if a signal was provided
    let combinedSignal = controller.signal;
    if (signal) {
      // Create a new signal that aborts when either original signal or controller signal aborts
      signal.addEventListener('abort', () => controller.abort());
    }
    
    // Adjust headers based on priority and caching needs
    const headers: Record<string, string> = {};
    
    // Add cache control headers based on provided cacheTime
    if (cacheTime) {
      headers['Cache-Control'] = `max-age=${cacheTime}`;
    }
    
    // Set priority hint header for browsers that support it
    if (priority === "high") {
      headers['Priority'] = 'high';
    } else if (priority === "low") {
      headers['Priority'] = 'low';
    }
    
    try {
      const res = await fetch(endpoint, {
        credentials: "include",
        signal: combinedSignal,
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Special handling for conditional responses (304 Not Modified)
      if (res.status === 304) {
        // Return the cached data without modification
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData) return cachedData;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Don't log abort errors as they are expected during cancellation
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error(`Query failed for ${endpoint}:`, error.message);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

/**
 * Helper function to create pagination query options
 */
export function createPaginationQuery(endpoint: string, options = {}) {
  return infiniteQueryOptions({
    queryKey: [endpoint],
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      // Extract pagination info from the response
      if (!lastPage || !lastPage.pagination) return undefined;
      
      const { currentPage, totalPages } = lastPage.pagination;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    ...options
  });
}

/**
 * Query client with optimized performance settings
 * Configured for optimal client-side performance with smart caching and prefetching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Customize refetch behavior based on environment
      refetchOnWindowFocus: import.meta.env.PROD ? false : true,
      // Extended stale time for better client-side performance in production
      staleTime: import.meta.env.PROD ? 60 * 1000 : 30 * 1000, 
      // Keeping unused data longer in production, shorter in development
      gcTime: import.meta.env.PROD ? 10 * 60 * 1000 : 5 * 60 * 1000, 
      retry: (failureCount, error) => {
        // Don't retry server errors (5xx) or client errors (4xx) except network issues
        if (error instanceof Error) {
          const status = parseInt(error.message.split(':')[0]);
          // Only retry connection errors or server overload errors
          if (isNaN(status) || status >= 500) {
            return failureCount < 2;
          }
          return false;
        }
        return failureCount < 1;
      },
      refetchOnMount: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry network errors
        if (error instanceof TypeError && error.message.includes('network')) {
          return failureCount < 2;
        }
        return false;
      },
      onError: (error) => {
        // Only log in development to avoid excessive logging in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Mutation error:', error);
        }
      },
      // Optimistic updates are handled in apiRequest function
    },
  },
});
