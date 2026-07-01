import { api } from '../../../lib/axios';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '../types/workspace.types';

export const workspaceService = {
  getAll: async (): Promise<Workspace[]> => {
    const { data } = await api.get<Workspace[]>('/workspaces');
    return data;
  },
  getById: async (id: string): Promise<Workspace> => {
    const { data } = await api.get<Workspace>(`/workspaces/${id}`);
    return data;
  },
  create: async (payload: { name: string; description: string }): Promise<Workspace> => {
    const { data } = await api.post<Workspace>('/workspaces', payload);
    return data;
  },
  update: async (id: string, payload: { name: string; description?: string }): Promise<Workspace> => {
    const { data } = await api.put<Workspace>(`/workspaces/${id}`, payload);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${id}`);
  },
  getMembers: async (id: string): Promise<WorkspaceMember[]> => {
    const { data } = await api.get<WorkspaceMember[]>(`/workspaces/${id}/members`);
    return data;
  },
  inviteMember: async (id: string, payload: { email: string; role: WorkspaceRole }): Promise<void> => {
    await api.post(`/workspaces/${id}/members`, payload);
  }
};
