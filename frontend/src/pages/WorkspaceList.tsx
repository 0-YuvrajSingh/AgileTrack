import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axios';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FolderPlus, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { workspaceService } from '../services/workspaceService';

export const WorkspaceList: React.FC = () => {
  const { workspaces, loading, error, refetch } = useWorkspaces();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
      }
    };
    if (showCreateModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      await workspaceService.create({ name, description });
      toast.success('Workspace created successfully!');
      await refetch();
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: unknown) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Failed to create workspace.'));
    } finally {
      setCreating(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      await workspaceService.remove(deleteDialog.id);
      toast.success('Workspace deleted successfully');
      await refetch();
    } catch (err: unknown) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Failed to delete workspace.'));
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-cf-border">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-cf-border rounded-lg p-5 bg-white flex flex-col h-40">
              <Skeleton className="h-5 w-2/3 mb-4" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-4/5 mt-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          icon={FolderPlus}
          title="Workspaces could not load"
          description={getApiErrorMessage(error, 'Something went wrong while loading workspaces.')}
          actionLabel="Try Again"
          onAction={refetch}
        />
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
        <EmptyState 
          icon={FolderPlus}
          title="No workspaces found"
          description="You don't belong to any workspaces yet. Create one to start collaborating with your team."
          actionLabel="Create Workspace"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workspaces.map((ws) => {
            const isOwner = ws.myRole === 'OWNER';
            return (
              <Card key={ws.id} hoverable className="flex flex-col h-full border border-cf-border">
                <CardHeader className="bg-cf-bgLight flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-cf-textDark truncate max-w-[180px]">{ws.name}</h3>
                    <span className="text-[10px] bg-cf-navy text-white px-1.5 py-0.5 rounded font-mono uppercase mt-1 inline-block">
                      {ws.myRole}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setDeleteDialog({ isOpen: true, id: ws.id })}
                      className="text-cf-textMuted hover:text-red-600 transition p-1 hover:bg-white rounded"
                      aria-label={`Delete workspace ${ws.name}`}
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
                  <span className="text-xs text-cf-textMuted">Workspace details</span>
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <Card className="w-full max-w-md shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace and all its contents? This action is irreversible."
        confirmLabel="Delete Workspace"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default WorkspaceList;
