import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export const ProtectedRoute = () => {
    const auth = useContext(AuthContext);

    if (!auth?.isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
