import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { TaskColumn } from '../components/kanban/TaskColumn';
import { TaskCard } from '../components/kanban/TaskCard';
import type { Task } from '../components/kanban/TaskCard';
import { TaskDetailSlideOver } from '../components/kanban/TaskDetailSlideOver';

const INITIAL_TASKS: Task[] = [
    { id: 't1', title: 'Research competitors', status: 'TODO', priority: 'Medium', assignee: 'Alice' },
    { id: 't2', title: 'Design landing page', status: 'IN_PROGRESS', priority: 'High', assignee: 'Bob' },
    { id: 't3', title: 'Setup CI/CD pipeline', status: 'TODO', priority: 'High' },
    { id: 't4', title: 'Write unit tests', status: 'REVIEW', priority: 'Low', assignee: 'Charlie' },
    { id: 't5', title: 'Deploy to staging', status: 'DONE', priority: 'High', assignee: 'Alice' },
];

export const TaskBoard = () => {
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove || taskToMove.status === newStatus) return;

        // Pessimistic UI update: Set isUpdating to true before changing status
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isUpdating: true } : t));

        // Mock API Call delay
        await new Promise(res => setTimeout(res, 800));

        // Simulate network failure 20% of the time
        const shouldFail = Math.random() < 0.2;

        if (shouldFail) {
            toast.error("Failed to update task status (Server unreachable)");
            // Revert updating status
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isUpdating: false } : t));
        } else {
            // Finalize state: Move to new column and remove loading indicator
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: newStatus, isUpdating: false } : t
            ));
            toast.success("Task updated successfully");
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alpha Project</h1>
                    <p className="text-sm text-slate-500 mt-1">Sprint 12 Board</p>
                </div>
                <div className="flex -space-x-2">
                    {['Alice', 'Bob', 'Charlie'].map((name, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm z-10" style={{ zIndex: 10 - i }} title={name}>
                            {name.charAt(0)}
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-white hover:border-[#635BFF] hover:text-[#635BFF] cursor-pointer transition-colors z-0">
                        +
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 flex gap-6 snap-x snap-mandatory scroll-smooth">
                <TaskColumn title="To Do" status="TODO" onDrop={handleDrop}>
                    {tasks.filter(t => t.status === 'TODO').map(task => (
                        <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onClick={setSelectedTaskId} />
                    ))}
                </TaskColumn>
                <TaskColumn title="In Progress" status="IN_PROGRESS" onDrop={handleDrop}>
                    {tasks.filter(t => t.status === 'IN_PROGRESS').map(task => (
                        <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onClick={setSelectedTaskId} />
                    ))}
                </TaskColumn>
                <TaskColumn title="Review" status="REVIEW" onDrop={handleDrop}>
                    {tasks.filter(t => t.status === 'REVIEW').map(task => (
                        <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onClick={setSelectedTaskId} />
                    ))}
                </TaskColumn>
                <TaskColumn title="Done" status="DONE" onDrop={handleDrop}>
                    {tasks.filter(t => t.status === 'DONE').map(task => (
                        <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onClick={setSelectedTaskId} />
                    ))}
                </TaskColumn>
            </div>

            <TaskDetailSlideOver 
                taskId={selectedTaskId} 
                task={tasks.find(t => t.id === selectedTaskId)}
                onClose={() => setSelectedTaskId(null)} 
                onUpdateStatus={(id, newStatus) => {
                    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
                }}
            />
        </div>
    );
};
