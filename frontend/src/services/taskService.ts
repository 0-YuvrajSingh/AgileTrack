import { apiClient } from '../api/axios';
import type { PageResponse, Task, TaskStatus, TaskPriority, WorkItemType } from '../types';

export const taskService = {
  list: async (workspaceId: string, projectId: string, search?: string, sort?: string, signal?: AbortSignal, type?: WorkItemType) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (sort) params.sort = sort;
    if (type) params.type = type;
    
    const response = await apiClient.get<PageResponse<Task>>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
      params,
      signal
    });
    return response.data;
  },

  get: async (workspaceId: string, projectId: string, taskId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, { signal });
    return response.data;
  },

  create: async (workspaceId: string, projectId: string, payload: { title: string; description: string; type: WorkItemType; priority: TaskPriority; deadline?: string | null; assigneeId?: string | null }) => {
    const response = await apiClient.post<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, payload);
    return response.data;
  },

  update: async (workspaceId: string, projectId: string, taskId: string, payload: { title: string; description: string; type: WorkItemType; priority: TaskPriority; deadline?: string | null; assigneeId?: string | null; version: number }) => {
    const response = await apiClient.put<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, payload);
    return response.data;
  },

  updateStatus: async (workspaceId: string, projectId: string, taskId: string, status: TaskStatus, position?: number, version?: number) => {
    const payload: { status: TaskStatus; position?: number; version?: number } = { status };
    if (position !== undefined) payload.position = position;
    if (version !== undefined) payload.version = version;
    
    const response = await apiClient.patch<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`, payload);
    return response.data;
  },

  updatePosition: async (workspaceId: string, projectId: string, taskId: string, position: number) => {
    const response = await apiClient.patch<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/position`, { position });
    return response.data;
  },

  assign: async (workspaceId: string, projectId: string, taskId: string, assigneeId: string) => {
    const response = await apiClient.put<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/assignee`, { assigneeId });
    return response.data;
  },

  remove: async (workspaceId: string, projectId: string, taskId: string) => {
    await apiClient.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
  }
};
