import { Outlet } from 'react-router-dom';

export const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="px-8 py-6 flex items-center justify-between absolute w-full top-0 left-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#635BFF] flex items-center justify-center shadow-md">
                        <span className="font-bold text-white tracking-tight text-lg">A</span>
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">AgileTrack</span>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center pt-20">
                <Outlet />
            </main>

            <footer className="py-6 text-center text-sm text-slate-500 font-medium">
                &copy; {new Date().getFullYear()} AgileTrack. All rights reserved.
            </footer>
        </div>
    );
};
