import { apiClient } from '../api/axios';
import type { PageResponse, Release, ReleaseLifecycleState, ReleaseReadiness, Task } from '../types';

const baseUrl = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/releases`;

export const releaseService = {
  list: async (workspaceId: string, projectId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<PageResponse<Release>>(
      baseUrl(workspaceId, projectId), { signal }
    );
    return response.data;
  },

  get: async (workspaceId: string, projectId: string, releaseId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Release>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}`, { signal }
    );
    return response.data;
  },

  create: async (
    workspaceId: string,
    projectId: string,
    payload: { name: string; releaseVersion?: string | null; targetDate?: string | null }
  ) => {
    const response = await apiClient.post<Release>(baseUrl(workspaceId, projectId), payload);
    return response.data;
  },

  update: async (
    workspaceId: string,
    projectId: string,
    releaseId: string,
    payload: { name: string; releaseVersion?: string | null; targetDate?: string | null; version: number }
  ) => {
    const response = await apiClient.put<Release>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}`, payload
    );
    return response.data;
  },

  updateLifecycle: async (
    workspaceId: string,
    projectId: string,
    releaseId: string,
    lifecycleState: ReleaseLifecycleState,
    version?: number
  ) => {
    const payload: { lifecycleState: ReleaseLifecycleState; version?: number } = { lifecycleState };
    if (version !== undefined) payload.version = version;

    const response = await apiClient.patch<Release>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}/lifecycle`, payload
    );
    return response.data;
  },

  remove: async (workspaceId: string, projectId: string, releaseId: string) => {
    await apiClient.delete(`${baseUrl(workspaceId, projectId)}/${releaseId}`);
  },

  /** Derived server-side on every call; there is no corresponding write. */
  readiness: async (workspaceId: string, projectId: string, releaseId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<ReleaseReadiness>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}/readiness`, { signal }
    );
    return response.data;
  },

  workItems: async (workspaceId: string, projectId: string, releaseId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Task[]>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}/work-items`, { signal }
    );
    return response.data;
  },

  addWorkItem: async (workspaceId: string, projectId: string, releaseId: string, taskId: string) => {
    const response = await apiClient.put<Task>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}/work-items/${taskId}`
    );
    return response.data;
  },

  removeWorkItem: async (workspaceId: string, projectId: string, releaseId: string, taskId: string) => {
    const response = await apiClient.delete<Task>(
      `${baseUrl(workspaceId, projectId)}/${releaseId}/work-items/${taskId}`
    );
    return response.data;
  }
};
