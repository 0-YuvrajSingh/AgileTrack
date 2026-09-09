export interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  myRole: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface WorkspaceMember {
  userId: string;
  email: string;
  role: WorkspaceRole;
  memberId?: string;
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  /** Sent back on mutations so the server can reject a write based on stale data. */
  version: number;
}

export type ReleaseLifecycleState = 'PLANNED' | 'IN_PROGRESS' | 'RELEASED' | 'CANCELLED';

export interface Release {
  id: string;
  name: string;
  releaseVersion: string | null;
  projectId: string;
  lifecycleState: ReleaseLifecycleState;
  targetDate: string | null;
  /** Derived server-side: scope changes are only allowed while PLANNED. */
  scopeLocked: boolean;
  /** Derived server-side: terminal releases are read-only. */
  editable: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type WorkItemType = 'FEATURE' | 'BUG' | 'CHANGE' | 'TECH_DEBT';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: WorkItemType;
  priority: TaskPriority;
  deadline: string | null;
  projectId: string;
  releaseId: string | null;
  assigneeId: string | null;
  assigneeEmail: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  /** Sent back on mutations so the server can reject a write based on stale data. */
  version: number;
}

export type ActivityType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'TYPE_CHANGED'
  | 'RELEASE_ASSIGNED'
  | 'RELEASE_UNASSIGNED'
  | 'COMPLETED';

export interface TaskActivityResponse {
  id: string;
  userId: string;
  userEmail: string;
  type: ActivityType;
  details: string | null;
  createdAt: string;
}
