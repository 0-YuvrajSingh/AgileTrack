import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { workspaceService } from '../../workspace/services/workspaceService';
import type { Task, TaskPriority, TaskStatus, TaskUpdatePayload } from '../types/task.types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { parseApiError } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface TaskDetailSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    workspaceId: string;
    projectId: string;
}

export const TaskDetailSlideOver: React.FC<TaskDetailSlideOverProps> = ({
    isOpen,
    onClose,
    task,
    workspaceId,
    projectId
}) => {
    if (!isOpen || !task) return null;

    return (
        <TaskDetailSlideOverContent
            key={task.id}
            onClose={onClose}
            task={task}
            workspaceId={workspaceId}
            projectId={projectId}
        />
    );
};

const TaskDetailSlideOverContent: React.FC<Omit<TaskDetailSlideOverProps, 'isOpen' | 'task'> & { task: Task }> = ({
    onClose,
    task,
    workspaceId,
    projectId
}) => {
    const queryClient = useQueryClient();
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [editedDesc, setEditedDesc] = useState(task.description || '');
    const [editedPriority, setEditedPriority] = useState(task.priority);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const { data: members } = useQuery({
        queryKey: ['workspaceMembers', workspaceId],
        queryFn: () => workspaceService.getMembers(workspaceId),
        enabled: !!workspaceId
    });

    const updateMutation = useMutation({
        mutationFn: (payload: TaskUpdatePayload) =>
            taskService.update(workspaceId, projectId, task.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
            toast.success('Task updated');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to update task'))
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: TaskStatus) => taskService.updateStatus(workspaceId, projectId, task.id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
            toast.success('Status updated');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to update status'))
    });

    const deleteMutation = useMutation({
        mutationFn: () => taskService.delete(workspaceId, projectId, task.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
            toast.success('Task deleted');
            onClose();
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to delete task'))
    });

    const assignMutation = useMutation({
        mutationFn: (assigneeId: string) => taskService.assign(workspaceId, projectId, task.id, assigneeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId, projectId] });
            toast.success('Assignee updated');
        },
        onError: (err) => toast.error(parseApiError(err, 'Failed to update assignee'))
    });

    const handleSaveInfo = () => {
        updateMutation.mutate({
            title: editedTitle,
            description: editedDesc,
            priority: editedPriority,
            deadline: task.deadline,
            assigneeId: task.assigneeId
        });
        setIsEditingDesc(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-[slideInRight_0.2s_ease-out]">
                <header className="px-6 py-4 border-b border-stripe-border flex justify-between items-start">
                    <div>
                        <div className="text-xs font-semibold text-stripe-textLight mb-1">{task.status.replace('_', ' ')}</div>
                        <Input
                            className="text-xl font-bold text-stripe-textDark !px-2 !py-1 -ml-2 !border-transparent hover:!border-stripe-border focus:!border-stripe-primary focus:!bg-white bg-transparent shadow-none"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleSaveInfo}
                        />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -mr-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-24 text-stripe-textLight font-medium">Status</div>
                        <select
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-stripe-primary focus:ring-stripe-primary text-sm p-2 bg-gray-50 hover:bg-gray-100 transition-colors border outline-none"
                            value={task.status}
                            onChange={(e) => updateStatusMutation.mutate(e.target.value as TaskStatus)}
                            disabled={updateStatusMutation.isPending}
                        >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-24 text-stripe-textLight font-medium">Priority</div>
                        <select
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-stripe-primary focus:ring-stripe-primary text-sm p-2 bg-gray-50 hover:bg-gray-100 transition-colors border outline-none"
                            value={editedPriority}
                            onChange={(e) => {
                                const priority = e.target.value as TaskPriority;
                                setEditedPriority(priority);
                                updateMutation.mutate({
                                    title: editedTitle,
                                    description: editedDesc,
                                    priority,
                                    deadline: task.deadline,
                                    assigneeId: task.assigneeId
                                });
                            }}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-24 text-stripe-textLight font-medium">Assignee</div>
                        <select
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-stripe-primary focus:ring-stripe-primary text-sm p-2 bg-gray-50 hover:bg-gray-100 transition-colors border outline-none"
                            value={task.assigneeId || ''}
                            onChange={(e) => assignMutation.mutate(e.target.value)}
                            disabled={assignMutation.isPending}
                        >
                            <option value="">Unassigned</option>
                            {members?.map(member => (
                                <option key={member.userId} value={member.userId}>
                                    {member.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-stripe-border">
                        <h4 className="text-sm font-semibold text-stripe-textDark mb-3">Description</h4>
                        {isEditingDesc ? (
                            <div className="space-y-3">
                                <textarea
                                    className="w-full min-h-[150px] p-3 text-sm border border-stripe-border rounded-md focus:border-stripe-primary focus:ring-1 focus:ring-stripe-primary outline-none resize-y"
                                    value={editedDesc}
                                    onChange={(e) => setEditedDesc(e.target.value)}
                                    placeholder="Add a description..."
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveInfo} isLoading={updateMutation.isPending}>Save</Button>
                                    <Button variant="secondary" onClick={() => {
                                        setEditedDesc(task.description || '');
                                        setIsEditingDesc(false);
                                    }}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                className={`text-sm p-3 rounded-md min-h-[100px] cursor-text border border-transparent hover:border-stripe-border transition-colors ${!task.description ? 'text-gray-400 italic bg-gray-50' : 'text-stripe-textDark whitespace-pre-wrap'}`}
                                onClick={() => setIsEditingDesc(true)}
                            >
                                {task.description || 'Add a description...'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-stripe-border bg-gray-50 flex justify-end">
                    <Button 
                        variant="danger" 
                        isLoading={deleteMutation.isPending}
                        onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                        Delete Task
                    </Button>
                </div>
            </div>
            <ConfirmDialog
                isOpen={isDeleteConfirmOpen}
                title="Delete task"
                message="This task will be permanently removed from the board."
                confirmLabel="Delete"
                isDestructive
                isLoading={deleteMutation.isPending}
                onCancel={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => deleteMutation.mutate()}
            />
        </>
    );
};
