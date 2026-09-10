import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApprovalModal from '../../src/components/approval/ApprovalModal';
import { useApproval } from '../../src/hooks/useApproval';
import { toast } from 'react-hot-toast';
import type { Task } from '../../src/types';

vi.mock('../../src/hooks/useApproval', () => ({
  useApproval: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ApprovalModal', () => {
  const workspaceId = 'ws-1';
  const projectId = 'proj-1';
  const mockTask: Task = {
    id: 'task-100',
    title: 'Database Schema Migration',
    description: 'Upgrade database tables',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    type: 'CHANGE',
    riskLevel: 'HIGH',
    deadline: null,
    projectId,
    releaseId: null,
    assigneeId: null,
    assigneeEmail: null,
    position: 10,
    version: 1,
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
  };

  const defaultHookReturn = {
    approval: null,
    loading: false,
    error: null,
    submitDecision: vi.fn(),
    refetch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApproval).mockReturnValue({ ...defaultHookReturn });
  });

  it('renders modal header with task title and risk level badge', () => {
    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Change Governance — Database Schema Migration/i)).toBeInTheDocument();
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('HIGH');
    expect(screen.getByText('Approval required before shipping')).toBeInTheDocument();
  });

  it('shows pending governance review for HIGH risk changes with no decision', () => {
    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Pending governance review and approval.')).toBeInTheDocument();
  });

  it('shows approval not required for LOW risk changes', () => {
    const lowRiskTask: Task = { ...mockTask, riskLevel: 'LOW' };
    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={lowRiskTask}
        canMutate={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Approval not required')).toBeInTheDocument();
    expect(screen.getByText('No approval needed for LOW risk changes.')).toBeInTheDocument();
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('LOW');
  });

  it('displays APPROVED state with approver information', () => {
    vi.mocked(useApproval).mockReturnValue({
      ...defaultHookReturn,
      approval: {
        id: 'appr-1',
        workItemId: 'task-100',
        decision: 'APPROVED',
        approverId: 'u-admin',
        approverEmail: 'lead@agiletrack.io',
        riskLevel: 'HIGH',
        approvalRequired: true,
        createdAt: '2026-09-10T11:00:00Z',
      },
    });

    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('By lead@agiletrack.io')).toBeInTheDocument();
  });

  it('displays REJECTED state with reviewer information', () => {
    vi.mocked(useApproval).mockReturnValue({
      ...defaultHookReturn,
      approval: {
        id: 'appr-2',
        workItemId: 'task-100',
        decision: 'REJECTED',
        approverId: 'u-lead',
        approverEmail: 'security@agiletrack.io',
        riskLevel: 'CRITICAL',
        approvalRequired: true,
        createdAt: '2026-09-10T11:30:00Z',
      },
    });

    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={{ ...mockTask, riskLevel: 'CRITICAL' }}
        canMutate={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('By security@agiletrack.io')).toBeInTheDocument();
  });

  it('submits APPROVED decision when Approve button clicked', async () => {
    const submitDecisionMock = vi.fn().mockResolvedValue({ id: 'appr-1', decision: 'APPROVED' });
    const refetchMock = vi.fn().mockResolvedValue(undefined);
    const onChangedMock = vi.fn();

    vi.mocked(useApproval).mockReturnValue({
      ...defaultHookReturn,
      submitDecision: submitDecisionMock,
      refetch: refetchMock,
    });

    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={true}
        onClose={vi.fn()}
        onChanged={onChangedMock}
      />
    );

    const approveButton = screen.getByRole('button', { name: /Approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(submitDecisionMock).toHaveBeenCalledWith('APPROVED');
      expect(toast.success).toHaveBeenCalledWith('Change approved');
      expect(refetchMock).toHaveBeenCalled();
      expect(onChangedMock).toHaveBeenCalled();
    });
  });

  it('submits REJECTED decision when Reject button clicked', async () => {
    const submitDecisionMock = vi.fn().mockResolvedValue({ id: 'appr-2', decision: 'REJECTED' });
    const refetchMock = vi.fn().mockResolvedValue(undefined);
    const onChangedMock = vi.fn();

    vi.mocked(useApproval).mockReturnValue({
      ...defaultHookReturn,
      submitDecision: submitDecisionMock,
      refetch: refetchMock,
    });

    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={true}
        onClose={vi.fn()}
        onChanged={onChangedMock}
      />
    );

    const rejectButton = screen.getByRole('button', { name: /Reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(submitDecisionMock).toHaveBeenCalledWith('REJECTED');
      expect(toast.success).toHaveBeenCalledWith('Change rejected');
      expect(refetchMock).toHaveBeenCalled();
      expect(onChangedMock).toHaveBeenCalled();
    });
  });

  it('hides action buttons when canMutate is false (e.g. VIEWER role)', () => {
    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /Approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reject/i })).not.toBeInTheDocument();
  });

  it('invokes onClose when clicking the close button', () => {
    const onCloseMock = vi.fn();
    render(
      <ApprovalModal
        workspaceId={workspaceId}
        projectId={projectId}
        task={mockTask}
        canMutate={true}
        onClose={onCloseMock}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
