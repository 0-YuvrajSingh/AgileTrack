import type { User } from '../types';

const TOKEN_KEY = 'agiletrack_token';
const REFRESH_TOKEN_KEY = 'agiletrack_refresh_token';
const USER_KEY = 'agiletrack_user';

export interface StoredAuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
}

export const readStoredAuth = (): StoredAuthState => {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, user: null };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  if (!token || !storedUser) {
    return { token: null, refreshToken: null, user: null };
  }

  try {
    return {
      token,
      refreshToken,
      user: JSON.parse(storedUser) as User,
    };
  } catch {
    clearStoredAuth();
    return { token: null, refreshToken: null, user: null };
  }
};

export const saveStoredAuth = (token: string, refreshToken: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateStoredToken = (token: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};