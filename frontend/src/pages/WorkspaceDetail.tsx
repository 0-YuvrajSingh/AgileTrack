import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Project, ProjectStatus } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FolderPlus, Settings, LayoutDashboard, Search, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useWorkspace } from '../hooks/useWorkspaces';
import { projectService } from '../services/projectService';
import { getApiErrorMessage } from '../api/axios';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ON_HOLD: 'bg-amber-100 text-amber-800 border-amber-200',
  COMPLETED: 'bg-purple-100 text-purple-800 border-purple-200',
  ARCHIVED: 'bg-gray-100 text-gray-800 border-gray-200'
};

const WorkspaceDetail: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  
  const { workspace, loading: wsLoading, error: wsError } = useWorkspace(workspaceId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0); // Reset to first page on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.list(workspaceId, debouncedSearch, page, 9, signal);
      setProjects(data.content);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') {
        setError(getApiErrorMessage(e, 'Failed to load projects'));
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, debouncedSearch, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;

    setCreating(true);
    try {
      await projectService.create(workspaceId, { name, description });
      toast.success('Project created successfully!');
      fetchProjects();
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create project'));
    } finally {
      setCreating(false);
    }
  };

  const executeDeleteProject = async () => {
    if (!deleteDialog.id || !workspaceId) return;

    try {
      await projectService.remove(workspaceId, deleteDialog.id);
      toast.success('Project deleted successfully');
      if (projects.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        fetchProjects();
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Project was modified by another user. Refreshing...');
        fetchProjects();
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to delete project'));
      }
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    if (!workspaceId) return;
    try {
      await projectService.updateStatus(workspaceId, projectId, newStatus);
      toast.success(`Project status updated to ${newStatus}`);
      fetchProjects();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Project was modified by another user. Refreshing...');
        fetchProjects();
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to update project status'));
      }
    }
  };


  if (wsLoading && !workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cf-textMuted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-primary mb-4"></div>
        <p>Loading workspace...</p>
      </div>
    );
  }

  if (wsError || error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <EmptyState
          icon={FolderPlus}
          title="Could not load workspace"
          description={wsError || error || 'Unknown error'}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header section ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cf-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-cf-textDark flex items-center gap-2">
            {workspace?.name}
            {workspace?.myRole === 'VIEWER' && (
              <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                <ShieldAlert size={12} /> Read-Only
              </span>
            )}
          </h1>
          <p className="text-sm text-cf-textMuted mt-1">{workspace?.description}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cf-textMuted" size={14} />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-cf-border rounded-full focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Link to={`/workspaces/${workspaceId}/members`}>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto shadow-sm whitespace-nowrap">
              <Settings size={16} className="mr-1.5" /> Manage Team
            </Button>
          </Link>

          {workspace?.myRole !== 'VIEWER' && (
            <Button onClick={() => setShowCreateModal(true)} size="sm" className="w-full sm:w-auto shadow-sm whitespace-nowrap">
              <FolderPlus size={16} className="mr-1.5" /> New Project
            </Button>
          )}
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cf-primary"></div>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState 
          icon={LayoutDashboard}
          title={debouncedSearch ? "No projects match your search" : "No projects yet"}
          description={debouncedSearch ? "Try adjusting your search terms." : "Create your first project to start tracking tasks."}
          actionLabel={debouncedSearch ? "Clear Search" : (workspace?.myRole !== 'VIEWER' ? "Create Project" : undefined)}
          onAction={debouncedSearch ? () => setSearchQuery('') : (workspace?.myRole !== 'VIEWER' ? () => setShowCreateModal(true) : undefined)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} hoverable className="flex flex-col h-full border border-cf-border relative overflow-hidden group">
                <CardBody className="flex-1 pb-4">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="font-bold text-lg text-cf-textDark leading-tight line-clamp-1 flex-1">
                      {project.name}
                    </h3>
                    {workspace?.myRole !== 'VIEWER' && project.status !== 'ARCHIVED' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteDialog({ isOpen: true, id: project.id });
                        }}
                        className="text-cf-textMuted hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-cf-textMuted line-clamp-2 mb-4">
                    {project.description || <span className="italic opacity-60">No description provided.</span>}
                  </p>

                  <div className="mt-auto pt-4 border-t border-cf-border/60">
                    <div className="flex justify-between items-center">
                      {workspace?.myRole !== 'VIEWER' ? (
                        <select
                          value={project.status}
                          onChange={(e) => handleStatusChange(project.id, e.target.value as ProjectStatus)}
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-cf-primary transition-colors cursor-pointer ${STATUS_COLORS[project.status]}`}
                        >
                          {(Object.keys(STATUS_COLORS) as ProjectStatus[]).map(status => (
                            <option key={status} value={status}>{status.replace('_', ' ')}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${STATUS_COLORS[project.status]}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      )}
                      
                      <span className="text-[10px] text-cf-textMuted">
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardBody>
                
                <Link to={`/workspaces/${workspaceId}/projects/${project.id}`} className="block">
                  <div className="bg-cf-bgLight/40 hover:bg-blue-50/50 p-3 text-center border-t border-cf-border transition-colors">
                    <span className="text-sm font-semibold text-cf-primary flex items-center justify-center gap-1.5">
                      <LayoutDashboard size={16} /> Open Board
                    </span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Modals and Dialogs */}
      {showCreateModal && workspace?.myRole !== 'VIEWER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="bg-cf-navy text-white">
              <h3 className="font-bold text-lg">Create New Project</h3>
              <p className="text-xs text-gray-300">Set up a new board for your team.</p>
            </CardHeader>
            <form onSubmit={handleCreateProject}>
              <CardBody className="space-y-4">
                <Input
                  label="Project Name"
                  placeholder="e.g. Website Redesign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition duration-150"
                    placeholder="Briefly describe the goal..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardBody>
              <CardFooter className="flex items-center justify-end gap-3 bg-cf-bgLight/40">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Project"
        message="Are you sure you want to delete this project? All associated tasks will be permanently removed."
        confirmLabel="Delete Project"
        isDestructive={true}
        onConfirm={executeDeleteProject}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default WorkspaceDetail;
