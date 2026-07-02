import type { User } from '../types';

const TOKEN_KEY = 'agiletrack_token';
const USER_KEY = 'agiletrack_user';

export interface StoredAuthState {
  token: string | null;
  user: User | null;
}

export const readStoredAuth = (): StoredAuthState => {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  if (!token || !storedUser) {
    return { token: null, user: null };
  }

  try {
    return {
      token,
      user: JSON.parse(storedUser) as User,
    };
  } catch {
    clearStoredAuth();
    return { token: null, user: null };
  }
};

export const saveStoredAuth = (token: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};