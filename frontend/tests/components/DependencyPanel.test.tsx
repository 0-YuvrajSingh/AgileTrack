import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DependencyPanel from '../../src/components/dependencies/DependencyPanel';
import { useDependencies } from '../../src/hooks/useDependencies';
import { dependencyService } from '../../src/services/dependencyService';
import * as axiosUtils from '../../src/api/axios';
import { toast } from 'react-hot-toast';

vi.mock('../../src/hooks/useDependencies', () => ({ useDependencies: vi.fn() }));
vi.mock('../../src/services/dependencyService', () => ({
  dependencyService: { add: vi.fn(), remove: vi.fn() }
}));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../src/api/axios', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  getApiErrorMessage: vi.fn((_e: unknown, fallback: string) => fallback),
}));

describe('DependencyPanel', () => {
  const workspaceId = 'ws-1';
  const projectId = 'proj-1';

  const task = { id: 't1', title: 'Ship checkout', status: 'IN_REVIEW', type: 'FEATURE' } as any;
  const candidates = [
    task,
    { id: 't2', title: 'Payment gateway', status: 'TODO', type: 'FEATURE' },
    { id: 't3', title: 'Rounding fix', status: 'TODO', type: 'BUG' },
  ] as any[];

  let refetchMock: ReturnType<typeof vi.fn>;
  let onChangedMock: () => void;

  const setDependencies = (overrides: Record<string, unknown> = {}) => {
    vi.mocked(useDependencies).mockReturnValue({
      dependencies: {
        blockedBy: [{
          id: 'dep-1',
          type: 'BLOCKS',
          blockerWorkItemId: 't2',
          blockerTitle: 'Payment gateway',
          blockerStatus: 'TODO',
          blockedWorkItemId: 't1',
          blockedTitle: 'Ship checkout',
          blockedStatus: 'IN_REVIEW',
          resolved: false,
        }],
        blocking: [],
        blocked: true,
        ...overrides,
      },
      loading: false,
      error: null,
      refetch: refetchMock,
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock = vi.fn();
    onChangedMock = vi.fn();
    setDependencies();
  });

  const renderPanel = (canMutate = true) =>
    render(
      <DependencyPanel
        workspaceId={workspaceId}
        projectId={projectId}
        task={task}
        candidates={candidates}
        canMutate={canMutate}
        onClose={vi.fn()}
        onChanged={onChangedMock}
      />
    );

  it('shows blockers and warns that the item cannot be completed', () => {
    renderPanel();

    expect(screen.getByText('Payment gateway')).toBeInTheDocument();
    expect(screen.getByText('unresolved')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('cannot be completed');
  });

  it('shows a resolved blocker as resolved and drops the blocked warning', () => {
    setDependencies({
      blocked: false,
      blockedBy: [{
        id: 'dep-1', type: 'BLOCKS',
        blockerWorkItemId: 't2', blockerTitle: 'Payment gateway', blockerStatus: 'DONE',
        blockedWorkItemId: 't1', blockedTitle: 'Ship checkout', blockedStatus: 'IN_REVIEW',
        resolved: true,
      }],
    });
    renderPanel();

    expect(screen.getByText('resolved')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not offer the item itself or anything already linked as a blocker', () => {
    renderPanel();

    const select = screen.getByLabelText('Add a blocker') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value).filter(Boolean);

    expect(values).toEqual(['t3']);
  });

  it('adds a blocker and reports the change upward', async () => {
    vi.mocked(dependencyService.add).mockResolvedValueOnce({} as any);
    renderPanel();

    fireEvent.change(screen.getByLabelText('Add a blocker'), { target: { value: 't3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(dependencyService.add).toHaveBeenCalledWith(workspaceId, projectId, 't1', 't3');
      expect(onChangedMock).toHaveBeenCalled();
    });
  });

  it('surfaces the server explanation when an edge is rejected as a cycle', async () => {
    vi.mocked(axiosUtils.getApiErrorMessage).mockReturnValueOnce(
      'This dependency would create a cycle: A blocks B blocks A'
    );
    vi.mocked(dependencyService.add).mockRejectedValueOnce({ response: { status: 400 } });
    renderPanel();

    fireEvent.change(screen.getByLabelText('Add a blocker'), { target: { value: 't3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('cycle'));
    });
  });

  it('removes a blocker', async () => {
    vi.mocked(dependencyService.remove).mockResolvedValueOnce(undefined as any);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Remove dependency on Payment gateway/i }));

    await waitFor(() => {
      expect(dependencyService.remove).toHaveBeenCalledWith(workspaceId, projectId, 't1', 'dep-1');
    });
  });

  it('a read-only viewer gets no add or remove controls', () => {
    renderPanel(false);

    expect(screen.queryByLabelText('Add a blocker')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remove dependency on Payment gateway/i })
    ).not.toBeInTheDocument();
    // Still able to see why the item is blocked.
    expect(screen.getByText('Payment gateway')).toBeInTheDocument();
  });
});
