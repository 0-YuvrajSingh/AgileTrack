// frontend/src/types/workspace.ts
export type WorkspaceRole = 'OWNER' | 'MEMBER' | 'VIEWER';

export interface Workspace {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    createdAt: string;
}

export interface WorkspaceMember {
    userId: string;
    email: string;
    role: WorkspaceRole;
}
