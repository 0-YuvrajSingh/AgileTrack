import { apiClient } from '../api/axios';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '../types';

export const workspaceService = {
  list: async (search?: string, signal?: AbortSignal) => {
    const params = search ? { search } : {};
    const response = await apiClient.get<Workspace[]>('/workspaces', { params, signal });
    return response.data;
  },

  get: async (workspaceId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Workspace>(`/workspaces/${workspaceId}`, { signal });
    return response.data;
  },

  create: async (payload: { name: string; description: string }) => {
    const response = await apiClient.post<Workspace>('/workspaces', payload);
    return response.data;
  },

  update: async (workspaceId: string, payload: { name: string; description: string }) => {
    const response = await apiClient.put<Workspace>(`/workspaces/${workspaceId}`, payload);
    return response.data;
  },

  remove: async (workspaceId: string) => {
    await apiClient.delete(`/workspaces/${workspaceId}`);
  },

  getMembers: async (workspaceId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, { signal });
    return response.data;
  },

  inviteMember: async (workspaceId: string, email: string, role: WorkspaceRole) => {
    const response = await apiClient.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, { email, role });
    return response.data;
  },

  removeMember: async (workspaceId: string, memberId: string) => {
    await apiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  }
};
