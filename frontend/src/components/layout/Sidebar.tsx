import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { apiClient } from '../../api/axios';
import type { Workspace } from '../../types';
import { X, LayoutDashboard, FolderKanban } from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Fetch workspaces to list in switcher
    apiClient.get<Workspace[]>('/workspaces')
      .then((res) => {
        setWorkspaces(res.data);
        if (workspaceId) {
          const ws = res.data.find(w => w.id === workspaceId);
          if (ws) setSelectedWorkspace(ws);
        }
      })
      .catch((err) => console.error('Failed to load workspaces in sidebar', err));
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      const ws = workspaces.find(w => w.id === workspaceId);
      if (ws) {
        setSelectedWorkspace(ws);
      }
    } else if (!workspaceId) {
      setSelectedWorkspace(null);
    }
  }, [workspaceId, workspaces]);

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'all') {
      navigate('/workspaces');
    } else if (id) {
      navigate(`/workspaces/${id}`);
    }
    onClose();
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Workspaces', path: '/workspaces', icon: <FolderKanban size={18} /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-cf-navy text-white">
      {/* Workspace Switcher */}
      <div className="p-4 border-b border-cf-navyDark">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-cf-textMuted mb-1.5">
          Workspace Selector
        </label>
        <select
          value={selectedWorkspace?.id || ''}
          onChange={handleWorkspaceChange}
          className="w-full bg-cf-navyDark text-sm text-white px-2 py-1.5 rounded border border-cf-navyDark focus:outline-none focus:border-cf-orange"
        >
          <option value="" disabled>Select Workspace...</option>
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
          <option value="all">+ View Workspaces</option>
        </select>
      </div>

      {/* Nav List */}
      <nav className="flex-grow py-4 space-y-0.5">
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                isActive 
                  ? 'bg-cf-navyDark border-l-4 border-cf-orange text-white font-medium' 
                  : 'text-gray-300 hover:bg-cf-navyDark hover:text-white border-l-4 border-transparent'
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-cf-navy border-r border-cf-navyDark flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            onClick={onClose}
            className="fixed inset-0 bg-cf-navy/60 backdrop-blur-sm"
          />

          {/* Drawer container */}
          <div className="relative w-64 bg-cf-navy text-white flex flex-col z-10 shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-cf-navyDark">
              <span className="font-bold text-base text-cf-orange">Navigation</span>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
