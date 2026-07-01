import { NavLink } from 'react-router-dom';
import { useWorkspaceContext } from '../../context/WorkspaceContext';

export const Sidebar = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const { workspace, projects, isLoading } = useWorkspaceContext();

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-zinc-950 border-r border-zinc-800 hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 overflow-x-hidden">
                <NavLink
                    to="/workspaces"
                    title={isCollapsed ? "All Workspaces" : undefined}
                    className={({ isActive }) => 
                        `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            isActive 
                                ? 'bg-zinc-900 text-orange-500' 
                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50'
                        } ${isCollapsed ? 'justify-center' : ''}`
                    }
                >
                    <svg className={`w-5 h-5 shrink-0 ${isCollapsed ? '' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {!isCollapsed && <span className="truncate">All Workspaces</span>}
                </NavLink>

                {workspace && (
                    <div className="pt-8">
                        {!isCollapsed ? (
                            <div className="px-3 mb-3 text-xs font-bold tracking-wider text-zinc-500 uppercase flex items-center truncate">
                                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-orange-500 mr-2"></span>
                                {workspace.name}
                            </div>
                        ) : (
                            <div className="flex justify-center mb-3">
                                <span className="w-2 h-2 shrink-0 rounded-full bg-orange-500"></span>
                            </div>
                        )}

                        {isLoading ? (
                            <div className={`px-3 py-2 text-sm text-zinc-500 animate-pulse ${isCollapsed ? 'hidden' : ''}`}>Loading...</div>
                        ) : projects && projects.length > 0 ? (
                            <div className="space-y-1">
                                {projects.map(project => (
                                    <NavLink
                                        key={project.id}
                                        to={`/workspaces/${workspace.id}/projects/${project.id}/board`}
                                        title={isCollapsed ? project.name : undefined}
                                        className={({ isActive }) => 
                                            `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                                isActive 
                                                    ? 'bg-zinc-900 text-orange-500' 
                                                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50'
                                            } ${isCollapsed ? 'justify-center' : ''}`
                                        }
                                    >
                                        <svg className={`w-5 h-5 shrink-0 opacity-80 ${isCollapsed ? '' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                        </svg>
                                        {!isCollapsed && <span className="truncate">{project.name}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        ) : (
                            <div className={`px-3 py-2 text-sm text-zinc-500 italic ${isCollapsed ? 'hidden' : ''}`}>No projects</div>
                        )}
                    </div>
                )}
            </nav>
            {workspace && (
                <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                    {!isCollapsed && <div className="text-xs font-semibold text-zinc-500 mb-2 px-3 uppercase tracking-wider truncate">Workspace Actions</div>}
                    <NavLink 
                        to={`/workspaces/${workspace.id}`}
                        title={isCollapsed ? "Workspace Overview" : undefined}
                        className={`flex items-center w-full text-left px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <svg className={`w-5 h-5 shrink-0 opacity-80 ${isCollapsed ? '' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {!isCollapsed && <span className="truncate">Workspace Overview</span>}
                    </NavLink>
                </div>
            )}
        </aside>
    );
};
