import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface Task {
    id: string;
    title: string;
    status: string;
    priority: 'High' | 'Medium' | 'Low';
    assignee?: string;
    isUpdating?: boolean;
}

interface TaskDetailSlideOverProps {
    taskId: string | null;
    task: Task | undefined;
    onClose: () => void;
    onUpdateStatus: (taskId: string, newStatus: string) => void;
}

export const TaskDetailSlideOver: React.FC<TaskDetailSlideOverProps> = ({ taskId, task, onClose, onUpdateStatus }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (taskId) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [taskId]);

    if (!taskId && !isVisible) return null;

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (taskId) {
            onUpdateStatus(taskId, e.target.value);
            toast.success(`Task moved to ${e.target.value}`);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${taskId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose} 
            />
            
            {/* Slide-over panel with premium timing function */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto flex flex-col border-l border-slate-200 ${taskId ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Task Details</span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="p-6 flex-1 space-y-8">
                    <input 
                        type="text" 
                        defaultValue={task?.title || "Design new landing page"} 
                        className="text-2xl font-bold text-slate-900 w-full outline-none border-b border-transparent focus:border-slate-200 pb-1 tracking-tight"
                    />
                    
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 w-24 font-medium">Status</span>
                            {/* Drag & drop fallback select */}
                            <select 
                                value={task?.status || "TODO"}
                                onChange={handleStatusChange}
                                className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] text-slate-700 font-medium cursor-pointer"
                            >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="REVIEW">Review</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 w-24 font-medium">Assignee</span>
                            <select className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] text-slate-700 font-medium cursor-pointer">
                                <option>Unassigned</option>
                                <option>Alice</option>
                                <option>Bob</option>
                                <option>Charlie</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <span className="text-sm font-semibold text-slate-900 block mb-3">Description</span>
                        <textarea 
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all resize-none text-slate-700"
                            placeholder="Add more details about this task..."
                            defaultValue="Stripe styled description logic goes here."
                        ></textarea>
                    </div>
                    
                    <div>
                        <span className="text-sm font-semibold text-slate-900 block mb-4">Activity</span>
                        <div className="space-y-4">
                            <div className="flex gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shadow-sm mt-0.5">A</div>
                                <div>
                                    <p className="text-slate-700"><span className="font-semibold text-slate-900">Alice</span> created this task</p>
                                    <p className="text-slate-400 text-xs mt-0.5">2 days ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto flex justify-end gap-3 sticky bottom-0">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={onClose}>Save Changes</Button>
                </div>
            </div>
        </>
    );
};
