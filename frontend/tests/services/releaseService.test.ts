import { describe, it, expect, vi, beforeEach } from 'vitest';
import { releaseService } from '../../src/services/releaseService';
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

describe('releaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workspaceId = 'ws-1';
  const projectId = 'proj-1';
  const releaseId = 'rel-1';
  const taskId = 'task-1';
  const base = `/workspaces/${workspaceId}/projects/${projectId}/releases`;

  it('list targets the project-scoped releases endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await releaseService.list(workspaceId, projectId);

    expect(apiClient.get).toHaveBeenCalledWith(base, { signal: undefined });
  });

  it('create sends the release fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: releaseId } });

    const payload = { name: 'v2.4.0', releaseVersion: '2.4.0', targetDate: '2099-01-31' };
    await releaseService.create(workspaceId, projectId, payload);

    expect(apiClient.post).toHaveBeenCalledWith(base, payload);
  });

  it('update sends the version the client read', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: releaseId } });

    const payload = { name: 'v2.4.1', releaseVersion: '2.4.1', targetDate: null, version: 2 };
    await releaseService.update(workspaceId, projectId, releaseId, payload);

    expect(apiClient.put).toHaveBeenCalledWith(`${base}/${releaseId}`, payload);
  });

  it('updateLifecycle forwards the version when supplied', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });

    await releaseService.updateLifecycle(workspaceId, projectId, releaseId, 'IN_PROGRESS', 5);

    expect(apiClient.patch).toHaveBeenCalledWith(
      `${base}/${releaseId}/lifecycle`,
      { lifecycleState: 'IN_PROGRESS', version: 5 }
    );
  });

  it('updateLifecycle omits the version when none was read', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });

    await releaseService.updateLifecycle(workspaceId, projectId, releaseId, 'RELEASED');

    expect(apiClient.patch).toHaveBeenCalledWith(
      `${base}/${releaseId}/lifecycle`,
      { lifecycleState: 'RELEASED' }
    );
  });

  it('scope changes address the work item under the release', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

    await releaseService.addWorkItem(workspaceId, projectId, releaseId, taskId);
    await releaseService.removeWorkItem(workspaceId, projectId, releaseId, taskId);

    expect(apiClient.put).toHaveBeenCalledWith(`${base}/${releaseId}/work-items/${taskId}`);
    expect(apiClient.delete).toHaveBeenCalledWith(`${base}/${releaseId}/work-items/${taskId}`);
  });

  it('workItems reads the release scope', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await releaseService.workItems(workspaceId, projectId, releaseId);

    expect(apiClient.get).toHaveBeenCalledWith(
      `${base}/${releaseId}/work-items`, { signal: undefined }
    );
  });
});
