import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/hooks/useAuth';
import logoAsset from '../../../assets/logo.png';

export const LandingHeader = () => {
    const { user } = useAuth();

    return (
        <header className="fixed inset-x-0 top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8">
                <Link to="/" className="flex items-center gap-3">
                    <img src={logoAsset} alt="AgileTrack Logo" className="h-8 w-8 rounded-md object-cover" />
                    <span className="text-base font-bold tracking-tight text-zinc-50">AgileTrack</span>
                </Link>
                <nav className="flex items-center gap-2">
                    {user ? (
                        <Link to="/workspaces">
                            <Button className="gap-2">
                                Go to Workspaces
                                <LayoutDashboard className="h-4 w-4" />
                            </Button>
                        </Link>
                    ) : (
                        <>
                            <Link to="/login">
                                <Button variant="ghost" className="px-3 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900">Sign in</Button>
                            </Link>
                            <Link to="/register">
                                <Button className="gap-2">
                                    Get started
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};
