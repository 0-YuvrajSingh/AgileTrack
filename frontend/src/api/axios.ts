import axios from 'axios';
import { clearStoredAuth, readStoredAuth } from '../utils/authStorage';

const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject token automatically
apiClient.interceptors.request.use((config) => {
  const token = readStoredAuth().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Without refresh-token rotation, an expired access token cannot be renewed
// silently: clear local auth and send the user back to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

function redirectToLogin() {
  if (
    window.location.pathname !== '/login' &&
    window.location.pathname !== '/register' &&
    window.location.pathname !== '/'
  ) {
    window.location.href = '/login';
  }
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    return fallback;
  }

  return fallback;
}
