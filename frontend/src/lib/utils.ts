import axios from 'axios';

/**
 * Safely extracts a human-readable error message from an API response or generic error.
 */
export const parseApiError = (error: unknown, fallbackMessage = 'An unexpected error occurred'): string => {
    if (axios.isAxiosError(error)) {
        // If the backend sends a standard Spring Boot error JSON
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        // If the backend is unreachable or connection refused
        if (error.code === 'ERR_NETWORK') {
            return 'Cannot connect to the server. Please check your internet connection.';
        }
        // Fallback for standard HTTP errors (e.g., 500, 404)
        if (error.response?.status) {
            return `Server error (${error.response.status}). Please try again later.`;
        }
    }
    
    // If it's a standard JS error
    if (error instanceof Error) {
        return error.message;
    }

    return fallbackMessage;
};
