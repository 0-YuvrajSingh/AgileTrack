import { useAuth } from '../../features/auth/hooks/useAuth';
import { Button } from '../ui/Button';

export const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-stripe-border shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-stripe-primary text-white rounded flex items-center justify-center font-bold">
                    AT
                </div>
                <h1 className="font-bold text-stripe-textDark hidden sm:block">AgileTrack</h1>
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
