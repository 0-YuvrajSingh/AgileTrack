import { Link } from 'react-router-dom';
import { MoveRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { motion } from 'framer-motion';

const boardColumns = [
    {
        title: 'To do',
        tasks: [
            ['Workspace roles', 'High'],
            ['Invite copy review', 'Medium']
        ]
    },
    {
        title: 'In progress',
        tasks: [
            ['Kanban ordering', 'High'],
            ['Project settings', 'Medium']
        ]
    },
    {
        title: 'Done',
        tasks: [
            ['Auth flow', 'High'],
            ['Workspace list', 'Medium']
        ]
    }
];

const metrics = [
    ['3', 'task stages'],
    ['Role-based', 'workspace access'],
    ['Fast', 'project boards']
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

export const LandingHero = () => {
    return (
        <section className="relative overflow-hidden pt-24 min-h-[calc(100vh-72px)] flex items-center bg-zinc-950">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />

            <div className="relative mx-auto grid w-full max-w-7xl content-center gap-10 px-5 pb-16 pt-8 md:px-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
                <motion.div 
                    className="flex flex-col justify-center"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants} className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-sm font-medium text-zinc-400 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                        A new era of project management
                    </motion.div>
                    
                    <motion.h1 variants={itemVariants} className="max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight text-zinc-50 md:text-6xl lg:text-7xl">
                        Build faster with <span className="text-orange-500">AgileTrack</span>
                    </motion.h1>
                    
                    <motion.p variants={itemVariants} className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
                        A focused project workspace for teams that need clear boards, clean ownership, and fewer places for sprint work to disappear.
                    </motion.p>
                    
                    <motion.div variants={itemVariants} className="mt-10 flex flex-col gap-4 sm:flex-row">
                        <Link to="/register">
                            <Button className="h-12 w-full sm:w-auto gap-2 px-8 text-base">
                                Create workspace
                                <MoveRight className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="ghost" className="h-12 w-full sm:w-auto px-8 text-base">Open dashboard</Button>
                        </Link>
                    </motion.div>

                    <motion.dl variants={itemVariants} className="mt-14 grid max-w-xl grid-cols-3 gap-6 pt-10 border-t border-zinc-800">
                        {metrics.map(([value, label]) => (
                            <div key={label}>
                                <dt className="text-2xl font-bold text-zinc-50">{value}</dt>
                                <dd className="mt-1 text-sm font-medium text-zinc-400">{label}</dd>
                            </div>
                        ))}
                    </motion.dl>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
                    className="relative flex items-center"
                >
                    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 px-3 pb-4">
                            <div className="flex gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                                <div className="h-3 w-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="rounded-md bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 border border-orange-500/20">Active Sprint</div>
                        </div>
                        <div className="grid gap-4 pt-4 md:grid-cols-3">
                            {boardColumns.map(column => (
                                <div key={column.title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                                    <div className="mb-4 flex items-center justify-between px-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{column.title}</span>
                                        <span className="text-xs font-medium text-zinc-500">{column.tasks.length}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {column.tasks.map(([task, priority], idx) => (
                                            <motion.div 
                                                key={task} 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 + (idx * 0.1) }}
                                                className="rounded-md border border-zinc-700 bg-zinc-950 p-3 shadow-sm hover:border-orange-500/50 transition-colors"
                                            >
                                                <div className="text-sm font-medium text-zinc-100">{task}</div>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${priority === 'High' ? 'bg-red-950 text-red-400' : 'bg-yellow-950 text-yellow-400'}`}>{priority}</span>
                                                    <span className="h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-400">U</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
