import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

// Placeholders until you move your real UI files here
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const auth = useContext(AuthContext);
    if (!auth?.isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
