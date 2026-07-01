import { createContext } from 'react';
import type { AuthResponse, User } from '../features/auth/types/auth.types';

export interface AuthContextType {
  user: User | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
