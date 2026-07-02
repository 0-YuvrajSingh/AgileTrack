import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Project, Task, TaskPriority, TaskStatus, Workspace } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, User, ArrowLeftRight, Trash2, Edit2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const TaskBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  // Drag state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const fetchTasks = async (targetWorkspaceId = workspaceId) => {
    if (!targetWorkspaceId || !projectId) {
      return;
    }

    const tasksRes = await apiClient.get<Task[]>(`/workspaces/${targetWorkspaceId}/projects/${projectId}/tasks`);
    setTasks(tasksRes.data);
  };

  const resolveWorkspaceAndLoad = async () => {
    try {
      // Find workspace that owns this project by listing workspaces and searching their projects
      const wsRes = await apiClient.get<Workspace[]>('/workspaces');
      let foundWorkspaceId = null;
      let foundProject = null;
      
      for (const ws of wsRes.data) {
        try {
          const projsRes = await apiClient.get<Project[]>(`/workspaces/${ws.id}/projects`);
          const match = projsRes.data.find(p => p.id === projectId);
          if (match) {
            foundWorkspaceId = ws.id;
            foundProject = match;
            break;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!foundWorkspaceId || !foundProject) {
        toast.error('Project not found in any workspace');
        setLoading(false);
        return;
      }

      setWorkspaceId(foundWorkspaceId);
      setProject(foundProject);

      // Fetch tasks in this project
      await fetchTasks(foundWorkspaceId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load task board data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      resolveWorkspaceAndLoad();
    }
  }, [projectId]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDeadline('');
    setShowModal(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    if (task.deadline) {
      // Format LocalDateTime string to datetime-local input (YYYY-MM-DDTHH:MM)
      const date = new Date(task.deadline);
      const formatted = date.toISOString().slice(0, 16);
      setDeadline(formatted);
    } else {
      setDeadline('');
    }
    setShowModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user?.id) {
      toast.error('Task title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        priority,
        deadline: deadline ? new Date(deadline).toISOString().slice(0, 19) : null,
        assigneeId: user.id // Set current user as assignee automatically to satisfy backend validation
      };

      if (editingTask) {
        // Edit task
        await apiClient.put<Task>(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks/${editingTask.id}`,
          payload
        );
        await fetchTasks();
        toast.success('Task updated successfully');
      } else {
        // Create task
        await apiClient.post<Task>(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
          payload
        );
        await fetchTasks();
        toast.success('Task created successfully');
      }
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
      await fetchTasks();

    try {
      await apiClient.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await apiClient.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
        { status: newStatus }
      );
      await fetchTasks();
      toast.success(`Task moved to ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update task status. Reverting change.');
    } finally {
      setDraggingTaskId(null);
    }
  };

  const handleStatusChangeClick = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await apiClient.patch<Task>(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
        { status: newStatus }
      );
      await fetchTasks();
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update task status.');
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-green-100 text-green-800 border-green-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-cf-border';
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
    <div className="space-y-6 max-w-full">
      {/* Board Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cf-border pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-cf-textMuted uppercase font-semibold tracking-wider">
            <Link to="/workspaces" className="hover:text-cf-orange transition">Workspaces</Link>
            <span>/</span>
            <Link to={`/workspaces/${workspaceId}`} className="hover:text-cf-orange transition">Projects</Link>
            <span>/</span>
            <span className="text-cf-textDark">{project?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-cf-textDark mt-1">{project?.name} Task Board</h1>
        </div>

        <Button onClick={handleOpenCreate} size="sm" className="text-xs font-semibold">
          <Plus size={14} className="mr-1.5" /> Add Task
        </Button>
      </div>

      {/* Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const statusTasks = tasks.filter(t => t.status === status);
          return (
            <div
              key={status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className="bg-cf-bgLight border border-cf-border rounded p-4 flex flex-col min-h-[60vh] min-w-[250px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-cf-border flex-shrink-0">
                <span className="font-bold text-xs uppercase tracking-wider text-cf-textDark">{status.replace('_', ' ')}</span>
                <span className="text-[10px] bg-cf-navy text-white px-2 py-0.5 rounded-full font-mono">{statusTasks.length}</span>
              </div>

              {/* Task Cards Container */}
              <div className="flex-grow space-y-4">
                {statusTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white border border-cf-border rounded p-4 shadow-cf-card cursor-grab hover:shadow-md transition active:cursor-grabbing relative group"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-sm text-cf-textDark line-clamp-2 pr-6">{task.title}</h4>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition absolute right-2 top-2 bg-white pl-1 rounded">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-1 text-cf-textMuted hover:text-cf-orange transition"
                          title="Edit Task"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-cf-textMuted hover:text-red-600 transition"
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-cf-textMuted mt-2 line-clamp-3 leading-relaxed">
                      {task.description || 'No description provided.'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-cf-border flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        
                        <div className="flex items-center space-x-1 text-[10px] text-cf-textMuted">
                          <User size={12} className="text-cf-orange" />
                          <span className="text-[9px]">Assigned</span>
                        </div>
                      </div>

                      {task.deadline && (
                        <div className="text-[9px] text-cf-textMuted flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      )}

                      {/* Dropdown status switcher for touch/mobile devices */}
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
                            <option key={st} value={st}>{st.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
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

      {/* Task Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cf-navy/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="bg-cf-navy text-white">
              <h3 className="font-bold text-base">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <p className="text-[11px] text-gray-300">Fill in task parameters. Assignment is managed automatically.</p>
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
                    className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition duration-150"
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
                      className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition duration-150"
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
                      className="w-full px-3 py-2 text-sm text-cf-textDark bg-white border border-cf-border rounded focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange transition duration-150"
                    />
                  </div>
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
    </div>
  );
};

export default TaskBoard;
