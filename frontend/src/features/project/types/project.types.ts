// frontend/src/types/project.ts
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

export interface Project {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    workspaceId: string;
    createdAt: string;
}
