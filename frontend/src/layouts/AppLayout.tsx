import type React from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { useWorkspaces } from '../hooks/useWorkspaces';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { workspaces } = useWorkspaces();

  return (
    <div className="min-h-screen flex flex-col bg-cf-bgLight font-sans text-cf-textDark">
      <Header onMenuToggle={() => setMobileMenuOpen(true)} />
      <div className="flex-grow flex overflow-hidden">
        <Sidebar workspaces={workspaces} mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="flex-grow p-4 md:p-8 overflow-y-auto max-w-full animate-fadeUp">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
