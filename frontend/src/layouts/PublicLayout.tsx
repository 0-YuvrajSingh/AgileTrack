import type React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-cf-textDark">
      <Header />
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>
      <footer className="bg-cf-navy text-gray-400 py-6 text-center text-xs border-t border-cf-navyDark flex-shrink-0">
        <p>&copy; {new Date().getFullYear()} AgileTrack. Technical Agile Management Platform. Inspired by Cloudflare Classic.</p>
      </footer>
    </div>
  );
};

export default PublicLayout;
