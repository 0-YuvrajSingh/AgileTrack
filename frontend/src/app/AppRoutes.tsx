import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { WorkspaceListPage } from '../features/workspace/pages/WorkspaceListPage';
import { WorkspaceDetailPage } from '../features/workspace/pages/WorkspaceDetailPage';
import { TaskBoardPage } from '../features/task/pages/TaskBoardPage';
import { NotFound } from '../components/layout/NotFound';
import { AppShell } from '../components/layout/AppShell';

import { LandingPage } from '../features/landing/pages/LandingPage';

export const AppRoutes = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleUnauthorized = () => {
            navigate('/login');
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [navigate]);

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<WorkspaceListPage />} />
                    <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
                    <Route path="/workspaces/:workspaceId/projects/:projectId/board" element={<TaskBoardPage />} />

                </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};
