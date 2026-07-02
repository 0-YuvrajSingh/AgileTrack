import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { CheckCircle, FolderKanban, Layers } from 'lucide-react';

export const Home: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Auth Loading Gate: prevent public marketing screen flash
  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-cf-bgLight">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-orange"></div>
      </div>
    );
  }

  // Logged-in State Redirect
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col flex-grow">
      {/* Hero Section */}
      <section className="bg-cf-navy text-white py-14 px-6 md:px-12 text-center border-b border-cf-navyDark">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 font-sans text-white">
            Technical Project Management, <span className="text-cf-orange">Stark & Simple</span>
          </h1>
          <p className="text-base text-gray-300 mb-6 max-w-xl mx-auto leading-relaxed">
            AgileTrack is a high-performance workspace and issue tracker modeled after Cloudflare's utility layouts. No complex animations, no over-engineered flows. Just raw agility.
          </p>
          <div className="flex justify-center">
            <Link to="/register">
              <Button size="md" className="px-8 font-semibold">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-6 md:px-12 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-center text-cf-textDark mb-8">
          Designed for Speed and Technical Teams
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card hoverable className="border border-cf-border">
            <CardBody>
              <div className="w-10 h-10 rounded bg-cf-orange/10 flex items-center justify-center text-cf-orange mb-4">
                <Layers size={20} />
              </div>
              <h3 className="text-base font-bold text-cf-textDark mb-2">Workspaces</h3>
              <p className="text-xs text-cf-textMuted leading-relaxed">
                Create and manage isolated high-level containers to coordinate projects and team tasks.
              </p>
            </CardBody>
          </Card>

          <Card hoverable className="border border-cf-border">
            <CardBody>
              <div className="w-10 h-10 rounded bg-cf-orange/10 flex items-center justify-center text-cf-orange mb-4">
                <FolderKanban size={20} />
              </div>
              <h3 className="text-base font-bold text-cf-textDark mb-2">Projects</h3>
              <p className="text-xs text-cf-textMuted leading-relaxed">
                Organize task lists and execution tracks inside focused workspace projects.
              </p>
            </CardBody>
          </Card>

          <Card hoverable className="border border-cf-border">
            <CardBody>
              <div className="w-10 h-10 rounded bg-cf-orange/10 flex items-center justify-center text-cf-orange mb-4">
                <CheckCircle size={20} />
              </div>
              <h3 className="text-base font-bold text-cf-textDark mb-2">Kanban Task Boards</h3>
              <p className="text-xs text-cf-textMuted leading-relaxed">
                Draggable task boards mapping TODO, IN_PROGRESS, IN_REVIEW, and DONE pipelines with self-assignee defaults.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
