import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Workspace } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FolderPlus, Settings, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const WorkspaceList: React.FC = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const response = await apiClient.get<Workspace[]>('/workspaces');
      setWorkspaces(response.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await apiClient.post<Workspace>('/workspaces', { name, description });
      toast.success('Workspace created successfully!');
      setWorkspaces([...workspaces, res.data]);
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workspace and all its contents? This action is irreversible.')) {
      return;
    }

    try {
      await apiClient.delete(`/workspaces/${id}`);
      toast.success('Workspace deleted successfully');
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete workspace.');
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
      <div className="flex items-center justify-between border-b border-cf-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-cf-textDark">Workspaces</h1>
          <p className="text-xs text-cf-textMuted mt-1">Select or manage your project containers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="text-xs font-semibold">
          <FolderPlus size={14} className="mr-1.5" /> Create Workspace
        </Button>
      </div>

      {/* Grid of Workspaces */}
      {workspaces.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody className="space-y-4">
            <p className="text-sm text-cf-textMuted">You don't belong to any workspaces yet.</p>
            <Button onClick={() => setShowCreateModal(true)} size="sm">
              Create your first Workspace
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workspaces.map((ws) => {
            const isOwner = ws.ownerId === user?.id;
            return (
              <Card key={ws.id} hoverable className="flex flex-col h-full border border-cf-border">
                <CardHeader className="bg-cf-bgLight flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-cf-textDark truncate max-w-[180px]">{ws.name}</h3>
                    <span className="text-[10px] bg-cf-navy text-white px-1.5 py-0.5 rounded font-mono uppercase mt-1 inline-block">
                      {isOwner ? 'Owner' : 'Member'}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(ws.id)}
                      className="text-cf-textMuted hover:text-red-600 transition p-1 hover:bg-white rounded"
                      title="Delete Workspace"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </CardHeader>
                <CardBody className="flex-grow">
                  <p className="text-xs text-cf-textMuted line-clamp-3 leading-relaxed">
                    {ws.description || 'No description provided for this workspace.'}
                  </p>
                </CardBody>
                <CardFooter className="flex items-center justify-between">
                  <Link to={`/workspaces/${ws.id}/settings`} className="text-xs text-cf-textMuted hover:text-cf-orange flex items-center gap-1 transition">
                    <Settings size={14} />
                    <span>Settings & Members</span>
                  </Link>
                  <Link to={`/workspaces/${ws.id}`}>
                    <Button size="sm" variant="secondary" className="text-xs font-semibold flex items-center gap-1">
                      <span>Enter</span>
                      <ArrowRight size={12} />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="bg-cf-navy text-white">
              <h3 className="font-bold text-base">New Workspace</h3>
              <p className="text-[11px] text-gray-300">Create a high-level container for projects and members</p>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardBody className="space-y-4">
                <Input
                  label="Workspace Name"
                  placeholder="e.g. Acme Corporation"
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
                    placeholder="Describe the target team or organization..."
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
                  {creating ? 'Creating...' : 'Create Workspace'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkspaceList;
