import { apiClient } from '../api/axios';
import type { TaskActivityResponse } from '../types';

export const activityService = {
  listForTask: async (workspaceId: string, projectId: string, taskId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<TaskActivityResponse[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/activities`, { signal });
    return response.data;
  }
};
