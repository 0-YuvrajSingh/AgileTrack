import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { projectService } from '../../project/services/projectService';
import { taskService } from '../services/taskService';
import { workspaceService } from '../../workspace/services/workspaceService';
import type { Task, TaskStatus, TaskPriority } from '../types/task.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { TaskColumn } from '../components/TaskColumn';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailSlideOver } from '../components/TaskDetailSlideOver';
import { useAuth } from '../../auth/hooks/useAuth';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

export const TaskBoardPage = () => {
    const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
    const navigate = useNavigate();

    const { data: project, isLoading: projLoading, error: projectError } = useQuery({
        queryKey: ['project', workspaceId, projectId],
        queryFn: () => projectService.getById(workspaceId!, projectId!),
        enabled: !!workspaceId && !!projectId
    });

    const { data: tasks, isLoading: taskLoading, error: tasksError } = useQuery({
        queryKey: ['tasks', workspaceId, projectId],
        queryFn: () => taskService.getByProjectId(workspaceId!, projectId!),
        enabled: !!workspaceId && !!projectId
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('MEDIUM');
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [newTaskAssigneeId, setNewTaskAssigneeId] = useState(user?.id || '');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const { data: members } = useQuery({
        queryKey: ['workspaceMembers', workspaceId],
        queryFn: () => workspaceService.getMembers(workspaceId!),
        enabled: !!workspaceId
    });

    const createMutation = useMutation({
        mutationFn: (payload: { title: string; description?: string; priority: TaskPriority; deadline?: string; assigneeId?: string | null }) => 
            taskService.create(workspaceId!, projectId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
            setIsModalOpen(false);
            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskPriority('MEDIUM');
            setNewTaskDeadline('');
            setNewTaskAssigneeId(user?.id || '');
            toast.success('Task created');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to create task'))
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: ({ taskId, status, position }: { taskId: string; status: TaskStatus, position?: number }) => 
            taskService.updateStatus(workspaceId!, projectId!, taskId, status, position),
        onMutate: async ({ taskId, status, position }) => {
            await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId, projectId] });
            const previousTasks = queryClient.getQueryData(['tasks', workspaceId, projectId]);
            
            queryClient.setQueryData(['tasks', workspaceId, projectId], (old: Task[] | undefined) => {
                if (!old) return old;
                return old.map(t => t.id === taskId ? { ...t, status, position: position ?? t.position } : t).sort((a, b) => (a.position || 0) - (b.position || 0));
            });
            
            return { previousTasks };
        },
        onError: (err, _variables, context) => {
            toast.error(parseApiError(err, 'Failed to update task status'));
            if (context?.previousTasks) {
                queryClient.setQueryData(['tasks', workspaceId, projectId], context.previousTasks);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
        }
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({ 
            title: newTaskTitle, 
            description: newTaskDesc,
            priority: newTaskPriority,
            deadline: newTaskDeadline || undefined,
            assigneeId: newTaskAssigneeId || null
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id as string;
        let newStatus = over.id as TaskStatus;
        let newPosition: number | undefined;

        const task = tasks?.find(t => t.id === taskId);
        if (!task) return;

        // If dropped over a task, calculate new status and position
        const overTask = tasks?.find(t => t.id === over.id);
        if (overTask) {
            newStatus = overTask.status;
            
            // Reorder logic: place after the hovered task
            // We need all tasks in the target status column, sorted by position
            const colTasks = tasks?.filter(t => t.status === newStatus).sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
            const overIndex = colTasks.findIndex(t => t.id === over.id);
            
            if (overIndex === -1) {
                newPosition = (overTask.position || 0) + 1000;
            } else if (overIndex === colTasks.length - 1) {
                newPosition = (overTask.position || 0) + 1000;
            } else {
                const nextTask = colTasks[overIndex + 1];
                newPosition = ((overTask.position || 0) + (nextTask.position || 0)) / 2;
            }
        } else {
            // Dropped on an empty column
            const colTasks = tasks?.filter(t => t.status === newStatus).sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
            if (colTasks.length > 0) {
                const lastTask = colTasks[colTasks.length - 1];
                newPosition = (lastTask.position || 0) + 1000;
            } else {
                newPosition = 1000;
            }
        }

        if (task.status === newStatus && Math.abs((task.position || 0) - (newPosition || 0)) < 0.1) {
            return;
        }

        // Trigger backend API (Optimistic update handled in onMutate)
        updateTaskStatusMutation.mutate({ taskId, status: newStatus, position: newPosition });
    };

    if (projLoading) return <div className="p-12 text-center text-gray-500">Loading project...</div>;
    if (projectError) return <div className="p-12 text-center text-red-500">{parseApiError(projectError, 'Failed to load project')}</div>;
    if (!project) return <div className="p-12 text-center text-gray-500">Project not found.</div>;

    const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
    const selectedTask = tasks?.find(task => task.id === selectedTaskId) ?? null;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <header className="px-8 py-5 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center shrink-0">
                <div>
                    <Button variant="ghost" onClick={() => navigate(-1)} className="mb-3 text-xs px-0 text-zinc-500 hover:text-zinc-50">
                        &larr; Back to Workspaces
                    </Button>
                    <h1 className="text-2xl font-bold text-zinc-50">{project.name}</h1>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>+ New Task</Button>
            </header>

            <main className="flex-1 overflow-x-auto p-8 relative">
                
                {taskLoading ? (
                    <div className="text-zinc-500 animate-pulse">Loading tasks...</div>
                ) : tasksError ? (
                    <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
                        {parseApiError(tasksError, 'Failed to load tasks')}
                    </div>
                ) : (
                    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                        <div className="flex gap-6 h-full items-start relative z-10">
                            {statuses.map(status => (
                                <TaskColumn key={status} status={status}>
                                    {tasks?.filter(t => t.status === status)
                                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                                        .map(task => (
                                        <TaskCard 
                                            key={task.id} 
                                            task={task} 
                                            onClick={() => setSelectedTaskId(task.id)} 
                                        />
                                    ))}
                                    {tasks?.filter(t => t.status === status).length === 0 && (
                                        <div className="text-center text-xs text-zinc-500 py-6 border-2 border-dashed border-zinc-800 rounded-lg bg-zinc-900/50">
                                            Drop tasks here
                                        </div>
                                    )}
                                </TaskColumn>
                            ))}
                        </div>
                    </DndContext>
                )}
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Task">
                <form onSubmit={handleCreate}>
                    <Input 
                        label="Task Title" 
                        value={newTaskTitle} 
                        onChange={e => setNewTaskTitle(e.target.value)} 
                        required 
                        autoFocus
                    />
                    <Input 
                        label="Description (optional)" 
                        value={newTaskDesc} 
                        onChange={e => setNewTaskDesc(e.target.value)} 
                    />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Priority</label>
                            <select
                                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 shadow-sm focus:border-orange-500 focus:ring-orange-500/20 sm:text-sm p-2.5 outline-none text-zinc-50 hover:border-zinc-700 transition-colors"
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Deadline</label>
                            <input
                                type="date"
                                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 shadow-sm focus:border-orange-500 focus:ring-orange-500/20 sm:text-sm p-2.5 outline-none text-zinc-50 hover:border-zinc-700 transition-colors"
                                value={newTaskDeadline}
                                onChange={(e) => setNewTaskDeadline(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-5">
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Assignee</label>
                        <select
                            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 shadow-sm focus:border-orange-500 focus:ring-orange-500/20 sm:text-sm p-2.5 outline-none text-zinc-50 hover:border-zinc-700 transition-colors"
                            value={newTaskAssigneeId}
                            onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                        >
                            <option value="">Unassigned</option>
                            {members?.map(member => (
                                <option key={member.userId} value={member.userId}>
                                    {member.email}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={createMutation.isPending}>Create Task</Button>
                    </div>
                </form>
            </Modal>

            <TaskDetailSlideOver 
                isOpen={!!selectedTask} 
                onClose={() => setSelectedTaskId(null)} 
                task={selectedTask} 
                workspaceId={workspaceId!} 
                projectId={projectId!} 
            />
        </div>
    );
};
