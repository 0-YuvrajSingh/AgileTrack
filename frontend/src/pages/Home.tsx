import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { CheckCircle, BarChart3, Users } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col flex-grow">
      {/* Hero Section */}
      <section className="bg-cf-navy text-white py-20 px-6 md:px-12 text-center border-b border-cf-navyDark">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 font-sans">
            Technical Project Management, <span className="text-cf-orange">Stark & Simple</span>
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            AgileTrack is a high-performance workspace and issue tracker modeled after Cloudflare's utility layouts. No complex animations, no over-engineered flows. Just raw agility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="px-8 font-semibold">
                Get Started for Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="px-8 font-semibold bg-transparent text-white border-white/20 hover:bg-white/5">
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 md:px-12 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-cf-textDark mb-12">
          Designed for Speed and Technical Teams
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card hoverable>
            <CardBody>
              <div className="w-10 h-10 rounded bg-cf-orange/10 flex items-center justify-center text-cf-orange mb-4">
                <CheckCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-cf-textDark mb-2">Kanban Board Routing</h3>
              <p className="text-sm text-cf-textMuted leading-relaxed">
                Horizontal snap columns and status-based task pipelines map directly to your database schemas. Simple state synchronization.
              </p>
            </CardBody>
          </Card>

          <Card hoverable>
            <CardBody>
              <div className="w-10 h-10 rounded bg-cf-orange/10 flex items-center justify-center text-cf-orange mb-4">
                <Users size={22} />
              </div>
              <h3 className="text-lg font-bold text-cf-textDark mb-2">Workspace & Project Tiers</h3>
              <p className="text-sm text-cf-textMuted leading-relaxed">
                Invite team members, assign workspace roles (Owner, Admin, Member), and isolate projects in separate containers.
              </p>
            </CardBody>
          </Card>

          <Card hoverable>
            <CardBody>
              <div className="w-10 h-10 rounded bg-cf-orange/10 flex items-center justify-center text-cf-orange mb-4">
                <BarChart3 size={22} />
              </div>
              <h3 className="text-lg font-bold text-cf-textDark mb-2">Technical Overview</h3>
              <p className="text-sm text-cf-textMuted leading-relaxed">
                Get immediate visibility on project health, priority classifications (Low, Medium, High, Urgent), and task completion statistics.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
