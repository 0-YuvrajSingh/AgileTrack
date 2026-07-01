import React from 'react';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

export interface Task {
    id: string;
    title: string;
    status: string;
    priority: 'High' | 'Medium' | 'Low';
    assignee?: string;
    isUpdating?: boolean;
}

interface TaskCardProps {
    task: Task;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
    onClick: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onClick }) => {
    return (
        <div 
            draggable={!task.isUpdating}
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={() => onClick(task.id)}
            className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing mb-3 hover:border-[#635BFF]/40 hover:shadow-md transition-all relative ${task.isUpdating ? 'opacity-60 cursor-wait' : ''}`}
        >
            <div className="flex justify-between items-start mb-2.5">
                <Badge variant={task.priority}>{task.priority}</Badge>
                {task.isUpdating && <Spinner className="h-4 w-4 text-[#635BFF]" />}
            </div>
            <h4 className="text-sm font-semibold text-slate-900 leading-tight mb-3 tracking-tight">{task.title}</h4>
            <div className="flex justify-end mt-auto">
                {task.assignee ? (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm" title={task.assignee}>
                        {task.assignee.charAt(0)}
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </div>
                )}
            </div>
        </div>
    );
};
