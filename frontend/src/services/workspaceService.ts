import { apiClient } from '../api/axios';
import type { Workspace } from '../types';

export const workspaceService = {
  list: async () => {
    const response = await apiClient.get<Workspace[]>('/workspaces');
    return response.data;
  },

  create: async (payload: { name: string; description: string }) => {
    const response = await apiClient.post<Workspace>('/workspaces', payload);
    return response.data;
  },

  remove: async (workspaceId: string) => {
    await apiClient.delete(`/workspaces/${workspaceId}`);
  },
};
