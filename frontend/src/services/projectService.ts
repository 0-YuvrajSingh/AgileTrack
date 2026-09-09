import { apiClient } from '../api/axios';
import type { PageResponse, Project, ProjectStatus } from '../types';

export const projectService = {
  list: async (workspaceId: string, search?: string, page: number = 0, size: number = 10, signal?: AbortSignal) => {
    const params: any = { page, size };
    if (search) params.search = search;
    const response = await apiClient.get<PageResponse<Project>>(`/workspaces/${workspaceId}/projects`, { params, signal });
    return response.data;
  },

  get: async (workspaceId: string, projectId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, { signal });
    return response.data;
  },

  create: async (workspaceId: string, payload: { name: string; description: string }) => {
    const response = await apiClient.post<Project>(`/workspaces/${workspaceId}/projects`, payload);
    return response.data;
  },

  update: async (workspaceId: string, projectId: string, payload: { name: string; description: string }) => {
    const response = await apiClient.put<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, payload);
    return response.data;
  },

  updateStatus: async (workspaceId: string, projectId: string, status: ProjectStatus) => {
    const response = await apiClient.patch<Project>(`/workspaces/${workspaceId}/projects/${projectId}/status`, { status });
    return response.data;
  },

  remove: async (workspaceId: string, projectId: string) => {
    await apiClient.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
  }
};
