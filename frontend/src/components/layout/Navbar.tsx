import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Button } from '../ui/Button';
import { useWorkspaceContext } from '../../context/WorkspaceContext';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const { workspace, activeProject } = useWorkspaceContext();

    return (
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-stripe-border shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-stripe-primary text-white rounded flex items-center justify-center font-bold">
                    AT
                </div>
                <Link to="/" className="font-bold text-stripe-textDark hidden sm:block">AgileTrack</Link>
                
                {(workspace || activeProject) && (
                    <div className="hidden md:flex items-center text-sm text-gray-500 gap-2 ml-4 border-l pl-4 border-gray-200">
                        {workspace && (
                            <Link to={`/workspaces/${workspace.id}`} className="hover:text-stripe-primary transition-colors">
                                {workspace.name}
                            </Link>
                        )}
                        {activeProject && (
                            <>
                                <span>/</span>
                                <Link to={`/workspaces/${workspace!.id}/projects/${activeProject.id}/board`} className="hover:text-stripe-primary transition-colors">
                                    {activeProject.name}
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <span className="text-sm text-stripe-textLight hidden md:inline-block">
                    {user?.email}
                </span>
                <Button variant="ghost" onClick={() => logout()}>Sign Out</Button>
            </div>
        </header>
    );
};
