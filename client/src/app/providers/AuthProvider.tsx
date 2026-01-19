import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * JWT Authentication Context (httpOnly Cookies)
 *
 * SECURITY: Token is stored in httpOnly cookie (not accessible via JS)
 * Authentication state is determined by calling /api/auth/me
 * Cookies are automatically sent with credentials: 'include'
 */

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check current authentication status
   */
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Send cookies with request
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cookie will be set by server
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
  };

  /**
   * Register new user
   */
  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<void> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cookie will be set by server
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
  };

  /**
   * Logout - clears the httpOnly cookie on server
   */
  const logout = async (): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Legacy hook for backwards compatibility
 * @deprecated Use useAuth() instead
 */
export function useAuthToken() {
  const { isAuthenticated, logout } = useAuth();
  return {
    token: null, // Token is in httpOnly cookie, not accessible
    setToken: () => {}, // No-op - server manages token
    logout,
    isAuthenticated,
  };
}
