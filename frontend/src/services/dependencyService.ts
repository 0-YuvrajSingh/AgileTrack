import { apiClient } from '../api/axios';
import type { BlockedWorkItem, Dependency, WorkItemDependencies } from '../types';

const projectUrl = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}`;

export const dependencyService = {
  /** What blocks this work item, what it blocks, and whether it is currently blocked. */
  get: async (workspaceId: string, projectId: string, taskId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<WorkItemDependencies>(
      `${projectUrl(workspaceId, projectId)}/tasks/${taskId}/dependencies`, { signal }
    );
    return response.data;
  },

  /** Declares that `taskId` is blocked by `blockedByWorkItemId`. */
  add: async (workspaceId: string, projectId: string, taskId: string, blockedByWorkItemId: string) => {
    const response = await apiClient.post<Dependency>(
      `${projectUrl(workspaceId, projectId)}/tasks/${taskId}/dependencies`,
      { blockedByWorkItemId }
    );
    return response.data;
  },

  remove: async (workspaceId: string, projectId: string, taskId: string, dependencyId: string) => {
    await apiClient.delete(
      `${projectUrl(workspaceId, projectId)}/tasks/${taskId}/dependencies/${dependencyId}`
    );
  },

  /** Every blocked work item in the project, in one call, so the board avoids a lookup per card. */
  blockedWorkItems: async (workspaceId: string, projectId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<BlockedWorkItem[]>(
      `${projectUrl(workspaceId, projectId)}/blocked-work-items`, { signal }
    );
    return response.data;
  }
};
