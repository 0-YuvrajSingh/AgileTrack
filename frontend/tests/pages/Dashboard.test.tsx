import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Dashboard from '../../src/pages/Dashboard';
import { useWorkspaces } from '../../src/hooks/useWorkspaces';
import { apiClient } from '../../src/api/axios';
import { releaseService } from '../../src/services/releaseService';
import type { Release, ReleaseReadiness, Task, Workspace } from '../../src/types';

vi.mock('../../src/hooks/useWorkspaces', () => ({
  useWorkspaces: vi.fn(),
}));

vi.mock('../../src/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('../../src/services/releaseService', () => ({
  releaseService: {
    list: vi.fn(),
    readiness: vi.fn(),
    workItems: vi.fn(),
  },
}));

describe('Dashboard (Engineering Release Dashboard)', () => {
  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws-1',
      name: 'Acme Corp',
      description: 'Main workspace',
      ownerId: 'u-1',
      myRole: 'ADMIN',
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
  ];

  const mockProject = {
    id: 'proj-1',
    name: 'Frontend Redesign',
    description: 'React migration',
    status: 'ACTIVE',
    workspaceId: 'ws-1',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    version: 1,
  };

  const mockRelease1: Release = {
    id: 'rel-1',
    name: 'Q3 UI Refresh',
    releaseVersion: 'v2.1.0',
    projectId: 'proj-1',
    lifecycleState: 'IN_PROGRESS',
    targetDate: '2026-10-01',
    scopeLocked: true,
    editable: true,
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    version: 1,
  };

  const mockRelease2: Release = {
    id: 'rel-2',
    name: 'Design System Baseline',
    releaseVersion: 'v2.0.0',
    projectId: 'proj-1',
    lifecycleState: 'RELEASED',
    targetDate: '2026-09-01',
    scopeLocked: true,
    editable: false,
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    version: 2,
  };

  const mockReadinessNotReady: ReleaseReadiness = {
    releaseId: 'rel-1',
    releaseName: 'Q3 UI Refresh',
    lifecycleState: 'IN_PROGRESS',
    status: 'NOT_READY',
    totalWorkItems: 4,
    completedWorkItems: 1,
    reasons: [
      {
        code: 'INCOMPLETE_WORK',
        workItemId: 't-1',
        workItemTitle: 'Build reusable component library',
        detail: '"Build reusable component library" is IN_PROGRESS, not DONE',
      },
      {
        code: 'BLOCKED_WORK',
        workItemId: 't-2',
        workItemTitle: 'Drag-and-drop task board',
        detail: '"Drag-and-drop task board" is blocked by "Build reusable component library"',
      },
      {
        code: 'APPROVAL_REQUIRED',
        workItemId: 't-3',
        workItemTitle: 'Database Schema Migration',
        detail: '"Database Schema Migration" is HIGH risk and requires approval before release',
      },
    ],
  };

  const mockReadinessReady: ReleaseReadiness = {
    releaseId: 'rel-2',
    releaseName: 'Design System Baseline',
    lifecycleState: 'RELEASED',
    status: 'READY',
    totalWorkItems: 2,
    completedWorkItems: 2,
    reasons: [],
  };

  const mockWorkItems: Task[] = [
    {
      id: 't-1',
      title: 'Build reusable component library',
      description: 'Components',
      status: 'IN_PROGRESS',
      type: 'FEATURE',
      priority: 'HIGH',
      riskLevel: null,
      deadline: null,
      projectId: 'proj-1',
      releaseId: 'rel-1',
      assigneeId: null,
      assigneeEmail: null,
      position: 10,
      version: 1,
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 't-2',
      title: 'Drag-and-drop task board',
      description: 'Kanban view',
      status: 'IN_REVIEW',
      type: 'FEATURE',
      priority: 'HIGH',
      riskLevel: null,
      deadline: null,
      projectId: 'proj-1',
      releaseId: 'rel-1',
      assigneeId: null,
      assigneeEmail: null,
      position: 20,
      version: 1,
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 't-3',
      title: 'Database Schema Migration',
      description: 'Schema change',
      status: 'DONE',
      type: 'CHANGE',
      priority: 'HIGH',
      riskLevel: 'HIGH',
      deadline: null,
      projectId: 'proj-1',
      releaseId: 'rel-1',
      assigneeId: null,
      assigneeEmail: null,
      position: 30,
      version: 1,
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 't-4',
      title: 'Memory leak fix in table',
      description: 'Bug fix',
      status: 'DONE',
      type: 'BUG',
      priority: 'MEDIUM',
      riskLevel: null,
      deadline: null,
      projectId: 'proj-1',
      releaseId: 'rel-1',
      assigneeId: null,
      assigneeEmail: null,
      position: 40,
      version: 1,
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWorkspaces).mockReturnValue({
      workspaces: mockWorkspaces,
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        content: [mockProject],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
      },
    });

    vi.mocked(releaseService.list).mockResolvedValue({
      content: [mockRelease1, mockRelease2],
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
    });

    vi.mocked(releaseService.readiness).mockImplementation(async (_wsId, _pId, relId) => {
      if (relId === 'rel-2') return mockReadinessReady;
      return mockReadinessNotReady;
    });

    vi.mocked(releaseService.workItems).mockImplementation(async (_wsId, _pId, relId) => {
      if (relId === 'rel-2') {
        return mockWorkItems.slice(2);
      }
      return mockWorkItems;
    });
  });

  it('renders loading state while workspaces or releases are loading', () => {
    vi.mocked(useWorkspaces).mockReturnValueOnce({
      workspaces: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading Engineering Release Dashboard.../i)).toBeInTheDocument();
  });

  it('renders empty state when no releases exist', async () => {
    vi.mocked(releaseService.list).mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Releases Found')).toBeInTheDocument();
      expect(screen.getByText(/Get started by creating a project and scoping work items/i)).toBeInTheDocument();
    });
  });

  it('renders active release cockpit with NOT READY verdict and delivery metrics', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Q3 UI Refresh/i })).toBeInTheDocument();
      expect(screen.getByTestId('readiness-verdict')).toHaveTextContent('NOT READY');
      expect(screen.getByTestId('metric-work-items')).toHaveTextContent('/ 4 complete');
    });

    // Verify metrics: 2 of 4 items are DONE (t-3, t-4)
    const workItemsMetric = screen.getByTestId('metric-work-items');
    expect(workItemsMetric).toHaveTextContent('2');
    expect(workItemsMetric).toHaveTextContent('50%');

    // Verify Blockers and Approvals count
    const blockersMetric = screen.getByTestId('metric-blockers');
    expect(blockersMetric).toHaveTextContent('1');
    expect(blockersMetric).toHaveTextContent('Unresolved dependency edges');

    const approvalsMetric = screen.getByTestId('metric-approvals');
    expect(approvalsMetric).toHaveTextContent('1');
    expect(approvalsMetric).toHaveTextContent('Pending HIGH/CRITICAL sign-offs');

    // Verify scope breakdown
    const breakdownMetric = screen.getByTestId('metric-breakdown');
    expect(breakdownMetric).toHaveTextContent('2 Features');
    expect(breakdownMetric).toHaveTextContent('1 Bug');
    expect(breakdownMetric).toHaveTextContent('1 Change');

    // Verify readiness reasons
    expect(screen.getByText('INCOMPLETE_WORK')).toBeInTheDocument();
    expect(screen.getByText('BLOCKED_WORK')).toBeInTheDocument();
    expect(screen.getByText('APPROVAL_REQUIRED')).toBeInTheDocument();
    expect(screen.getByText(/3 Readiness Blockers Preventing Release/i)).toBeInTheDocument();
  });

  it('switches the active release when dropdown selection changes', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('readiness-verdict')).toHaveTextContent('NOT READY');
    });

    const select = screen.getByLabelText('Active Release');
    fireEvent.change(select, { target: { value: 'ws-1:proj-1:rel-2' } });

    await waitFor(() => {
      expect(screen.getByTestId('readiness-verdict')).toHaveTextContent('READY TO SHIP');
      expect(screen.getByText('All Delivery Gates Passed')).toBeInTheDocument();
    });
  });

  it('renders portfolio summary table with all discovered releases', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('All Engineering Releases (2)')).toBeInTheDocument();
    });

    // Check table rows
    const rows = screen.getAllByRole('row');
    // 1 header + 2 data rows
    expect(rows.length).toBe(3);
    expect(screen.getAllByText('Q3 UI Refresh').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Design System Baseline')).toBeInTheDocument();
  });
});
