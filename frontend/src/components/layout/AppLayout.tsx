import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const AppLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Simple breadcrumb logic based on path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = pathSegments.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' / ');

    const handleLogout = () => {
        setIsMobileMenuOpen(false);
        logout();
    };

    const renderSidebarContent = () => (
        <>
            <div className="px-6 py-5 flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#635BFF] flex items-center justify-center shadow-sm">
                    <span className="font-bold text-white tracking-tight">A</span>
                </div>
                <span className="text-lg font-semibold text-white tracking-tight">AgileTrack</span>
            </div>
            
            <div className="px-4 py-2">
                <button className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-800 border border-slate-700 bg-slate-800/50 flex justify-between items-center text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#635BFF]/50">
                    <span className="font-medium">Personal Workspace</span>
                    <span className="text-slate-400 text-xs">▼</span>
                </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'bg-[#635BFF] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                    Dashboard
                </Link>
                <Link to="/workspaces" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${location.pathname.startsWith('/workspaces') ? 'bg-[#635BFF] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                    Workspaces
                </Link>
                <Link to="/tasks" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${location.pathname === '/tasks' ? 'bg-[#635BFF] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                    My Tasks
                </Link>
                <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${location.pathname === '/settings' ? 'bg-[#635BFF] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                    Settings
                </Link>
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate tracking-tight">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
                    </div>
                </div>
                <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 focus:ring-[#635BFF]/50" onClick={handleLogout}>
                    Logout
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex text-slate-900">
            {/* Desktop Sidebar (Fixed, 250px, hidden on mobile) */}
            <aside className="hidden md:flex md:flex-col md:w-[250px] md:fixed md:inset-y-0 md:left-0 bg-slate-900 border-r border-slate-800 text-slate-300 z-20">
                {renderSidebarContent()}
            </aside>

            {/* Mobile Off-canvas Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out" onClick={() => setIsMobileMenuOpen(false)} />
                    
                    {/* Sidebar Panel */}
                    <aside className="relative flex flex-col w-[250px] max-w-xs bg-slate-900 text-slate-300 h-full shadow-2xl z-10 transition-transform duration-300 ease-out transform translate-x-0">
                        {/* Close button inside drawer */}
                        <div className="absolute top-4 right-4">
                            <button className="text-slate-400 hover:text-white p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#635BFF]/50" onClick={() => setIsMobileMenuOpen(false)}>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        {renderSidebarContent()}
                    </aside>
                </div>
            )}

            {/* Main Content Area (With margin left only on desktop) */}
            <div className="flex-1 md:ml-[250px] flex flex-col min-h-screen">
                {/* Top Header (Sticky) */}
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 md:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Hamburger menu button */}
                        <button className="md:hidden text-slate-500 hover:text-slate-700 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-[#635BFF]/50" onClick={() => setIsMobileMenuOpen(true)}>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <div className="flex items-center text-sm font-medium text-slate-500 tracking-tight">
                            {breadcrumbs || 'Dashboard'}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className="relative hidden sm:block">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </span>
                            <input type="text" placeholder="Search..." className="w-48 sm:w-64 pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all outline-none text-slate-900 placeholder-slate-400" />
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 relative transition-colors focus:outline-none focus:ring-2 focus:ring-[#635BFF]/50 rounded-full p-1">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            <span className="absolute top-0.5 right-0.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
