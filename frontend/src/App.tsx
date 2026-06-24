import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { WorkspacePage } from './pages/WorkspacePage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { InviteMemberPage } from './pages/InviteMemberPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspaces/:id" element={<WorkspacePage />} />
          <Route path="/workspaces/:id/invite" element={<InviteMemberPage />} />
          <Route path="/workspaces/:workspaceId/projects/:projectId" element={<TaskBoardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
