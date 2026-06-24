import { createContext, useContext, useMemo, useState } from 'react';
import { setAuthToken } from '../api/axios';

type AuthValue = {
    token: string | null;
    userId: string | null;
    role: string | null;
    email: string | null;
    login: (data: any) => void;
    logout: () => void;
};

export const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth, setAuth] = useState({
        token: null as string | null,
        userId: null as string | null,
        role: null as string | null,
        email: null as string | null,
    });

    const login = (data: any) => {
        const nextAuth = {
            token: data.token,
            userId: data.user?.id || null,
            role: data.user?.role || null,
            email: data.user?.email || null,
        };

        setAuthToken(data.token);
        setAuth(nextAuth);
    };

    const logout = () => {
        setAuthToken(null);
        setAuth({
            token: null,
            userId: null,
            role: null,
            email: null,
        });
    };

    const value = useMemo(() => ({
        token: auth.token,
        userId: auth.userId,
        role: auth.role,
        email: auth.email,
        login,
        logout,
    }), [auth]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
};
