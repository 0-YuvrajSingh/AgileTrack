import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskService } from '../../src/services/taskService';
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

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workspaceId = 'ws-123';
  const projectId = 'proj-456';
  const taskId = 'task-789';

  it('list constructs correct endpoint and parameters', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    
    await taskService.list(workspaceId, projectId, 'search term', 'position,asc');
    
    expect(apiClient.get).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { params: { search: 'search term', sort: 'position,asc' }, signal: undefined }
    );
  });

  it('create sends correct payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 'new-task' } });
    
    const payload = { title: 'New Task', description: 'Desc', priority: 'HIGH' as const, deadline: null, assigneeId: null };
    await taskService.create(workspaceId, projectId, payload);
    
    expect(apiClient.post).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      payload
    );
  });

  it('updateStatus sends correct payload for status and position', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });
    
    await taskService.updateStatus(workspaceId, projectId, taskId, 'IN_PROGRESS', 500);
    
    expect(apiClient.patch).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
      { status: 'IN_PROGRESS', position: 500 }
    );
  });

  it('propagates 409 Conflict error', async () => {
    const error409 = { response: { status: 409 } };
    vi.mocked(apiClient.patch).mockRejectedValueOnce(error409);
    
    await expect(taskService.updateStatus(workspaceId, projectId, taskId, 'DONE')).rejects.toEqual(error409);
  });
});
