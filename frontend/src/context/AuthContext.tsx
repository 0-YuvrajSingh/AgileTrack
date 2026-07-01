import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { setAuthToken } from '../lib/axios';
import type { User, AuthResponse } from '../features/auth/types/auth.types';
import { AuthContext } from './authContextValue';
import { storage } from '../lib/storage';

const getStoredUser = (): User | null => {
  const token = storage.getToken();
  const user = storage.getUser();

  if (!token || !user) {
    storage.clearAuth();
    return null;
  }

  setAuthToken(token);
  return user;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const login = (data: AuthResponse) => {
    setUser(data.user);
    setAuthToken(data.token);
    storage.setToken(data.token);
    storage.setUser(data.user);
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    storage.clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
