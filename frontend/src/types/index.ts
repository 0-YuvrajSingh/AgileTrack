export interface User {
    id: string;
    email: string;
    name: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (data: AuthResponse) => void;
    logout: () => void;
}
