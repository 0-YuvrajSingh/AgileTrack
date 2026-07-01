import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Navbar = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        auth?.logout();
        navigate('/login');
    };

    return (
        <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-zinc-50 tracking-tight">AgileTrack</span>
                </div>
                
                {auth?.isAuthenticated && (
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                )}
            </div>
        </nav>
    );
};
