import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentialResponse: any) => Promise<void>;
  logout: () => void;
  getValidAccessToken: () => Promise<string | null>;
  setClearChatCallback: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [clearChatCallback, setClearChatCallback] = useState<(() => void) | null>(null);

  // Helper to update tokens in state and localStorage
  const setTokens = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem('token', access);
    localStorage.setItem('refresh_token', refresh);
  };

  // Helper to clear tokens
  const clearTokens = () => {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  };

  // Validate access token with backend
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Try to refresh the access token using the refresh token
  const refreshTokenFunc = useCallback(async () => {
    const storedRefresh = refreshToken || localStorage.getItem('refresh_token');
    if (!storedRefresh) return null;
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefresh })
      });
      if (!response.ok) throw new Error('Failed to refresh token');
      const data = await response.json();
      setTokens(data.access_token, data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearTokens();
      setUser(null);
      return null;
    }
  }, [refreshToken]);

  // Get a valid access token, refreshing if needed
  const getValidAccessToken = useCallback(async () => {
    let token = accessToken || localStorage.getItem('token');
    if (!token) return null;
    const isValid = await validateToken(token);
    if (isValid) return token;
    // Try to refresh
    return await refreshTokenFunc();
  }, [accessToken, refreshTokenFunc]);

  useEffect(() => {
    // On mount, load tokens and user from localStorage
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    const savedRefresh = localStorage.getItem('refresh_token');
    if (savedUser && savedToken && savedRefresh) {
      setUser(JSON.parse(savedUser));
      setAccessToken(savedToken);
      setRefreshToken(savedRefresh);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      // Clear any existing chat messages before login
      if (clearChatCallback) {
        clearChatCallback();
      }
      // Send Google token to backend
      const response = await fetch(`${API_BASE_URL}/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential
        }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = await response.json();
      setTokens(data.access_token, data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    clearTokens();
    localStorage.removeItem('user');
    // Clear chat messages when user logs out
    if (clearChatCallback) {
      clearChatCallback();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, getValidAccessToken, setClearChatCallback }}>
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