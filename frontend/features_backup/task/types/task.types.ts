export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string | null;
  projectId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  position: number;
}

export interface TaskUpdatePayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  deadline?: string | null;
  assigneeId: string | null;
}
