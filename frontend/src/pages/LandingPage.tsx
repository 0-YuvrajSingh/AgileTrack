import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutDashboard, LockKeyhole, MoveRight, PanelsTopLeft, UsersRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import heroAsset from '../assets/hero.png';

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

export const LandingPage = () => {
    return (
        <div className="min-h-screen bg-stripe-bg font-sans text-stripe-textLight selection:bg-stripe-primary selection:text-white">
            <header className="fixed inset-x-0 top-0 z-30 border-b border-white/60 bg-white/85 backdrop-blur">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stripe-primary text-sm font-bold text-white shadow-stripe">
                            AT
                        </div>
                        <span className="text-base font-bold tracking-tight text-stripe-textDark">AgileTrack</span>
                    </Link>
                    <nav className="flex items-center gap-2">
                        <Link to="/login">
                            <Button variant="ghost" className="px-3">Sign in</Button>
                        </Link>
                        <Link to="/register">
                            <Button className="gap-2">
                                Get started
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <main>
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

                <section className="border-y border-stripe-border bg-white">
                    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-3 md:px-8">
                        <div>
                            <PanelsTopLeft className="mb-4 h-6 w-6 text-stripe-primary" />
                            <h2 className="text-base font-bold text-stripe-textDark">Workspaces stay separate</h2>
                            <p className="mt-2 text-sm leading-6">Members see only the workspaces they belong to, with owner-level controls kept out of the task board noise.</p>
                        </div>
                        <div>
                            <LayoutDashboard className="mb-4 h-6 w-6 text-stripe-primary" />
                            <h2 className="text-base font-bold text-stripe-textDark">Boards are the default view</h2>
                            <p className="mt-2 text-sm leading-6">Projects open directly into task status columns, so planning and execution live in the same surface.</p>
                        </div>
                        <div>
                            <UsersRound className="mb-4 h-6 w-6 text-stripe-primary" />
                            <h2 className="text-base font-bold text-stripe-textDark">Roles match the workflow</h2>
                            <p className="mt-2 text-sm leading-6">Owners manage settings, members move work, and viewers can follow progress without accidental edits.</p>
                        </div>
                    </div>
                </section>

                <section className="bg-stripe-bg">
                    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-stripe-primary">
                                <LockKeyhole className="h-4 w-4" />
                                Built around existing AgileTrack auth and workspace permissions
                            </div>
                            <h2 className="mt-3 text-2xl font-bold text-stripe-textDark">Start from your dashboard, not a blank canvas.</h2>
                        </div>
                        <Link to="/register">
                            <Button className="h-11 gap-2 px-5">
                                Get started
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};
