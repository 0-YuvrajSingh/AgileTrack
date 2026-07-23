import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/axios';
import type { PageResponse, Project, Workspace } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FolderPlus, Calendar, ArrowRight, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const WorkspaceDetail: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [wsRes, projsRes] = await Promise.all([
        apiClient.get<Workspace>(`/workspaces/${workspaceId}`, { signal }),
        apiClient.get<PageResponse<Project>>(`/workspaces/${workspaceId}/projects`, {
          params: { page, size: 9, search: debouncedSearch },
          signal
        })
      ]);
      setWorkspace(wsRes.data);
      setProjects(projsRes.data.content);
      setTotalPages(projsRes.data.totalPages);
    } catch (err) {
      if (signal?.aborted) return;
      console.error(err);
      toast.error('Failed to load workspace detail or projects list');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    if (workspaceId) {
      fetchData(controller.signal);
    }
    return () => controller.abort();
  }, [workspaceId, fetchData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      await apiClient.post<Project>(`/workspaces/${workspaceId}/projects`, {
        name,
        description
      });
      toast.success('Project created successfully!');
      await fetchData();
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: unknown) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Failed to create project.'));
    } finally {
      setCreating(false);
    }
  };

  const executeDeleteProject = async () => {
    if (!deleteDialog.id) return;

    try {
      await apiClient.delete(`/workspaces/${workspaceId}/projects/${deleteDialog.id}`);
      toast.success('Project deleted successfully');
      await fetchData();
    } catch (err: unknown) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Failed to delete project.'));
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-status-successBg text-status-success border-status-success/20';
      case 'PLANNING': return 'bg-status-infoBg text-status-info border-status-info/20';
      case 'ON_HOLD': return 'bg-status-warningBg text-status-warning border-status-warning/20';
      case 'COMPLETED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

        {workspace?.myRole !== 'VIEWER' && (
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="text-xs font-semibold">
            <FolderPlus size={14} className="mr-1.5" /> New Project
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cf-textMuted" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-cf-border rounded-md text-sm focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition"
          />
        </div>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody className="space-y-4">
            <p className="text-sm text-cf-textMuted font-sans">No projects found in this workspace.</p>
            {workspace?.myRole !== 'VIEWER' && (
              <Button onClick={() => setShowCreateModal(true)} size="sm">
                Create your first Project
              </Button>
            )}
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
                {workspace?.myRole !== 'VIEWER' && (
                  <button
                    onClick={() => setDeleteDialog({ isOpen: true, id: proj.id })}
                    className="text-cf-textMuted hover:text-red-600 transition p-1 hover:bg-white rounded"
                    aria-label={`Delete project ${proj.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
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
                <Link to={`/workspaces/${workspaceId}/projects/${proj.id}`}>
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

      {projects.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Project"
        message="Are you sure you want to delete this project and all its tasks? This action is irreversible."
        confirmLabel="Delete Project"
        isDestructive={true}
        onConfirm={executeDeleteProject}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />

      {/* Create Project Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <Card className="w-full max-w-md shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
