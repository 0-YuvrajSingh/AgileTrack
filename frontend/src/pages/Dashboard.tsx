import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

export const Dashboard = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-[400px] w-full" />
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-[400px] w-full" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
                <p className="text-sm text-slate-500 mt-1">Here's what's happening across your workspaces.</p>
            </div>

            {/* Top Row: Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500">Tasks Due Soon</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">12</p>
                </Card>
                <Card className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">3</p>
                </Card>
                <Card className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500">Completed this Week</p>
                    <p className="text-3xl font-bold text-[#635BFF] mt-2">28</p>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column (70%) */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">My Active Tasks</h2>
                    <Card className="p-0 overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-slate-900 text-sm">Design new landing page</span>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Alpha Project</span>
                                            <span className="text-red-500 font-medium flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> High Priority
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-500 font-medium">
                                        Tomorrow
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Side Column (30%) */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Activity</h2>
                    <Card>
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600 mt-0.5 shadow-sm">
                                        A
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-900"><span className="font-medium">Alice</span> moved <span className="font-medium">Backend Auth API</span> to Done</p>
                                        <p className="text-xs text-slate-500 mt-0.5">2 hours ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
