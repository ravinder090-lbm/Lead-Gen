import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@shared/schema";
import { showError } from "@/lib/sweet-alert";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Default context value
const defaultContextValue: AuthContextType = {
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  checkAuth: async () => {},
  refreshUser: async () => {},
};

// Create context with default value
const AuthContext = createContext<AuthContextType>(defaultContextValue);

/**
 * Custom hook to access auth context
 * Using a named function for useAuth to maintain compatibility with HMR
 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Auth Provider Component
 * Optimized for performance with memoization and proper caching
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State management - start with isLoading false to prevent black screen
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Reference to track authentication requests to prevent duplicate calls
  const authRequestInProgress = useRef(false);
  const lastAuthCheck = useRef(0);

  /**
   * Check authentication status
   * Optimized with debouncing and caching
   */
  const checkAuth = useCallback(async () => {
    // Don't run multiple auth checks simultaneously
    if (authRequestInProgress.current) {
      return;
    }
    
    // Throttle auth checks to at most once every 2 seconds
    const now = Date.now();
    if (now - lastAuthCheck.current < 2000) {
      return;
    }
    
    lastAuthCheck.current = now;
    authRequestInProgress.current = true;
    // Don't set isLoading to true here to prevent black screen
    // Only show loading indicators in components that need updated data
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      // Try fetching from cache first (except on initial load)
      if (lastAuthCheck.current > 0) {
        const cachedData = queryClient.getQueryData(["/api/auth/me"]);
        if (cachedData) {
          setUser(cachedData as User);
          setIsLoading(false);
          authRequestInProgress.current = false;
          clearTimeout(timeoutId);
          return;
        }
      }
      
      // Otherwise fetch from API with retry mechanism
      let retryCount = 0;
      const maxRetries = 2;
      let res;

      while (retryCount <= maxRetries) {
        try {
          res = await fetch("/api/auth/me", {
            credentials: "include",
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          // Break out of retry loop if successful
          if (res.ok) break;
          
          // Only retry on server errors or connection issues
          if (res.status < 500) break;
          
          // Exponential backoff for retries
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        } catch (error) {
          // Only retry on network errors, not on user abort
          if (error instanceof Error && error.name === 'AbortError') throw error;
          
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          } else {
            throw error;
          }
        }
      }

      if (res && res.ok) {
        const userData = await res.json();
        
        // Verify we got valid user data
        if (!userData || !userData.id || !userData.role) {
          console.error("Invalid user data received:", userData);
          setUser(null);
          queryClient.setQueryData(["/api/auth/me"], null);
          return;
        }
        
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log("Auth check - user data:", {
            id: userData.id,
            role: userData.role,
            email: userData.email
          });
        }
        
        // Update both state and cache
        setUser(userData);
        queryClient.setQueryData(["/api/auth/me"], userData);
        
        // Pre-fetch common user data
        if (userData?.id) {
          // Use setTimeout to make these non-blocking
          setTimeout(() => {
            if (userData.role === 'user') {
              queryClient.prefetchQuery({ 
                queryKey: ['/api/user/dashboard'],
                staleTime: 60 * 1000 // 1 minute
              });
            }
          }, 500);
        }
      } else {
        setUser(null);
        queryClient.setQueryData(["/api/auth/me"], null);
      }
    } catch (error) {
      // Don't log abort errors as they are expected
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Auth check failed", error);
      }
      setUser(null);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      authRequestInProgress.current = false;
    }
  }, []);

  /**
   * Initial authentication check on mount
   */
  useEffect(() => {
    checkAuth();
    
    // Setup periodic refresh in case of long sessions
    const intervalId = setInterval(() => {
      // Only refresh if user is already authenticated
      if (user) {
        refreshUser();
      }
    }, 15 * 60 * 1000); // Every 15 minutes
    
    return () => clearInterval(intervalId);
  }, [checkAuth, user]);

  /**
   * Refresh user data - optimized with caching and error handling
   */
  const refreshUser = useCallback(async () => {
    // Don't run refresh if another auth request is in progress
    if (authRequestInProgress.current) {
      return;
    }
    
    authRequestInProgress.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Try cache first with a short stale time
      const cachedData = queryClient.getQueryData(["/api/auth/me"]) as User | undefined;
      const cacheAge = queryClient.getQueryState(["/api/auth/me"])?.dataUpdatedAt || 0;
      const isCacheFresh = Date.now() - cacheAge < 30 * 1000; // 30 seconds
      
      if (cachedData && isCacheFresh) {
        setUser(cachedData);
        authRequestInProgress.current = false;
        clearTimeout(timeoutId);
        return;
      }

      // Fetch fresh data using optimized request
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (res.ok) {
        const userData = await res.json();
        
        // Update local state
        setUser(userData);
        
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log("Refreshed user from API");
        }
        
        // Update the cache atomically
        queryClient.setQueryData(["/api/auth/me"], userData);
        
        // Batch update all related caches in one operation
        if (userData && userData.leadCoins !== undefined) {
          queryClient.setQueriesData(
            { predicate: query => {
              const key = Array.isArray(query.queryKey) ? 
                query.queryKey[0]?.toString() : 
                query.queryKey?.toString();
              return key?.includes('/api/user');
            }},
            (oldData: any) => {
              if (!oldData) return oldData;
              
              // Handle different data structures
              if (oldData.leadCoins !== undefined) {
                return { ...oldData, leadCoins: userData.leadCoins };
              }
              
              if (oldData.user && oldData.user.leadCoins !== undefined) {
                return {
                  ...oldData,
                  user: { ...oldData.user, leadCoins: userData.leadCoins }
                };
              }
              
              return oldData;
            }
          );
        }
      }
    } catch (error) {
      // Only log non-abort errors
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Failed to refresh user data", error);
      }
    } finally {
      clearTimeout(timeoutId);
      authRequestInProgress.current = false;
    }
  }, []);

  /**
   * Handle user login - optimized with validation and cache updates
   */
  const login = useCallback((userData: User) => {
    // Validate user data before proceeding
    if (!userData || !userData.id || !userData.role) {
      console.error("Invalid user data in login:", userData);
      toast({
        title: "Login Error",
        description: "Invalid user data received from server",
        variant: "destructive",
      });
      return;
    }
    
    // Log successful login in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log("Login successful - user data:", {
        id: userData.id,
        role: userData.role,
        email: userData.email,
      });
    }
    
    // Update local state
    setUser(userData);
    
    // Update the cache in multiple locations to ensure consistency
    queryClient.setQueryData(["/api/auth/me"], userData);
    
    // Reset loading state
    setIsLoading(false);
    
    // Clear any previous auth-related errors
    authRequestInProgress.current = false;
    
    // Pre-fetch user-specific data after login for improved UX
    setTimeout(() => {
      if (userData.role === 'admin') {
        queryClient.prefetchQuery({ queryKey: ['/api/admin/dashboard'] });
      } else if (userData.role === 'subadmin') {
        queryClient.prefetchQuery({ queryKey: ['/api/subadmin/dashboard'] });
      } else if (userData.role === 'user') {
        queryClient.prefetchQuery({ queryKey: ['/api/user/dashboard'] });
      }
    }, 500);
  }, [toast]);

  /**
   * Handle logout with proper cleanup and error handling
   */
  const logout = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Attempt to logout with a timeout
      await apiRequest("POST", "/api/auth/logout", {}, {
        abortSignal: controller.signal
      });

      // Clear user state
      setUser(null);

      // Clear query cache
      queryClient.clear();

      // Redirect to login page
      window.location.href = "/login";
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error.name !== 'AbortError') {
        // Show error notifications
        showError(
          "Logout Failed",
          error.message || "Failed to logout. Please try again.",
        );

        toast({
          variant: "destructive",
          title: "Logout failed",
          description: error.message || "Failed to logout. Please try again.",
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [toast]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    checkAuth,
    refreshUser,
  }), [user, isLoading, login, logout, checkAuth, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
