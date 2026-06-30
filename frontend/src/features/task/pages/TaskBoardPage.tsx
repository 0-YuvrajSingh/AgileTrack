import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCorners } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { projectService } from '../../project/services/projectService';
import { taskService } from '../services/taskService';
import { workspaceService } from '../../workspace/services/workspaceService';
import type { Task } from '../services/taskService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { TaskColumn } from '../components/TaskColumn';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailSlideOver } from '../components/TaskDetailSlideOver';
import { useAuth } from '../../auth/hooks/useAuth';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

export const TaskBoardPage = () => {
    const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
    const navigate = useNavigate();

    const { data: project, isLoading: projLoading } = useQuery({
        queryKey: ['project', workspaceId, projectId],
        queryFn: () => projectService.getById(workspaceId!, projectId!),
        enabled: !!workspaceId && !!projectId
    });

    const { data: tasks, isLoading: taskLoading } = useQuery({
        queryKey: ['tasks', workspaceId, projectId],
        queryFn: () => taskService.getByProjectId(workspaceId!, projectId!),
        enabled: !!workspaceId && !!projectId
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [newTaskAssigneeId, setNewTaskAssigneeId] = useState(user?.id || '');

    const { data: members } = useQuery({
        queryKey: ['workspaceMembers', workspaceId],
        queryFn: () => workspaceService.getMembers(workspaceId!),
        enabled: !!workspaceId
    });

    const createMutation = useMutation({
        mutationFn: (payload: { title: string; description?: string; priority: string; assigneeId: string }) => 
            taskService.create(workspaceId!, projectId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
            setIsModalOpen(false);
            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskAssigneeId(user?.id || '');
            toast.success('Task created');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to create task'))
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: ({ taskId, status, position }: { taskId: string; status: string, position?: number }) => 
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
        onError: (err, newTodo, context) => {
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
        if (!user?.id) {
            toast.error('You must be logged in to create a task');
            return;
        }
        createMutation.mutate({ 
            title: newTaskTitle, 
            description: newTaskDesc,
            priority: 'MEDIUM',
            assigneeId: newTaskAssigneeId
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id as string;
        let newStatus = over.id as string;
        let newPosition: number | undefined = undefined;

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

    if (projLoading) return <div className="p-12 text-center text-stripe-textLight">Loading project...</div>;
    if (!project) return <div className="p-12 text-center text-stripe-textLight">Project not found.</div>;

    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];

    return (
        <div className="flex flex-col h-screen bg-stripe-bg">
            <header className="px-6 py-4 bg-white border-b border-stripe-border flex justify-between items-center shrink-0">
                <div>
                    <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 text-xs px-0">
                        &larr; Back
                    </Button>
                    <h1 className="text-xl font-bold text-stripe-textDark">{project.name} Board</h1>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>+ New Task</Button>
            </header>

            <main className="flex-1 overflow-x-auto p-6">
                {taskLoading ? (
                    <div className="text-stripe-textLight">Loading tasks...</div>
                ) : (
                    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                        <div className="flex gap-6 h-full items-start">
                            {statuses.map(status => (
                                <TaskColumn key={status} status={status}>
                                    {tasks?.filter(t => t.status === status)
                                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                                        .map(task => (
                                        <TaskCard 
                                            key={task.id} 
                                            task={task} 
                                            onClick={() => setSelectedTask(task)} 
                                        />
                                    ))}
                                    {tasks?.filter(t => t.status === status).length === 0 && (
                                        <div className="text-center text-xs text-gray-400 py-4 border-2 border-dashed border-gray-200 rounded-md">
                                            Drop tasks here
                                        </div>
                                    )}
                                </TaskColumn>
                            ))}
                        </div>
                    </DndContext>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-stripe-hover animate-[fadeIn_0.2s_ease-out]">
                        <h2 className="text-xl font-bold mb-4 text-stripe-textDark">Create Task</h2>
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
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                                <select
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-stripe-primary focus:ring-stripe-primary sm:text-sm p-2 border outline-none bg-gray-50 hover:bg-gray-100 transition-colors"
                                    value={newTaskAssigneeId}
                                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                                >
                                    <option value="">Select Assignee</option>
                                    {members?.map(member => (
                                        <option key={member.userId} value={member.userId}>
                                            {member.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <TaskDetailSlideOver 
                isOpen={!!selectedTask} 
                onClose={() => setSelectedTask(null)} 
                task={selectedTask} 
                workspaceId={workspaceId!} 
                projectId={projectId!} 
            />
        </div>
    );
};
