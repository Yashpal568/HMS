'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, ApiClientError } from '../lib/api-client';

export interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: SuperAdminUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, totpCode?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hms_super_admin_token');
      localStorage.removeItem('hms_super_admin_user');
    }
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('hms_super_admin_token');
      const storedUser = localStorage.getItem('hms_super_admin_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Protect routes from unauthenticated access
  useEffect(() => {
    if (!isLoading) {
      const isLoginPage = pathname === '/login';
      if (!token && !isLoginPage) {
        router.push('/login');
      } else if (token && isLoginPage) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, token, pathname, router]);

  const login = async (email: string, password: string, totpCode?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Send login request to /auth/login
      const payload: Record<string, string> = { email, password };
      if (totpCode && totpCode.trim()) {
        payload.totpCode = totpCode.trim();
      }
      const res = await apiClient.post<any>('/auth/login', payload);

      if (!res.accessToken || !res.user) {
        throw new Error('Invalid authentication response from server.');
      }

      // Verify that this user actually has the SUPER_ADMIN role!
      if (res.user.role !== 'SUPER_ADMIN') {
        throw new Error(
          'Access Denied: This portal requires Platform Super Admin privileges. Hospital staff must access apps/hms-client.',
        );
      }

      const superAdminUser: SuperAdminUser = {
        id: res.user.id,
        email: res.user.email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        role: res.user.role,
        permissions: res.user.permissions || [],
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('hms_super_admin_token', res.accessToken);
        localStorage.setItem('hms_super_admin_user', JSON.stringify(superAdminUser));
      }

      setToken(res.accessToken);
      setUser(superAdminUser);
      router.push('/dashboard');
      return true;
    } catch (err: unknown) {
      let msg = 'Authentication failed. Please check your credentials.';
      if (err instanceof ApiClientError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
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
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
