import { Link } from 'react-router-dom';
import { CheckCircle2, MoveRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import heroAsset from '../../../assets/hero.png';

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

export const LandingHero = () => {
    return (
        <section className="relative overflow-hidden bg-[#f7fbff] pt-24">
            <div className="absolute inset-x-0 top-0 h-28 bg-white" />
            <div className="absolute right-0 top-24 hidden h-72 w-72 opacity-20 md:block">
                <img src={heroAsset} alt="" className="h-full w-full object-contain" />
            </div>

            <div className="relative mx-auto grid min-h-[calc(100vh-72px)] w-full max-w-7xl content-center gap-10 px-5 pb-16 pt-8 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
                <div className="flex flex-col justify-center">
                    <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-stripe-border bg-white px-3 py-1 text-xs font-semibold text-stripe-textLight shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-stripe-primary" />
                        Workspace, project, and task flow in one place
                    </div>
                    <h1 className="max-w-3xl text-5xl font-bold leading-[1.03] tracking-normal text-stripe-textDark md:text-6xl lg:text-7xl">
                        AgileTrack
                    </h1>
                    <p className="mt-5 max-w-xl text-lg leading-8 text-stripe-textLight">
                        A focused project workspace for teams that need clear boards, clean ownership, and fewer places for sprint work to disappear.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link to="/register">
                            <Button className="h-11 gap-2 px-5">
                                Create workspace
                                <MoveRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="secondary" className="h-11 px-5">Open dashboard</Button>
                        </Link>
                    </div>

                    <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                        {metrics.map(([value, label]) => (
                            <div key={label} className="border-l border-stripe-border pl-3">
                                <dt className="text-sm font-bold text-stripe-textDark">{value}</dt>
                                <dd className="mt-1 text-xs leading-5 text-stripe-textLight">{label}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="relative flex items-center">
                    <div className="w-full rounded-lg border border-stripe-border bg-white p-3 shadow-stripe-hover">
                        <div className="flex items-center justify-between border-b border-stripe-border px-2 pb-3">
                            <div>
                                <div className="text-xs font-semibold uppercase text-stripe-textLight">Backend API</div>
                                <div className="mt-1 text-lg font-bold text-stripe-textDark">Sprint board</div>
                            </div>
                            <div className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-stripe-primary">Active</div>
                        </div>
                        <div className="grid gap-3 pt-3 md:grid-cols-3">
                            {boardColumns.map(column => (
                                <div key={column.title} className="rounded-md border border-stripe-border bg-stripe-bg p-3">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase text-stripe-textDark">{column.title}</span>
                                        <span className="text-xs text-stripe-textLight">{column.tasks.length}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {column.tasks.map(([task, priority]) => (
                                            <div key={task} className="rounded-md border border-stripe-border bg-white p-3 shadow-sm">
                                                <div className="text-sm font-semibold text-stripe-textDark">{task}</div>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="text-xs text-stripe-textLight">{priority}</span>
                                                    <span className="h-2 w-2 rounded-full bg-stripe-primary" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
