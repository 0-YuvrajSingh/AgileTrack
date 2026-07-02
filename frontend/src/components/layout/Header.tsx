import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, ChevronDown, LogOut } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-cf-navy text-white h-14 px-4 flex items-center justify-between border-b border-cf-navyDark flex-shrink-0">
      <div className="flex items-center space-x-3">
        {/* Mobile Menu Trigger */}
        {isAuthenticated && onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1.5 hover:bg-cf-navyDark rounded transition"
            aria-label="Toggle Navigation Menu"
          >
            <Menu size={20} />
          </button>
        )}
        
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          className="flex items-center space-x-1.5 font-bold text-lg tracking-tight"
        >
          <span className="text-cf-orange font-extrabold font-sans">Agile</span>
          <span>Track</span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-1.5 text-sm hover:text-gray-200 transition focus:outline-none"
                aria-label="Open profile menu"
                aria-expanded={profileDropdownOpen}
              >
                <div className="w-7 h-7 bg-cf-orange text-white text-xs font-bold rounded-full flex items-center justify-center uppercase">
                  {user?.email ? user.email.slice(0, 2) : 'US'}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              
              {profileDropdownOpen && (
                <>
                  <div onClick={() => setProfileDropdownOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute right-0 mt-2 w-48 bg-white text-cf-textDark border border-cf-border rounded shadow-lg py-1 z-20">
                    <div className="px-4 py-2 border-b border-cf-border text-xs text-cf-textMuted truncate">
                      {user?.email}
                    </div>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-cf-bgLight transition"
                      aria-label="Log out"
                    >
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {location.pathname !== '/login' && (
              <Link to="/login" className="hover:text-cf-orange transition duration-150">
                Log In
              </Link>
            )}
            {location.pathname !== '/register' && (
              <Link
                to="/register"
                className="bg-cf-orange hover:bg-cf-orangeHover text-white px-4 py-2 rounded text-xs transition duration-150"
              >
                Sign Up
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
