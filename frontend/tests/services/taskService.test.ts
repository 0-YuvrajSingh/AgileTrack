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

  it('list forwards the work item type filter', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await taskService.list(workspaceId, projectId, undefined, 'position,asc', undefined, 'CHANGE');

    expect(apiClient.get).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { params: { sort: 'position,asc', type: 'CHANGE' }, signal: undefined }
    );
  });

  it('list omits the type param when no filter is active', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await taskService.list(workspaceId, projectId, undefined, 'position,asc');

    expect(apiClient.get).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { params: { sort: 'position,asc' }, signal: undefined }
    );
  });

  it('update sends the work item type', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: taskId } });

    const payload = {
      title: 'Renamed',
      description: 'Desc',
      type: 'TECH_DEBT' as const,
      priority: 'LOW' as const,
      deadline: null,
      assigneeId: null,
      version: 3,
    };
    await taskService.update(workspaceId, projectId, taskId, payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      payload
    );
  });

  it('create sends correct payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 'new-task' } });
    
    const payload = { title: 'New Task', description: 'Desc', type: 'FEATURE' as const, priority: 'HIGH' as const, deadline: null, assigneeId: null };
    await taskService.create(workspaceId, projectId, payload);
    
    expect(apiClient.post).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      payload
    );
  });

  it('updateStatus forwards the version when supplied', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });

    await taskService.updateStatus(workspaceId, projectId, taskId, 'IN_PROGRESS', 500, 7);

    expect(apiClient.patch).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
      { status: 'IN_PROGRESS', position: 500, version: 7 }
    );
  });

  it('updateStatus omits the version when none was read', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });

    await taskService.updateStatus(workspaceId, projectId, taskId, 'IN_PROGRESS');

    expect(apiClient.patch).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
      { status: 'IN_PROGRESS' }
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
