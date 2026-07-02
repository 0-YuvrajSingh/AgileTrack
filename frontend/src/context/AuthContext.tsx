import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { clearStoredAuth, readStoredAuth, saveStoredAuth } from '../utils/authStorage';
import { apiClient } from '../api/axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = readStoredAuth();
    setToken(storedAuth.token);
    setUser(storedAuth.user);
    setLoading(false);
  }, []);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    saveStoredAuth(newToken, newRefreshToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    const { refreshToken } = readStoredAuth();
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Failed to invalidate refresh token', error);
      }
    }
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
