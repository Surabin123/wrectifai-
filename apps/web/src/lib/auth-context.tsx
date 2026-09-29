'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
  url = url.replace(/\/+$/, ''); // Remove trailing slashes
  if (url.endsWith('/api/v1')) return url;
  if (url.endsWith('/api')) return `${url}/v1`;
  return `${url}/api/v1`;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  garageId?: string;
  garageName?: string;
  roles: string[];
  mobileNumber?: string;
  status?: string;
  country?: string;
  image?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string, user?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authOperationRef = useRef(0);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    const operation = authOperationRef.current;

    async function initAuth() {
      try {
        const { apiClient } = await import('./api-client');
        const data = await apiClient<{ user: User }>('/auth/me');
        
        if (data && data.user && mounted && authOperationRef.current === operation) {
          setUser(data.user);
          setIsAuthenticated(true);
        }
      } catch (err: any) {
        console.warn('[AuthContext] Auth initialization failed:', err);
        if (mounted && authOperationRef.current === operation) {
          // Distinguish between genuine auth failure (401/403) and temporary network/server failure
          const isGenuineAuthFailure = err.status === 401 || err.status === 403;
          
          if (isGenuineAuthFailure) {
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);
          } else {
            // For temporary failures (network down, 5xx), we cannot authenticate them right now,
            // but we don't aggressively clear their state via a full logout.
            // They will simply be unauthenticated for this session attempt.
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);
          }
        }
      } finally {
        if (mounted && authOperationRef.current === operation) setIsLoading(false);
      }
    }

    initAuth();

    return () => { mounted = false; };
  }, []);

  // Listen to silent refresh logout events
  useEffect(() => {
    const handleLogoutEvent = () => {
      authOperationRef.current += 1;
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const login = useCallback((accessToken: string, refreshToken?: string, userData?: User) => {
    authOperationRef.current += 1;
    let resolvedUser = userData || null;
    const decoded = decodeJwt(accessToken);

    if (!resolvedUser) {
      if (decoded) {
        resolvedUser = {
          id: decoded.userId,
          email: decoded.email,
          roles: decoded.roles,
          name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
        };
      }
    } else if (Array.isArray(decoded?.roles) && decoded.roles.length > 0) {
      // Signed token claims are authoritative for role-based UI routing.
      resolvedUser = { ...resolvedUser, roles: decoded.roles };
    }

    setUser(resolvedUser);
    setToken(accessToken);
    setIsAuthenticated(true);
    setIsLoading(false);

    // Tokens are securely stored as HttpOnly cookies by the backend.
    // We intentionally avoid exposing them to localStorage or client JS.
  }, []);

  const logout = useCallback(async () => {
    authOperationRef.current += 1;
    if (typeof window !== 'undefined') {
      try {
        const baseUrl = getBaseUrl();
        const csrfResponse = await fetch(`${baseUrl}/auth/csrf-token`, {
          credentials: 'include',
        });
        const csrfPayload = csrfResponse.ok ? await csrfResponse.json() : null;
        const csrfToken = csrfPayload?.data?.csrfToken || csrfPayload?.csrfToken;
        await fetch(`${baseUrl}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
          },
        });
      } catch (err) {
        console.warn('Logout API failed', err);
      }
      
      // Clear any app-specific cached data for complete session isolation
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('wrectifai_') || key === 'garage_favorites') {
          localStorage.removeItem(key);
        }
      }
    }

    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    // Redirect to login page to prevent back navigation
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
