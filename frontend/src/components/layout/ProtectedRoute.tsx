import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export const ProtectedRoute = () => {
    const auth = useContext(AuthContext);

    // If context is still hydrating, you could add a loading spinner here.
    // Assuming fast synchronous rehydration from localStorage.
    if (!auth?.user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
