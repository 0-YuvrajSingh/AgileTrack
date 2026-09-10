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

export type ReadinessStatus = 'READY' | 'NOT_READY';

export type ReadinessReasonCode =
  | 'RELEASE_CANCELLED'
  | 'EMPTY_RELEASE'
  | 'INCOMPLETE_WORK'
  | 'BLOCKED_WORK'
  | 'APPROVAL_REQUIRED';

export interface ReadinessReason {
  code: ReadinessReasonCode;
  workItemId: string | null;
  workItemTitle: string | null;
  detail: string;
}

export interface ReleaseReadiness {
  releaseId: string;
  releaseName: string;
  lifecycleState: ReleaseLifecycleState;
  status: ReadinessStatus;
  /** Always non-empty when status is NOT_READY. */
  reasons: ReadinessReason[];
  totalWorkItems: number;
  completedWorkItems: number;
}

export type DependencyType = 'BLOCKS';

export interface Dependency {
  id: string;
  type: DependencyType;
  blockerWorkItemId: string;
  blockerTitle: string;
  blockerStatus: TaskStatus;
  blockedWorkItemId: string;
  blockedTitle: string;
  blockedStatus: TaskStatus;
  /** Derived server-side: a blocker stops mattering once it is DONE. */
  resolved: boolean;
}

export interface WorkItemDependencies {
  blockedBy: Dependency[];
  blocking: Dependency[];
  /** Derived from blockedBy; never stored, so resolving a blocker clears it with no extra write. */
  blocked: boolean;
}

export interface BlockedWorkItem {
  workItemId: string;
  title: string;
  blockers: Dependency[];
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
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export interface ApprovalResponse {
  id: string | null;
  workItemId: string;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  decision: ApprovalDecision | null;
  approverId: string | null;
  approverEmail: string | null;
  createdAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: WorkItemType;
  riskLevel?: RiskLevel | null;
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
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED'
  | 'COMPLETED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'RISK_CHANGED';

export interface TaskActivityResponse {
  id: string;
  userId: string;
  userEmail: string;
  type: ActivityType;
  details: string | null;
  createdAt: string;
}
