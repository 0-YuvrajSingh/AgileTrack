import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const LandingHeader = () => {
    return (
        <header className="fixed inset-x-0 top-0 z-30 border-b border-white/60 bg-white/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8">
                <Link to="/" className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stripe-primary text-sm font-bold text-white shadow-stripe">
                        AT
                    </div>
                    <span className="text-base font-bold tracking-tight text-stripe-textDark">AgileTrack</span>
                </Link>
                <nav className="flex items-center gap-2">
                    <Link to="/login">
                        <Button variant="ghost" className="px-3">Sign in</Button>
                    </Link>
                    <Link to="/register">
                        <Button className="gap-2">
                            Get started
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </nav>
            </div>
        </header>
    );
};
