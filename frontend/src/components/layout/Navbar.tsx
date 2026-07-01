import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Button } from '../ui/Button';
import { useWorkspaceContext } from '../../context/WorkspaceContext';
import logoAsset from '../../assets/logo.png';
import { Menu } from 'lucide-react';

export const Navbar = ({ onToggleSidebar, isSidebarCollapsed }: { onToggleSidebar?: () => void, isSidebarCollapsed?: boolean }) => {
    const { user, logout } = useAuth();
    const { workspace, activeProject } = useWorkspaceContext();

    return (
        <header className="flex justify-between items-center px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                {onToggleSidebar && (
                    <button 
                        onClick={onToggleSidebar}
                        className="p-2 -ml-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg transition-colors hidden md:block"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                <Link to="/" className="flex items-center gap-3 group">
                    <img src={logoAsset} alt="AgileTrack Logo" className="h-8 w-8 rounded-md object-cover" />
                    <span className="font-bold text-zinc-50 hidden sm:block tracking-tight text-lg">AgileTrack</span>
                </Link>
                
                {(workspace || activeProject) && (
                    <div className="hidden md:flex items-center text-sm font-medium text-zinc-500 gap-2 ml-4 border-l pl-4 border-zinc-800">
                        {workspace && (
                            <Link to={`/workspaces/${workspace.id}`} className="hover:text-zinc-300 transition-colors">
                                {workspace.name}
                            </Link>
                        )}
                        {activeProject && (
                            <>
                                <span className="text-zinc-700">/</span>
                                <Link to={`/workspaces/${workspace!.id}/projects/${activeProject.id}/board`} className="text-zinc-300 hover:text-orange-500 transition-colors">
                                    {activeProject.name}
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex-1 max-w-md mx-8 hidden lg:block">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-50 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors placeholder:text-zinc-500"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-zinc-300 hidden md:inline-block bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                    {user?.email}
                </span>
                <Button variant="ghost" onClick={() => logout()} className="text-sm px-3 py-1.5">Sign Out</Button>
            </div>
        </header>
    );
};
