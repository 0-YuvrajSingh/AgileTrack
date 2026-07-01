import { api } from '../../../lib/axios';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth.types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  },
  register: async (credentials: RegisterRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', credentials);
    return data;
  }
};
