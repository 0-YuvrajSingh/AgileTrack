import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/axios';
import type { Project, Workspace } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FolderPlus, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const WorkspaceDetail: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [wsRes, projsRes] = await Promise.all([
        apiClient.get<Workspace>(`/workspaces/${workspaceId}`),
        apiClient.get<Project[]>(`/workspaces/${workspaceId}/projects`)
      ]);
      setWorkspace(wsRes.data);
      setProjects(projsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workspace detail or projects list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await apiClient.post<Project>(`/workspaces/${workspaceId}/projects`, {
        name,
        description
      });
      toast.success('Project created successfully!');
      setProjects([...projects, res.data]);
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project and all its tasks?')) {
      return;
    }

    try {
      await apiClient.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
      toast.success('Project deleted successfully');
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'PLANNING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ARCHIVED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-orange"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cf-border pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-cf-textMuted uppercase font-semibold tracking-wider">
            <Link to="/workspaces" className="hover:text-cf-orange transition">Workspaces</Link>
            <span>/</span>
            <span className="text-cf-textDark">{workspace?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-cf-textDark mt-1">{workspace?.name} Projects</h1>
          <p className="text-xs text-cf-textMuted mt-1">Manage project pipelines inside this workspace</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} size="sm" className="text-xs font-semibold">
          <FolderPlus size={14} className="mr-1.5" /> New Project
        </Button>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody className="space-y-4">
            <p className="text-sm text-cf-textMuted font-sans">No projects found in this workspace.</p>
            <Button onClick={() => setShowCreateModal(true)} size="sm">
              Create your first Project
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <Card key={proj.id} hoverable className="flex flex-col h-full border border-cf-border">
              <CardHeader className="bg-cf-bgLight flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-cf-textDark truncate max-w-[180px]">{proj.name}</h3>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border mt-1.5 inline-block font-mono ${getStatusColor(proj.status)}`}>
                    {proj.status}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteProject(proj.id)}
                  className="text-cf-textMuted hover:text-red-600 transition p-1 hover:bg-white rounded"
                  title="Delete Project"
                >
                  <Trash2 size={15} />
                </button>
              </CardHeader>
              <CardBody className="flex-grow">
                <p className="text-xs text-cf-textMuted line-clamp-3 leading-relaxed">
                  {proj.description || 'No description provided for this project.'}
                </p>
              </CardBody>
              <CardFooter className="flex justify-between items-center bg-cf-bgLight/40">
                <span className="text-[10px] text-cf-textMuted flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                </span>
                <Link to={`/projects/${proj.id}`}>
                  <Button size="sm" className="text-xs font-semibold flex items-center gap-1">
                    <span>Task Board</span>
                    <ArrowRight size={12} />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="bg-cf-navy text-white">
              <h3 className="font-bold text-base">New Project</h3>
              <p className="text-[11px] text-gray-300">Create a task container in this workspace</p>
            </CardHeader>
            <form onSubmit={handleCreateProject}>
              <CardBody className="space-y-4">
                <Input
                  label="Project Name"
                  placeholder="e.g. API Integration Phase 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition duration-150"
                    placeholder="Brief description of project goals..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardBody>
              <CardFooter className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    setName('');
                    setDescription('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetail;
