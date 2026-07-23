import type React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Mascot: React.FC = () => (
  <svg viewBox="0 0 360 360" className="w-full h-full" role="img" aria-labelledby="mascotTitle">
    <title id="mascotTitle">AgileTrack robot mascot organizing task cards</title>

    <circle cx="180" cy="180" r="150" fill="#EEEDFC" className="origin-center animate-blob" />

    <g className="animate-floatSlow" style={{ transformOrigin: '70px 90px' }}>
      <rect x="30" y="70" width="90" height="60" rx="10" fill="#ffffff" stroke="#E5E7F0" strokeWidth="2" />
      <rect x="44" y="86" width="50" height="7" rx="3.5" fill="#5B4FE9" />
      <rect x="44" y="100" width="62" height="6" rx="3" fill="#E5E7F0" />
      <rect x="44" y="112" width="40" height="6" rx="3" fill="#E5E7F0" />
    </g>

    <g className="animate-float" style={{ transformOrigin: '290px 130px' }}>
      <rect x="245" y="100" width="90" height="60" rx="10" fill="#ffffff" stroke="#E5E7F0" strokeWidth="2" />
      <circle cx="262" cy="118" r="6" fill="#16A34A" />
      <rect x="276" y="113" width="48" height="6" rx="3" fill="#E5E7F0" />
      <rect x="262" y="132" width="62" height="6" rx="3" fill="#E5E7F0" />
      <rect x="262" y="144" width="34" height="6" rx="3" fill="#E5E7F0" />
    </g>

    <g className="animate-floatSlow" style={{ transformOrigin: '110px 270px', animationDelay: '1.2s' }}>
      <rect x="70" y="245" width="84" height="52" rx="10" fill="#ffffff" stroke="#E5E7F0" strokeWidth="2" />
      <rect x="84" y="259" width="30" height="6" rx="3" fill="#D97706" />
      <rect x="84" y="272" width="54" height="6" rx="3" fill="#E5E7F0" />
      <rect x="84" y="283" width="40" height="6" rx="3" fill="#E5E7F0" />
    </g>

    <g className="animate-float" style={{ transformOrigin: '190px 200px' }}>
      <line x1="190" y1="95" x2="190" y2="75" stroke="#161B2E" strokeWidth="4" strokeLinecap="round" />
      <circle cx="190" cy="70" r="7" fill="#5B4FE9" />

      <rect x="140" y="95" width="100" height="80" rx="24" fill="#161B2E" />
      <rect x="160" y="120" width="24" height="24" rx="8" fill="#EEEDFC" />
      <rect x="196" y="120" width="24" height="24" rx="8" fill="#EEEDFC" />
      <rect x="166" y="127" width="12" height="12" rx="6" fill="#5B4FE9" />
      <rect x="202" y="127" width="12" height="12" rx="6" fill="#5B4FE9" />
      <path d="M170 158 Q190 170 210 158" stroke="#5B4FE9" strokeWidth="4" fill="none" strokeLinecap="round" />

      <rect x="120" y="180" width="140" height="100" rx="20" fill="#232A45" />
      <rect x="150" y="205" width="80" height="50" rx="10" fill="#ffffff" opacity="0.08" />
      <circle cx="190" cy="230" r="16" fill="#5B4FE9" />
      <path d="M182 230 l6 6 l12 -14" stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="95" y="200" width="26" height="14" rx="7" fill="#161B2E" />
      <rect x="259" y="200" width="26" height="14" rx="7" fill="#161B2E" />
    </g>
  </svg>
);

export const Home: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-cf-bgLight min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-orange"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-grow bg-cf-bgLight">
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="animate-fadeUp">
          <span className="inline-block bg-cf-orangeSoft text-cf-orange text-xs font-semibold px-3 py-1 rounded-full mb-5">
            Built for engineering teams
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-cf-textDark tracking-tight leading-tight">
            Ship work your team can actually see moving.
          </h1>
          <p className="mt-5 text-base text-cf-textMuted max-w-md">
            AgileTrack gives every workspace a clear pipeline &mdash; from workspace, to project,
            to task board &mdash; so nothing quietly stalls in a backlog again.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              to="/register"
              className="bg-cf-orange hover:bg-cf-orangeHover text-white font-semibold px-6 py-3 rounded-lg text-sm transition duration-150 shadow-cf-card-lg"
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="text-cf-textDark font-medium px-4 py-3 rounded-lg text-sm hover:bg-white transition duration-150 border border-cf-border"
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-xs text-cf-textMuted">
            Demo credentials available on the login page.
          </p>
        </div>

        <div className="relative h-80 md:h-96" aria-hidden="true">
          <Mascot />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              title: 'Workspaces',
              desc: 'Group every project your organization runs under one coordinated space.',
              accent: 'bg-cf-orangeSoft text-cf-orange',
              icon: <path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />,
            },
            {
              title: 'Projects',
              desc: 'Track status from planning to active, so priorities are never a guess.',
              accent: 'bg-status-successBg text-status-success',
              icon: <path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
            },
            {
              title: 'Task boards',
              desc: 'A focused kanban view for every project, updated in real time.',
              accent: 'bg-status-warningBg text-status-warning',
              icon: <path d="M4 5h4v14H4V5zm6 0h4v9h-4V5zm6 0h4v6h-4V5z" />,
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white border border-cf-border rounded-xl p-6 hover:shadow-cf-card-lg transition duration-200 hover:-translate-y-1"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.accent}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  {f.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-cf-textDark">{f.title}</h3>
              <p className="mt-2 text-sm text-cf-textMuted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
