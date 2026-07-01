import { createContext, useContext } from 'react';
import type { Workspace } from '../features/workspace/types/workspace.types';
import type { Project } from '../features/project/types/project.types';

interface WorkspaceContextType {
    workspace: Workspace | null;
    projects: Project[] | null;
    activeProject: Project | null;
    isLoading: boolean;
    error: Error | null;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspaceContext = () => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
    }
    return context;
};
