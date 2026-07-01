import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import type { ReactNode } from 'react';

export const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
    const auth = useContext(AuthContext);

    if (!auth?.isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};
