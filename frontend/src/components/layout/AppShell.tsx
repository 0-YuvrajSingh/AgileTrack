import { Outlet, useMatch } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { workspaceService } from '../../features/workspace/services/workspaceService';
import { projectService } from '../../features/project/services/projectService';
import { WorkspaceContext } from '../../context/WorkspaceContext';

export const AppShell = () => {
    const workspaceMatch = useMatch('/workspaces/:workspaceId/*');
    const projectMatch = useMatch('/workspaces/:workspaceId/projects/:projectId/*');
    
    const workspaceId = workspaceMatch?.params.workspaceId;
    const projectId = projectMatch?.params.projectId;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const { data: workspace, isLoading: wsLoading, error: wsError } = useQuery({
        queryKey: ['workspace', workspaceId],
        queryFn: () => workspaceService.getById(workspaceId!),
        enabled: !!workspaceId
    });

    const { data: projects, isLoading: projLoading, error: projError } = useQuery({
        queryKey: ['projects', workspaceId],
        queryFn: () => projectService.getByWorkspaceId(workspaceId!),
        enabled: !!workspaceId
    });

    const activeProject = projects?.find(p => p.id === projectId) || null;
    const isLoading = wsLoading || projLoading;
    const error = (wsError || projError) as Error | null;

    return (
        <WorkspaceContext.Provider value={{ workspace: workspace || null, projects: projects || null, activeProject, isLoading, error }}>
            <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-500 selection:text-white">
                <Navbar onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)} isSidebarCollapsed={isSidebarCollapsed} />
                <div className="flex flex-1 overflow-hidden relative">
                    <Sidebar isCollapsed={isSidebarCollapsed} />
                    <main className="flex-1 overflow-y-auto relative">
                        <Outlet />
                    </main>
                </div>
            </div>
        </WorkspaceContext.Provider>
    );
};
