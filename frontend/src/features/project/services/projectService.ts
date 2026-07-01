import { api } from '../../../lib/axios';
import type { Project, ProjectStatus } from '../types/project.types';

export const projectService = {
  getByWorkspaceId: async (workspaceId: string): Promise<Project[]> => {
    const { data } = await api.get<Project[]>(`/workspaces/${workspaceId}/projects`);
    return data;
  },
  getById: async (workspaceId: string, id: string): Promise<Project> => {
    const { data } = await api.get<Project>(`/workspaces/${workspaceId}/projects/${id}`);
    return data;
  },
  create: async (workspaceId: string, payload: { name: string; description: string }): Promise<Project> => {
    const { data } = await api.post<Project>(`/workspaces/${workspaceId}/projects`, payload);
    return data;
  },
  update: async (workspaceId: string, projectId: string, payload: { name: string; description?: string; status?: ProjectStatus }): Promise<Project> => {
    const { data } = await api.put<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, payload);
    return data;
  },
  delete: async (workspaceId: string, projectId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
  }
};
