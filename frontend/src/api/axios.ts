import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
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
        } else if (config.headers?.Authorization) {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);
