import type { User } from '../features/auth/types/auth.types';

export const storage = {
    getToken: (): string | null => localStorage.getItem('token'),
    setToken: (token: string) => localStorage.setItem('token', token),
    clearToken: () => localStorage.removeItem('token'),

    getUser: (): User | null => {
        const user = localStorage.getItem('user');
        if (!user) return null;
        try {
            return JSON.parse(user) as User;
        } catch {
            return null;
        }
    },
    setUser: (user: User) => localStorage.setItem('user', JSON.stringify(user)),
    clearUser: () => localStorage.removeItem('user'),

    clearAuth: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};
