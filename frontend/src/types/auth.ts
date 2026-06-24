// frontend/src/types/auth.ts

export interface User {
    id: string;
    email: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: User; 
}

export interface LoginRequest {
    email: string;
    password?: string; 
}

export interface RegisterRequest {
    email: string;
    password?: string;
}