import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agiletrack_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Global 401 Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('agiletrack_token');
      localStorage.removeItem('agiletrack_user');
      // Hard redirect to clear React state tree
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);
