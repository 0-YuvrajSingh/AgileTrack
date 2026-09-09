import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LayoutDashboard, CheckSquare, Search, Plus, Calendar, Loader2, ArrowRight, ArrowLeftRight, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useWorkspace } from '../hooks/useWorkspaces';
import { useProject } from '../hooks/useProjects';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { useTasks } from '../hooks/useTasks';
import { taskService } from '../services/taskService';
import { getApiErrorMessage } from '../api/axios';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'TODO': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'IN_PROGRESS': return 'bg-blue-50 text-cf-primary border-blue-200';
    case 'IN_REVIEW': return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'DONE': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  }
};

const getPriorityBadge = (priority: TaskPriority) => {
  switch (priority) {
    case 'LOW': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'MEDIUM': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'HIGH': return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'URGENT': return 'bg-red-50 text-red-600 border-red-200';
  }
};

const TaskBoard: React.FC = () => {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const { user } = useAuth();
  
  // Custom hooks for data fetching
  const { workspace, loading: wsLoading, error: wsError } = useWorkspace(workspaceId);
  const { project, loading: projLoading, error: projError } = useProject(workspaceId, projectId);
  const { members, loading: memLoading } = useWorkspaceMembers(workspaceId);
  const { tasks, setTasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTasks(workspaceId, projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals & State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    refetchTasks(debouncedSearch);
  }, [debouncedSearch, refetchTasks]);

  const isLoading = wsLoading || projLoading || tasksLoading || memLoading;
  const initError = wsError || projError || tasksError;

  const handleConcurrencyError = (err: any) => {
    if (err?.response?.status === 409) {
      toast.error('Task was modified by another user. Refreshing...', { duration: 4000 });
      refetchTasks(debouncedSearch);
    } else {
      toast.error(getApiErrorMessage(err, 'An error occurred'));
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !workspaceId || !projectId) return;

    const payload = {
      title,
      description,
      priority,
      deadline: deadline || null,
      assigneeId: selectedAssigneeId || null
    };

    setSaving(true);
    try {
      if (editingTask) {
        await taskService.update(workspaceId, projectId, editingTask.id, payload);
        toast.success('Task updated successfully');
      } else {
        await taskService.create(workspaceId, projectId, payload);
        toast.success('Task created successfully');
      }
      setShowModal(false);
      setEditingTask(null);
      refetchTasks(debouncedSearch);
    } catch (err: any) {
      handleConcurrencyError(err);
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteTask = async () => {
    if (!deleteDialog.id || !workspaceId || !projectId) return;
    try {
      await taskService.remove(workspaceId, projectId, deleteDialog.id);
      toast.success('Task deleted successfully');
      refetchTasks(debouncedSearch);
    } catch (err: any) {
      handleConcurrencyError(err);
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDeadline('');
    setSelectedAssigneeId(user?.id || '');
    setEditingTask(null);
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDeadline(task.deadline ? task.deadline.slice(0, 16) : '');
    setSelectedAssigneeId(task.assigneeId || '');
    setEditingTask(task);
    setShowModal(true);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!workspaceId || !projectId) return;

    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic UI update
    const previousTasks = [...tasks];
    
    // Calculate new position (put at bottom of target column)
    const targetColumnTasks = tasks.filter(t => t.status === targetStatus && t.id !== taskId);
    const nextPosition = targetColumnTasks.length === 0 
      ? 1000 
      : Math.max(...targetColumnTasks.map(t => t.position ?? 0)) + 1000;

    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: targetStatus, position: nextPosition } : t
    ));

    try {
      await taskService.updateStatus(workspaceId, projectId, taskId, targetStatus, nextPosition);
    } catch (err: any) {
      // Revert optimistic update
      setTasks(previousTasks);
      handleConcurrencyError(err);
    }
  };

  const handleStatusChangeClick = async (taskId: string, newStatus: TaskStatus) => {
    if (!workspaceId || !projectId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await taskService.updateStatus(workspaceId, projectId, taskId, newStatus);
    } catch (err: any) {
      setTasks(previousTasks);
      handleConcurrencyError(err);
    }
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cf-textMuted">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading project board...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <EmptyState
          icon={CheckSquare}
          title="Failed to load project board"
          description={initError}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cf-border pb-4 mb-6">
        <div>
          <div className="flex items-center text-xs text-cf-textMuted mb-1 font-semibold tracking-wide uppercase">
            <LayoutDashboard size={12} className="mr-1" />
            <Link to={`/workspaces/${workspaceId}`} className="hover:text-cf-primary transition-colors">
              {workspace?.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-cf-textDark">{project?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-cf-textDark flex items-center gap-2">
            {project?.name}
            {project?.status === 'ARCHIVED' && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                Archived
              </span>
            )}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cf-textMuted" size={14} />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-cf-border rounded-full focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED' && (
            <Button onClick={openCreateModal} size="sm" className="w-full sm:w-auto whitespace-nowrap shadow-sm">
              <Plus size={16} className="mr-1" /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex h-full min-w-max gap-6 px-1">
          {STATUSES.map(status => {
            const statusTasks = tasks.filter(t => t.status === status).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            
            return (
              <div 
                key={status} 
                className="w-72 md:w-80 flex flex-col bg-cf-bgLight/30 rounded-xl border border-cf-border/60"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-cf-border/60 flex items-center justify-between bg-cf-bgLight/50 rounded-t-xl">
                  <h3 className="font-semibold text-sm text-cf-textDark flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(status).split(' ')[0]}`}></span>
                    {status.replaceAll('_', ' ')}
                  </h3>
                  <span className="text-xs font-mono bg-white text-cf-textMuted px-2 py-0.5 rounded-full border border-cf-border shadow-sm">
                    {statusTasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
                  {statusTasks.map(task => (
                    <div
                      key={task.id}
                      draggable={workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED'}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`bg-white border p-3 rounded-lg shadow-sm hover:shadow-md transition-all group ${
                        workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED' ? 'cursor-grab active:cursor-grabbing hover:border-cf-primary/40' : 'cursor-default'
                      } ${getStatusColor(task.status).split(' ')[2]}`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-semibold text-sm text-cf-textDark leading-tight line-clamp-2">
                          {task.title}
                        </h4>
                        
                        {workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED' && (
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1 text-cf-textMuted hover:text-cf-primary hover:bg-blue-50 rounded"
                            >
                              <CheckSquare size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteDialog({ isOpen: true, id: task.id })}
                              className="p-1 text-cf-textMuted hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <ArrowRight size={12} className="rotate-45" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-cf-textMuted line-clamp-2 mb-3 leading-relaxed">
                        {task.description || <span className="italic opacity-60">No description</span>}
                      </p>

                      <div className="mt-4 pt-3 border-t border-cf-border flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                          
                          <div className="flex items-center space-x-1 text-[10px] text-cf-textMuted">
                            <User size={12} className="text-cf-primary" />
                            <span className="text-[9px] truncate max-w-[80px]" title={task.assigneeEmail || 'Unassigned'}>
                              {task.assigneeEmail ? task.assigneeEmail.split('@')[0] : 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {task.deadline && (
                          <div className="text-[9px] text-cf-textMuted flex items-center gap-1">
                            <Calendar size={11} />
                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}

                        {workspace?.myRole !== 'VIEWER' && project?.status !== 'ARCHIVED' && (
                          <div className="mt-2 flex items-center justify-between text-[10px] border-t border-dashed border-cf-border pt-2 md:hidden">
                            <span className="text-cf-textMuted flex items-center gap-1">
                              <ArrowLeftRight size={10} /> Move:
                            </span>
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChangeClick(task.id, e.target.value as TaskStatus)}
                              className="bg-cf-bgLight border border-cf-border rounded text-[9px] px-1 py-0.5 text-cf-textDark focus:outline-none"
                            >
                              {STATUSES.map(st => (
                                <option key={st} value={st}>{st.replaceAll('_', ' ')}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {statusTasks.length === 0 && (
                    <div className="border border-dashed border-cf-border/60 rounded py-8 text-center text-xs text-cf-textMuted select-none">
                      Drag items here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <Card className="w-full max-w-lg shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <CardHeader className="bg-cf-navy text-white">
              <h3 className="font-bold text-base">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <p className="text-[11px] text-gray-300">Fill in task parameters and assign to a team member.</p>
            </CardHeader>
            <form onSubmit={handleSaveTask}>
              <CardBody className="space-y-4">
                <Input
                  label="Task Title"
                  placeholder="e.g. Implement user login form"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition duration-150"
                    placeholder="Describe tasks requirements or steps..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition duration-150"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                      Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition duration-150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cf-textMuted mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-primary focus:ring-1 focus:ring-cf-primary transition duration-150"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.email}</option>
                    ))}
                  </select>
                </div>
              </CardBody>
              <CardFooter className="flex items-center justify-end gap-3 bg-cf-bgLight/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Task'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action is irreversible."
        confirmLabel="Delete Task"
        isDestructive={true}
        onConfirm={executeDeleteTask}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default TaskBoard;
