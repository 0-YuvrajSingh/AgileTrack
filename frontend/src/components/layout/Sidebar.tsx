import { NavLink } from 'react-router-dom';
import { useWorkspaceContext } from '../../context/WorkspaceContext';

export const Sidebar = () => {
    const { workspace, projects, isLoading } = useWorkspaceContext();

    return (
        <aside className="w-64 bg-white border-r border-stripe-border hidden md:flex flex-col shrink-0">
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => 
                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive 
                                ? 'bg-indigo-50 text-stripe-primary' 
                                : 'text-stripe-textLight hover:bg-gray-50 hover:text-stripe-textDark'
                        }`
                    }
                >
                    All Workspaces
                </NavLink>

                {workspace && (
                    <div className="pt-6">
                        <div className="px-3 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                            {workspace.name}
                        </div>
                        {isLoading ? (
                            <div className="px-3 text-sm text-gray-400">Loading projects...</div>
                        ) : projects && projects.length > 0 ? (
                            projects.map(project => (
                                <NavLink
                                    key={project.id}
                                    to={`/workspaces/${workspace.id}/projects/${project.id}/board`}
                                    className={({ isActive }) => 
                                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            isActive 
                                                ? 'bg-indigo-50 text-stripe-primary' 
                                                : 'text-stripe-textLight hover:bg-gray-50 hover:text-stripe-textDark'
                                        }`
                                    }
                                >
                                    {project.name}
                                </NavLink>
                            ))
                        ) : (
                            <div className="px-3 text-sm text-gray-400">No projects</div>
                        )}
                    </div>
                )}
            </nav>
            {workspace && (
                <div className="p-4 border-t border-stripe-border">
                    <div className="text-xs text-stripe-textLight mb-2">Workspace Actions</div>
                    <NavLink 
                        to={`/workspaces/${workspace.id}`}
                        className="block w-full text-left px-3 py-2 text-sm font-medium text-stripe-textLight hover:bg-gray-50 hover:text-stripe-textDark rounded-md transition-colors"
                    >
                        Workspace Overview
                    </NavLink>
                </div>
            )}
        </aside>
    );
};
