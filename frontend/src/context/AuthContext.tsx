'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  authLogin,
  authRegister,
  authLogout,
  authGetMe,
  authForgotPassword,
  authVerifyOtp,
  authResetPassword,
} from '@/lib/api';

const TOKEN_KEY = 'wallcano_auth_token';
const LEGACY_TOKEN_KEY = 'walcano_auth_token';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (email: string, otpCode: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to persist auth tokens
  const persistToken = (jwtToken: string | null) => {
    if (typeof window === 'undefined') return;
    if (jwtToken) {
      localStorage.setItem(TOKEN_KEY, jwtToken);
      // Set secure cookie for SSR / middleware compatibility
      document.cookie = `${TOKEN_KEY}=${jwtToken}; path=/; max-age=86400; SameSite=Lax`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${LEGACY_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  };

  // Validate existing token and load user profile on mount
  const refreshUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    try {
      const res = await authGetMe();
      if (res.ok && res.user) {
        setUser(res.user);
      } else {
        // Token invalid or expired
        persistToken(null);
        setUser(null);
        setToken(null);
      }
    } catch {
      // In case of network glitch, retain local token
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Sync across browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        refreshUser();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authLogin(email, password);
      if (res.ok && res.data) {
        persistToken(res.data.access_token);
        setToken(res.data.access_token);
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: res.error || 'Invalid credentials' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authRegister(fullName, email, password);
      if (res.ok && res.data) {
        persistToken(res.data.access_token);
        setToken(res.data.access_token);
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } finally {
      persistToken(null);
      setToken(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await authForgotPassword(email);
    return { success: res.ok, message: res.message, error: res.error };
  };

  const verifyOtp = async (email: string, otpCode: string) => {
    const res = await authVerifyOtp(email, otpCode);
    return { success: res.ok, message: res.message, error: res.error };
  };

  const resetPassword = async (email: string, otpCode: string, newPassword: string) => {
    const res = await authResetPassword(email, otpCode, newPassword);
    return { success: res.ok, message: res.message, error: res.error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        forgotPassword,
        verifyOtp,
        resetPassword,
        refreshUser,
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
