import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/authContextValue';

export const ProtectedRoute = () => {
    const auth = useContext(AuthContext);

    if (!auth?.user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
