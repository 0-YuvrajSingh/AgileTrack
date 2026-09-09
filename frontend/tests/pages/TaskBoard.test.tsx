import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TaskBoard from '../../src/pages/TaskBoard';
import { taskService } from '../../src/services/taskService';
import { useWorkspace } from '../../src/hooks/useWorkspaces';
import { useProject } from '../../src/hooks/useProjects';
import { useWorkspaceMembers } from '../../src/hooks/useWorkspaceMembers';
import { useTasks } from '../../src/hooks/useTasks';
import { useAuth } from '../../src/context/AuthContext';
import { toast } from 'react-hot-toast';

// Mock all hooks and services
vi.mock('../../src/services/taskService', () => ({
  taskService: {
    updateStatus: vi.fn(),
  }
}));

vi.mock('../../src/hooks/useWorkspaces', () => ({ useWorkspace: vi.fn() }));
vi.mock('../../src/hooks/useProjects', () => ({ useProject: vi.fn() }));
vi.mock('../../src/hooks/useWorkspaceMembers', () => ({ useWorkspaceMembers: vi.fn() }));
vi.mock('../../src/hooks/useTasks', () => ({ useTasks: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('TaskBoard', () => {
  const mockUser = { id: 'u1', email: 'test@example.com', name: 'Test User' };
  const workspaceId = 'ws-1';
  const projectId = 'proj-1';
  
  const defaultTasks = [
    { id: 't1', title: 'Task 1', status: 'TODO', priority: 'MEDIUM', position: 100 },
    { id: 't2', title: 'Task 2', status: 'IN_PROGRESS', priority: 'HIGH', position: 200 }
  ];

  let setTasksMock: any;
  let refetchTasksMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    setTasksMock = vi.fn();
    refetchTasksMock = vi.fn();

    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);

    vi.mocked(useWorkspace).mockReturnValue({ 
      workspace: { id: workspaceId, name: 'Test WS', myRole: 'ADMIN' },
      loading: false, error: null 
    } as any);

    vi.mocked(useProject).mockReturnValue({
      project: { id: projectId, name: 'Test Project', status: 'ACTIVE' },
      loading: false, error: null
    } as any);

    vi.mocked(useWorkspaceMembers).mockReturnValue({
      members: [], loading: false, error: null
    } as any);

    // useTasks mock that actually uses state so we can test optimistic updates!
    vi.mocked(useTasks).mockImplementation((_wsId, _pId) => {
      const [tasks, setTasks] = React.useState(defaultTasks);
      
      // Keep reference to trigger updates from tests if needed, or we can just mock setTasks to intercept it
      setTasksMock.mockImplementation(setTasks);
      
      return {
        tasks,
        setTasks,
        loading: false,
        error: null,
        refetch: refetchTasksMock
      } as any;
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={[`/workspaces/${workspaceId}/projects/${projectId}`]}>
        <Routes>
          <Route path="/workspaces/:workspaceId/projects/:projectId" element={<TaskBoard />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the four columns and tasks', async () => {
    renderComponent();
    
    // Check columns
    expect(screen.getByRole('heading', { name: 'TODO' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'IN PROGRESS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'IN REVIEW' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DONE' })).toBeInTheDocument();

    // Check tasks
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('handles optimistic update and 409 concurrency rollback on drop', async () => {
    // 1. Make the API call fail with a 409
    vi.mocked(taskService.updateStatus).mockRejectedValueOnce({ response: { status: 409 } });

    renderComponent();

    const taskElement = screen.getByText('Task 1').closest('div[draggable="true"]');
    expect(taskElement).not.toBeNull();

    // Find the dropzone for "IN REVIEW" (The column container)
    const inReviewHeader = screen.getByRole('heading', { name: 'IN REVIEW' });
    const inReviewColumn = inReviewHeader.parentElement?.parentElement;
    expect(inReviewColumn).toBeDefined();

    // Simulate drag start
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(format: string, data: string) { this.data[format] = data; },
      getData(format: string) { return this.data[format]; }
    };

    fireEvent.dragStart(taskElement!, { dataTransfer });

    // Simulate drop on IN REVIEW column
    fireEvent.drop(inReviewColumn!, { dataTransfer });

    // Wait for the optimistic update to happen and then revert
    await waitFor(() => {
      // toast error should have been called due to 409
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('modified by another user'), expect.anything());
    });

    // Check that refetch was called to restore state
    expect(refetchTasksMock).toHaveBeenCalled();
  });
  
  it('prevents VIEWER from dragging tasks', () => {
    vi.mocked(useWorkspace).mockReturnValue({ 
      workspace: { id: workspaceId, name: 'Test WS', myRole: 'VIEWER' },
      loading: false, error: null 
    } as any);

    renderComponent();

    // Task should NOT be draggable
    // Find the first div that wraps Task 1 title. Actually it has draggable attribute.
    // In our component: draggable={workspace?.myRole !== 'VIEWER' && ...} -> false
    const taskCard = screen.getByText('Task 1').closest('.bg-white.border');
    expect(taskCard?.getAttribute('draggable')).toBe('false');
  });
});
