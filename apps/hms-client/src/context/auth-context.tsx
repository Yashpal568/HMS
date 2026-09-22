'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  specialization?: string;
  phone?: string;
  permissions: string[];
  status?: string;
  hospitalId?: string;
}

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      } else {
        localStorage.removeItem('hms_token');
        setToken(null);
        setUser(null);
        return false;
      }
    } catch {
      localStorage.removeItem('hms_token');
      setToken(null);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
      if (savedToken) {
        setToken(savedToken);
        await fetchProfile(savedToken);
      }
      setIsLoading(false);
    };

    void initAuth();
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.error?.message || 'Authentication failed. Please check your credentials.';
        setError(message);
        setIsLoading(false);
        return false;
      }

      setUser(data.user);
      setToken(data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hms_token', data.accessToken);
      }
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to authentication server.';
      setError(message);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      }
    } catch {
      // Ignore logout network errors
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hms_token');
      }
      setToken(null);
      setUser(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'HOSPITAL_ADMIN' || user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
