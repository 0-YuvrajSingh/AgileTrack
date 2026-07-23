import type React from 'react';

interface BrandPanelProps {
  heading: string;
  sub: string;
}

export const BrandPanel: React.FC<BrandPanelProps> = ({ heading, sub }) => {
  return (
    <div className="hidden md:flex relative flex-col justify-between bg-cf-navy text-white p-10 overflow-hidden">
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cf-navySoft opacity-60 animate-blob" />
      <div className="absolute -left-10 bottom-10 w-40 h-40 rounded-full bg-cf-orange/20 animate-float" />

      <div className="relative z-10">
        <span className="font-bold text-lg tracking-tight">
          <span className="text-cf-orange">Agile</span>Track
        </span>
      </div>

      <div className="relative z-10 max-w-sm">
        <svg viewBox="0 0 200 140" className="w-40 h-28 mb-8 animate-float" aria-hidden="true">
          <rect x="10" y="40" width="60" height="40" rx="8" fill="#232A45" stroke="#5B4FE9" strokeWidth="1.5" />
          <rect x="20" y="52" width="34" height="5" rx="2.5" fill="#5B4FE9" />
          <rect x="20" y="62" width="24" height="5" rx="2.5" fill="#3A4064" />

          <rect x="80" y="15" width="60" height="40" rx="8" fill="#232A45" stroke="#5B4FE9" strokeWidth="1.5" />
          <rect x="90" y="27" width="34" height="5" rx="2.5" fill="#5B4FE9" />
          <rect x="90" y="37" width="24" height="5" rx="2.5" fill="#3A4064" />

          <rect x="130" y="65" width="60" height="40" rx="8" fill="#232A45" stroke="#5B4FE9" strokeWidth="1.5" />
          <rect x="140" y="77" width="34" height="5" rx="2.5" fill="#5B4FE9" />
          <rect x="140" y="87" width="24" height="5" rx="2.5" fill="#3A4064" />
        </svg>

        <h2 className="text-2xl font-bold tracking-tight leading-snug">{heading}</h2>
        <p className="mt-3 text-sm text-gray-300">{sub}</p>
      </div>

      <p className="relative z-10 text-xs text-gray-400">&copy; {new Date().getFullYear()} AgileTrack</p>
    </div>
  );
};

export default BrandPanel;
