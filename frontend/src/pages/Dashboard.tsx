import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/axios';
import type { Workspace, Project } from '../types';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FolderKanban, Plus, Clock, ListTodo } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const wsRes = await apiClient.get<Workspace[]>('/workspaces');
        setWorkspaces(wsRes.data);
        
        // Fetch project counts for workspaces to show stats
        let totalProjects = 0;
        for (const ws of wsRes.data) {
          try {
            const projRes = await apiClient.get<Project[]>(`/workspaces/${ws.id}/projects`);
            totalProjects += projRes.data.length;
          } catch (e) {
            console.error('Failed to load projects for workspace', ws.id);
          }
        }
        setProjectCount(totalProjects);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-orange"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-cf-navy text-white p-6 rounded shadow-cf-card flex flex-col md:flex-row md:items-center md:justify-between border border-cf-navyDark">
        <div>
          <h1 className="text-2xl font-bold font-sans">System Overview</h1>
          <p className="text-sm text-gray-300 mt-1">Status: Operational. Track issues and projects across your workspaces.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Link to="/workspaces">
            <Button variant="primary" className="text-xs font-semibold">
              <Plus size={14} className="mr-1.5" /> Create Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="flex items-center space-x-4">
            <div className="p-3 bg-cf-orange/10 text-cf-orange rounded">
              <FolderKanban size={24} />
            </div>
            <div>
              <p className="text-xs text-cf-textMuted font-semibold uppercase tracking-wider">Active Workspaces</p>
              <h3 className="text-2xl font-bold text-cf-textDark mt-0.5">{workspaces.length}</h3>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="flex items-center space-x-4">
            <div className="p-3 bg-cf-orange/10 text-cf-orange rounded">
              <ListTodo size={24} />
            </div>
            <div>
              <p className="text-xs text-cf-textMuted font-semibold uppercase tracking-wider">Total Projects</p>
              <h3 className="text-2xl font-bold text-cf-textDark mt-0.5">{projectCount}</h3>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center space-x-4">
            <div className="p-3 bg-cf-orange/10 text-cf-orange rounded">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-cf-textMuted font-semibold uppercase tracking-wider">Operational Status</p>
              <h3 className="text-lg font-bold text-green-600 mt-1.5 flex items-center">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>
                Active
              </h3>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Workspaces List Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold uppercase tracking-wider text-cf-textMuted">Recent Workspaces</h2>
          </CardHeader>
          <CardBody className="p-0">
            {workspaces.length === 0 ? (
              <div className="p-6 text-center text-sm text-cf-textMuted">
                No workspaces available. Create one to get started.
              </div>
            ) : (
              <div className="divide-y divide-cf-border">
                {workspaces.slice(0, 5).map((ws) => (
                  <div key={ws.id} className="p-4 flex items-center justify-between hover:bg-cf-bgLight transition">
                    <div>
                      <h4 className="text-sm font-bold text-cf-textDark">{ws.name}</h4>
                      <p className="text-xs text-cf-textMuted mt-0.5 line-clamp-1">{ws.description || 'No description provided'}</p>
                    </div>
                    <Link to={`/workspaces/${ws.id}`}>
                      <Button variant="secondary" size="sm" className="text-xs font-semibold">
                        Enter Workspace
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold uppercase tracking-wider text-cf-textMuted">My Tasks Due Soon</h2>
          </CardHeader>
          <CardBody className="p-6 text-center text-sm text-cf-textMuted">
            Select a workspace and project to view and manage task details.
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
