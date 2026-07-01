import React, { useState, createContext } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthResponse, AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType | null>(null);

const getStoredUser = (): User | null => {
  const token = localStorage.getItem('jwt_token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    return null;
  }
  
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const login = (data: AuthResponse) => {
    setUser(data.user);
    localStorage.setItem('jwt_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
