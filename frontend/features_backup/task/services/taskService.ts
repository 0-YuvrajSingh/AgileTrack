import { api } from '../../../lib/axios';
import type { Task, TaskStatus, TaskPriority, TaskUpdatePayload } from '../types/task.types';

export const taskService = {
  getByProjectId: async (workspaceId: string, projectId: string): Promise<Task[]> => {
    const { data } = await api.get<Task[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`);
    return data;
  },
  create: async (workspaceId: string, projectId: string, payload: { title: string; description?: string; priority: TaskPriority; assigneeId?: string | null }): Promise<Task> => {
    const { data } = await api.post<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, payload);
    return data;
  },
  updateStatus: async (workspaceId: string, projectId: string, taskId: string, status: TaskStatus, position?: number): Promise<Task> => {
    const { data } = await api.patch<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`, { status, position });
    return data;
  },
  update: async (workspaceId: string, projectId: string, taskId: string, payload: TaskUpdatePayload): Promise<Task> => {
    const { data } = await api.put<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, payload);
    return data;
  },
  assign: async (workspaceId: string, projectId: string, taskId: string, assigneeId: string): Promise<Task> => {
    const { data } = await api.put<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/assignee`, { assigneeId });
    return data;
  },
  delete: async (workspaceId: string, projectId: string, taskId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
  }
};

