import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * JWT Authentication Context
 * Manages JWT token storage and authentication state
 */

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'jwt_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setTokenState(savedToken);
    }
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setTokenState(null);
  };

  const value = {
    token,
    setToken,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthToken() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthToken must be used within an AuthProvider');
  }
  return context;
}

/**
 * Get JWT token (for use outside React components)
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}
