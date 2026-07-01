import axios from 'axios';
import { env } from '../config/env';
import { storage } from './storage';

export const api = axios.create({
    baseURL: env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

api.interceptors.request.use(
    (config) => {
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            setAuthToken(null);
            storage.clearAuth();
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);
