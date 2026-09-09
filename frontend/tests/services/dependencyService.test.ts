import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dependencyService } from '../../src/services/dependencyService';
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

describe('dependencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workspaceId = 'ws-1';
  const projectId = 'proj-1';
  const taskId = 'task-1';
  const blockerId = 'task-2';
  const base = `/workspaces/${workspaceId}/projects/${projectId}`;

  it('reads a work item\'s dependencies', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { blockedBy: [], blocking: [], blocked: false } });

    await dependencyService.get(workspaceId, projectId, taskId);

    expect(apiClient.get).toHaveBeenCalledWith(
      `${base}/tasks/${taskId}/dependencies`, { signal: undefined }
    );
  });

  it('adds a blocker from the blocked item\'s point of view', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 'dep-1' } });

    await dependencyService.add(workspaceId, projectId, taskId, blockerId);

    expect(apiClient.post).toHaveBeenCalledWith(
      `${base}/tasks/${taskId}/dependencies`,
      { blockedByWorkItemId: blockerId }
    );
  });

  it('removes an edge scoped to the work item it belongs to', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: null });

    await dependencyService.remove(workspaceId, projectId, taskId, 'dep-1');

    expect(apiClient.delete).toHaveBeenCalledWith(`${base}/tasks/${taskId}/dependencies/dep-1`);
  });

  it('reads project-wide blocked work in a single call', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await dependencyService.blockedWorkItems(workspaceId, projectId);

    expect(apiClient.get).toHaveBeenCalledWith(`${base}/blocked-work-items`, { signal: undefined });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
