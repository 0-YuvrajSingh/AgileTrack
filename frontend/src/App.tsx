import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { WorkspaceHub } from './pages/WorkspaceHub';
import { TaskBoard } from './pages/TaskBoard';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PublicLayout } from './components/layout/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route element={<PublicLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Route>
                    
                    {/* Protected Routes inside AppLayout */}
                    <Route element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/workspaces" element={<WorkspaceHub />} />
                        <Route path="/workspaces/:id/board" element={<TaskBoard />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
            <Toaster 
                position="bottom-right" 
                toastOptions={{ 
                    style: {
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(50, 50, 93, 0.11), 0 1px 3px -1px rgba(0, 0, 0, 0.08)',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        padding: '1rem',
                        fontFamily: 'Inter, sans-serif'
                    } 
                }} 
            />
        </ErrorBoundary>
    );
}

export default App;
