import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReleaseDetail from '../../src/pages/ReleaseDetail';
import { releaseService } from '../../src/services/releaseService';
import { useWorkspace } from '../../src/hooks/useWorkspaces';
import { useProject } from '../../src/hooks/useProjects';
import { useRelease } from '../../src/hooks/useReleases';
import { useTasks } from '../../src/hooks/useTasks';
import { toast } from 'react-hot-toast';

vi.mock('../../src/services/releaseService', () => ({
  releaseService: {
    updateLifecycle: vi.fn(),
    addWorkItem: vi.fn(),
    removeWorkItem: vi.fn(),
  }
}));

vi.mock('../../src/hooks/useWorkspaces', () => ({ useWorkspace: vi.fn() }));
vi.mock('../../src/hooks/useProjects', () => ({ useProject: vi.fn() }));
vi.mock('../../src/hooks/useReleases', () => ({ useRelease: vi.fn() }));
vi.mock('../../src/hooks/useTasks', () => ({ useTasks: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('ReleaseDetail', () => {
  const workspaceId = 'ws-1';
  const projectId = 'proj-1';
  const releaseId = 'rel-1';

  let refetchMock: ReturnType<typeof vi.fn>;

  const plannedRelease = {
    id: releaseId,
    name: 'v2.4.0',
    releaseVersion: '2.4.0',
    projectId,
    lifecycleState: 'PLANNED' as const,
    targetDate: '2099-01-31',
    scopeLocked: false,
    editable: true,
    createdAt: '',
    updatedAt: '',
    version: 3,
  };

  const scopeItems = [
    { id: 't1', title: 'Ship checkout', status: 'DONE', type: 'FEATURE', releaseId, version: 0 },
    { id: 't2', title: 'Fix rounding', status: 'TODO', type: 'BUG', releaseId, version: 0 },
  ];

  const setRelease = (overrides: Record<string, unknown> = {}, items = scopeItems) => {
    vi.mocked(useRelease).mockReturnValue({
      release: { ...plannedRelease, ...overrides },
      workItems: items,
      readiness: {
        releaseId,
        releaseName: 'v2.4.0',
        lifecycleState: 'PLANNED',
        status: 'NOT_READY',
        reasons: [{
          code: 'INCOMPLETE_WORK',
          workItemId: 't2',
          workItemTitle: 'Fix rounding',
          detail: '"Fix rounding" is TODO, not DONE',
        }],
        totalWorkItems: 2,
        completedWorkItems: 1,
      },
      loading: false,
      error: null,
      refetch: refetchMock,
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock = vi.fn();

    vi.mocked(useWorkspace).mockReturnValue({
      workspace: { id: workspaceId, name: 'WS', myRole: 'ADMIN' }, loading: false, error: null
    } as any);
    vi.mocked(useProject).mockReturnValue({
      project: { id: projectId, name: 'Payments', status: 'ACTIVE' }, loading: false, error: null
    } as any);
    vi.mocked(useTasks).mockReturnValue({
      tasks: [{ id: 't9', title: 'Unassigned item', status: 'TODO', type: 'FEATURE', releaseId: null }],
      setTasks: vi.fn(), loading: false, error: null, refetch: vi.fn(),
    } as any);

    setRelease();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={[`/workspaces/${workspaceId}/projects/${projectId}/releases/${releaseId}`]}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/projects/:projectId/releases/:releaseId"
            element={<ReleaseDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

  it('shows the release, its state and its completion progress', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /v2\.4\.0/ })).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows the server readiness verdict and its reasons', () => {
    renderComponent();

    expect(screen.getByTestId('readiness-status')).toHaveTextContent('NOT READY');
    expect(screen.getByText('"Fix rounding" is TODO, not DONE')).toBeInTheDocument();
  });

  it('offers only the transitions the server would accept', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /Move to In Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel release/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move to Released/i })).not.toBeInTheDocument();
  });

  it('sends the version it read when changing lifecycle state', async () => {
    vi.mocked(releaseService.updateLifecycle).mockResolvedValueOnce({} as any);

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Move to In Progress/i }));

    await waitFor(() => {
      expect(releaseService.updateLifecycle).toHaveBeenCalledWith(
        workspaceId, projectId, releaseId, 'IN_PROGRESS', 3
      );
    });
  });

  it('hides scope controls and shows a lock once the scope is locked', () => {
    setRelease({ lifecycleState: 'IN_PROGRESS', scopeLocked: true });
    renderComponent();

    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add work item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove Ship checkout/i })).not.toBeInTheDocument();
  });

  it('a VIEWER gets no mutating controls', () => {
    vi.mocked(useWorkspace).mockReturnValue({
      workspace: { id: workspaceId, name: 'WS', myRole: 'VIEWER' }, loading: false, error: null
    } as any);

    renderComponent();

    expect(screen.queryByRole('button', { name: /Add work item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move to In Progress/i })).not.toBeInTheDocument();
  });

  it('removes a work item from scope', async () => {
    vi.mocked(releaseService.removeWorkItem).mockResolvedValueOnce({} as any);

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Remove Ship checkout from release/i }));

    await waitFor(() => {
      expect(releaseService.removeWorkItem).toHaveBeenCalledWith(workspaceId, projectId, releaseId, 't1');
    });
  });

  it('only offers work items that are not already in a release', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Add work item/i }));

    expect(await screen.findByText('Unassigned item')).toBeInTheDocument();
    expect(screen.queryByText('Fix rounding')).toBeInTheDocument(); // still listed in scope, not in the picker
  });

  it('refreshes and warns when the server reports a conflict', async () => {
    vi.mocked(releaseService.updateLifecycle).mockRejectedValueOnce({ response: { status: 409 } });

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Move to In Progress/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('modified by another user'));
      expect(refetchMock).toHaveBeenCalled();
    });
  });
});
