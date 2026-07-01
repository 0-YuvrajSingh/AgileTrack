import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { setAuthToken } from '../lib/axios';
import type { User, AuthResponse } from '../features/auth/types/auth.types';
import { AuthContext } from './authContextValue';

const getStoredUser = (): User | null => {
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!storedToken || !storedUser) return null;

  try {
    const parsedUser = JSON.parse(storedUser) as User;
    setAuthToken(storedToken);
    return parsedUser;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const login = (data: AuthResponse) => {
    setUser(data.user);
    setAuthToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
