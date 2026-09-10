import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approvalService } from '../../src/services/approvalService';
import { apiClient } from '../../src/api/axios';

vi.mock('../../src/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('approvalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workspaceId = 'ws-1';
  const projectId = 'proj-1';
  const taskId = 'task-1';
  const base = `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/approval`;

  it('reads current approval status for a task', async () => {
    const mockApproval = {
      id: 'appr-1',
      workItemId: taskId,
      riskLevel: 'HIGH',
      approvalRequired: true,
      decision: 'APPROVED',
      approverId: 'user-1',
      approverEmail: 'alice@example.com',
      createdAt: '2026-09-10T12:00:00Z',
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockApproval });

    const result = await approvalService.get(workspaceId, projectId, taskId);

    expect(apiClient.get).toHaveBeenCalledWith(base, { signal: undefined });
    expect(result).toEqual(mockApproval);
  });

  it('returns null when task has no approval recorded (204 or null data)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: null });

    const result = await approvalService.get(workspaceId, projectId, taskId);

    expect(apiClient.get).toHaveBeenCalledWith(base, { signal: undefined });
    expect(result).toBeNull();
  });

  it('submits an approval decision', async () => {
    const mockCreated = {
      id: 'appr-2',
      workItemId: taskId,
      riskLevel: 'CRITICAL',
      approvalRequired: true,
      decision: 'REJECTED',
      approverId: 'user-2',
      approverEmail: 'bob@example.com',
      createdAt: '2026-09-10T12:05:00Z',
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockCreated });

    const result = await approvalService.submitDecision(
      workspaceId,
      projectId,
      taskId,
      'REJECTED'
    );

    expect(apiClient.post).toHaveBeenCalledWith(base, {
      decision: 'REJECTED',
    });
    expect(result).toEqual(mockCreated);
  });
});
