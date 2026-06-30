import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const LandingPage = () => {
    return (
        <div className="min-h-screen bg-stripe-bg flex flex-col font-sans selection:bg-stripe-primary selection:text-white">
            <header className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-stripe-primary text-white rounded flex items-center justify-center font-bold">
                        AT
                    </div>
                    <span className="font-bold text-xl tracking-tight text-stripe-textDark">AgileTrack</span>
                </div>
                <nav className="flex items-center gap-4">
                    <Link to="/login" className="text-sm font-medium text-stripe-textLight hover:text-stripe-textDark transition-colors">
                        Sign in
                    </Link>
                    <Link to="/register">
                        <Button>Get started</Button>
                    </Link>
                </nav>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
                <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-stripe-primary text-sm font-medium animate-[fadeIn_0.5s_ease-out]">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stripe-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-stripe-primary"></span>
                    </span>
                    Now in open beta
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-stripe-textDark mb-6 leading-tight animate-[slideUp_0.5s_ease-out_0.1s_both]">
                    Project management for <br className="hidden md:block"/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-stripe-primary to-[#8A81FF]">fast-moving</span> teams.
                </h1>
                <p className="text-lg md:text-xl text-stripe-textLight max-w-2xl mb-10 leading-relaxed animate-[slideUp_0.5s_ease-out_0.2s_both]">
                    AgileTrack brings your workspaces, projects, and tasks into one unified, lightning-fast Kanban experience. Designed with modern aesthetics and built for speed.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 animate-[slideUp_0.5s_ease-out_0.3s_both]">
                    <Link to="/register">
                        <Button className="px-8 py-3 text-base h-auto">Start building for free</Button>
                    </Link>
                    <Link to="/login">
                        <Button variant="secondary" className="px-8 py-3 text-base h-auto">Sign in to workspace</Button>
                    </Link>
                </div>

                <div className="mt-20 w-full animate-[slideUp_0.5s_ease-out_0.4s_both]">
                    <div className="bg-white rounded-xl shadow-2xl shadow-indigo-500/10 border border-stripe-border overflow-hidden h-[400px] w-full flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-stripe-textDark mb-2">Interactive Kanban Board</h3>
                            <p className="text-stripe-textLight">Drag and drop functionality integrated directly into your workflow.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
