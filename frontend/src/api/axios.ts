import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
});

// Automatically attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
