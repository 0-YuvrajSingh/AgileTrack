import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../../context/authContextValue';
import { storage } from '../../lib/storage';

export const ProtectedRoute = () => {
    const auth = useContext(AuthContext);
    const token = storage.getToken();

    if (!auth?.user || !token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode<{ exp: number }>(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
            storage.clearAuth();
            return <Navigate to="/login" replace />;
        }
    } catch {
        storage.clearAuth();
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
