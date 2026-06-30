import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  Clock3,
  Filter,
  Flag,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TableProperties,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type ComponentPropsWithoutRef, type ReactNode, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Slot } from '@radix-ui/react-slot';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

type Status = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

type User = {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  color: string;
  status: 'Active' | 'Inactive';
};

type Project = {
  id: string;
  name: string;
  key: string;
  owner: string;
  health: 'On track' | 'At risk' | 'Blocked';
  progress: number;
  due: string;
  tasks: number;
  members: string[];
};

type Task = {
  id: string;
  key: string;
  title: string;
  description: string;
  project: string;
  status: Status;
  priority: Priority;
  assigneeId: string;
  due: string;
  labels: string[];
  comments: number;
  attachments: number;
  estimate: number;
};

const statusOrder: Status[] = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
const priorityRank: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const users: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'Product Lead', email: 'maya@agiletrack.app', initials: 'MC', color: '#2563eb', status: 'Active' },
  { id: 'u2', name: 'Arjun Mehta', role: 'Engineering Manager', email: 'arjun@agiletrack.app', initials: 'AM', color: '#0f766e', status: 'Active' },
  { id: 'u3', name: 'Sofia Rivera', role: 'Frontend Engineer', email: 'sofia@agiletrack.app', initials: 'SR', color: '#7c3aed', status: 'Active' },
  { id: 'u4', name: 'Liam Brooks', role: 'QA Analyst', email: 'liam@agiletrack.app', initials: 'LB', color: '#b45309', status: 'Active' },
  { id: 'u5', name: 'Nora Patel', role: 'Designer', email: 'nora@agiletrack.app', initials: 'NP', color: '#be123c', status: 'Inactive' },
];

const projects: Project[] = [
  { id: 'p1', name: 'Sprint Operations', key: 'OPS', owner: 'Maya Chen', health: 'On track', progress: 74, due: 'Jul 12', tasks: 42, members: ['u1', 'u2', 'u3'] },
  { id: 'p2', name: 'Client Portal', key: 'CP', owner: 'Arjun Mehta', health: 'At risk', progress: 51, due: 'Jul 24', tasks: 35, members: ['u2', 'u3', 'u4'] },
  { id: 'p3', name: 'Automation Rules', key: 'AUTO', owner: 'Sofia Rivera', health: 'Blocked', progress: 29, due: 'Aug 02', tasks: 18, members: ['u1', 'u3', 'u5'] },
  { id: 'p4', name: 'Insights Dashboard', key: 'DATA', owner: 'Maya Chen', health: 'On track', progress: 86, due: 'Jul 30', tasks: 27, members: ['u1', 'u4', 'u5'] },
];

const initialTasks: Task[] = [
  { id: 't1', key: 'OPS-142', title: 'Refine workspace invitation flow', description: 'Tighten permissions, role copy, and invite success feedback for workspace admins.', project: 'Sprint Operations', status: 'In Progress', priority: 'High', assigneeId: 'u3', due: 'Jul 03', labels: ['Workspace', 'UX'], comments: 5, attachments: 2, estimate: 8 },
  { id: 't2', key: 'OPS-151', title: 'Add audit trail to task status changes', description: 'Persist status changes and expose activity entries in the task drawer.', project: 'Sprint Operations', status: 'Review', priority: 'Critical', assigneeId: 'u2', due: 'Jul 01', labels: ['Security'], comments: 8, attachments: 1, estimate: 13 },
  { id: 't3', key: 'CP-88', title: 'Create client-facing project overview', description: 'Compact project health summary for external client stakeholders.', project: 'Client Portal', status: 'To Do', priority: 'Medium', assigneeId: 'u1', due: 'Jul 09', labels: ['Portal'], comments: 2, attachments: 0, estimate: 5 },
  { id: 't4', key: 'AUTO-23', title: 'Rules engine condition builder', description: 'Build the first version of a condition builder for automation rules.', project: 'Automation Rules', status: 'Backlog', priority: 'High', assigneeId: 'u3', due: 'Aug 04', labels: ['Automation'], comments: 1, attachments: 3, estimate: 21 },
  { id: 't5', key: 'DATA-61', title: 'Workload distribution chart', description: 'Show active task load by assignee and priority for sprint planning.', project: 'Insights Dashboard', status: 'Done', priority: 'Low', assigneeId: 'u4', due: 'Jun 28', labels: ['Analytics'], comments: 4, attachments: 0, estimate: 3 },
  { id: 't6', key: 'OPS-166', title: 'Keyboard shortcuts for board actions', description: 'Support create, assign, transition, and open details shortcuts.', project: 'Sprint Operations', status: 'Backlog', priority: 'Medium', assigneeId: 'u5', due: 'Jul 18', labels: ['Productivity'], comments: 3, attachments: 1, estimate: 8 },
  { id: 't7', key: 'CP-103', title: 'Harden file upload validation', description: 'Add size, extension, and malware scan handoff states.', project: 'Client Portal', status: 'In Progress', priority: 'Critical', assigneeId: 'u2', due: 'Jul 05', labels: ['Security', 'Files'], comments: 6, attachments: 4, estimate: 13 },
  { id: 't8', key: 'DATA-72', title: 'Milestone burndown widget', description: 'Add compact trend widget for milestone progress on the analytics page.', project: 'Insights Dashboard', status: 'Review', priority: 'High', assigneeId: 'u1', due: 'Jul 07', labels: ['Charts'], comments: 7, attachments: 2, estimate: 8 },
  { id: 't9', key: 'AUTO-31', title: 'Notification preference model', description: 'Normalize notification settings across email, app, and digest channels.', project: 'Automation Rules', status: 'To Do', priority: 'Medium', assigneeId: 'u4', due: 'Jul 16', labels: ['Settings'], comments: 2, attachments: 0, estimate: 5 },
];

const activityItems = [
  'Maya moved OPS-151 into Review',
  'Arjun invited Priya Shah to Sprint Operations',
  'Sofia attached API contract notes to CP-103',
  'Liam completed DATA-61 after QA sign-off',
];

const trendData = [
  { name: 'Mon', completed: 7, created: 10 },
  { name: 'Tue', completed: 11, created: 9 },
  { name: 'Wed', completed: 8, created: 12 },
  { name: 'Thu', completed: 14, created: 11 },
  { name: 'Fri', completed: 16, created: 10 },
];

const buttonStyles = cva('button', {
  variants: {
    variant: {
      primary: 'button-primary',
      secondary: 'button-secondary',
      ghost: 'button-ghost',
      danger: 'button-danger',
    },
    size: {
      sm: 'button-sm',
      md: 'button-md',
      icon: 'button-icon',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
  },
});

type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonStyles> & {
    asChild?: boolean;
  };

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function Button({ asChild, className, variant, size, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('card', className)}>{children}</section>;
}

function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={cn('avatar', `avatar-${size}`)} style={{ backgroundColor: user.color }} title={user.name}>
      {user.initials}
    </span>
  );
}

function StatusChip({ status }: { status: Status | Project['health'] | User['status'] }) {
  return <span className={cn('chip', `chip-${status.toLowerCase().replaceAll(' ', '-')}`)}>{status}</span>;
}

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span className={cn('priority', `priority-${priority.toLowerCase()}`)}>
      <Flag size={12} />
      {priority}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" aria-label={`${value}% complete`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function EmptyState({ title, detail, icon }: { title: string; detail: string; icon: ReactNode }) {
  return (
    <div className="empty-state">
      {icon}
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>('t1');
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;

  const updateTaskStatus = (taskId: string, status: Status) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthScreen mode="login" />} />
        <Route path="/register" element={<AuthScreen mode="register" />} />
        <Route
          path="/*"
          element={
            <Shell>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard tasks={tasks} onOpenTask={setActiveTaskId} />} />
                <Route path="/projects" element={<ProjectsPage tasks={tasks} />} />
                <Route path="/boards" element={<BoardPage tasks={tasks} onOpenTask={setActiveTaskId} onStatusChange={updateTaskStatus} />} />
                <Route path="/tasks" element={<TasksPage tasks={tasks} onOpenTask={setActiveTaskId} />} />
                <Route path="/calendar" element={<CalendarPage tasks={tasks} onOpenTask={setActiveTaskId} />} />
                <Route path="/analytics" element={<AnalyticsPage tasks={tasks} />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
              <TaskDrawer task={activeTask} onClose={() => setActiveTaskId(null)} />
            </Shell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<{ name?: string; email: string; password: string }>();
  const isRegister = mode === 'register';

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark">
          <BriefcaseBusiness size={24} />
          <span>AgileTrack</span>
        </div>
        <h1>{isRegister ? 'Create your workspace account' : 'Sign in to your workspace'}</h1>
        <p>Plan sprints, manage delivery risk, and keep every task moving through one focused operations console.</p>
        <form className="auth-form" onSubmit={handleSubmit(() => navigate('/dashboard'))}>
          {isRegister && <Input label="Full name" placeholder="Maya Chen" {...register('name', { required: true })} />}
          <Input label="Email" type="email" placeholder="you@company.com" {...register('email', { required: true })} />
          <Input label="Password" type="password" placeholder="Enter your password" {...register('password', { required: true })} />
          <div className="auth-row">
            <label>
              <input type="checkbox" />
              Remember me
            </label>
            {!isRegister && <a href="#forgot">Forgot password?</a>}
          </div>
          <Button type="submit" variant="primary">
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
          <Button type="button" variant="secondary">
            <Sparkles size={16} />
            Continue with Google
          </Button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to AgileTrack?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link>
        </p>
      </section>
      <aside className="auth-aside">
        <StatusChip status="On track" />
        <h2>Enterprise sprint execution without the noise.</h2>
        <div className="auth-metric-grid">
          <Metric label="Tasks closed" value="1,284" />
          <Metric label="Cycle time" value="2.8d" />
          <Metric label="On-time delivery" value="94%" />
        </div>
      </aside>
    </main>
  );
}

function Input({ label, className, ...props }: ComponentPropsWithoutRef<'input'> & { label?: string }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input className={cn('input', className)} {...props} />
    </label>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: BriefcaseBusiness },
    { path: '/boards', label: 'Boards', icon: KanbanSquare },
    { path: '/tasks', label: 'My Tasks', icon: ListChecks },
    { path: '/calendar', label: 'Calendar', icon: CalendarDays },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/team', label: 'Team', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="app-shell">
      <aside className={cn('sidebar', collapsed && 'sidebar-collapsed', mobileOpen && 'sidebar-open')}>
        <div className="workspace-switcher">
          <div className="workspace-logo">AT</div>
          {!collapsed && (
            <div>
              <strong>AgileTrack Cloud</strong>
              <span>Product Operations</span>
            </div>
          )}
          {!collapsed && <ChevronDown size={16} />}
        </div>
        <nav>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} className={cn('nav-link', active && 'active')} to={item.path} onClick={() => setMobileOpen(false)}>
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Avatar user={users[0]} />
          {!collapsed && (
            <div>
              <strong>Maya Chen</strong>
              <span>Workspace admin</span>
            </div>
          )}
          {!collapsed && <LogOut size={16} />}
        </div>
      </aside>
      <div className="content-frame">
        <header className="topbar">
          <Button size="icon" variant="ghost" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={18} />
          </Button>
          <Button size="icon" variant="ghost" className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="Collapse sidebar">
            <ChevronsLeft size={18} />
          </Button>
          <div className="global-search">
            <Search size={16} />
            <input placeholder="Search tasks, projects, teams..." />
          </div>
          <div className="topbar-actions">
            <select aria-label="Current project">
              <option>Sprint Operations</option>
              <option>Client Portal</option>
              <option>Automation Rules</option>
            </select>
            <Button variant="primary" size="sm">
              <Plus size={16} />
              Create
            </Button>
            <Button size="icon" variant="ghost" aria-label="Notifications">
              <Bell size={18} />
            </Button>
            <Avatar user={users[0]} />
          </div>
        </header>
        <main>{children}</main>
      </div>
      {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}

function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}

function FilterBar({ placeholder = 'Search' }: { placeholder?: string }) {
  return (
    <div className="filter-bar">
      <div className="search-field">
        <Search size={15} />
        <input placeholder={placeholder} />
      </div>
      <Button size="sm">
        <Filter size={15} />
        Filters
      </Button>
      <Button size="sm">
        <SlidersHorizontal size={15} />
        Sort
      </Button>
    </div>
  );
}

function Dashboard({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (id: string) => void }) {
  const overdue = tasks.filter((task) => priorityRank[task.priority] >= 3 && task.status !== 'Done').length;
  const done = tasks.filter((task) => task.status === 'Done').length;
  const inFlight = tasks.filter((task) => task.status === 'In Progress' || task.status === 'Review').length;

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Dashboard"
        title="Good morning, Maya"
        actions={
          <>
            <Button size="sm">Export</Button>
            <Button size="sm" variant="primary">
              <Plus size={16} />
              New task
            </Button>
          </>
        }
      />
      <div className="stats-grid">
        <StatCard label="Open tasks" value={String(tasks.length - done)} detail="+6 from last sprint" icon={<ListChecks />} />
        <StatCard label="In flight" value={String(inFlight)} detail="Across 4 projects" icon={<Clock3 />} />
        <StatCard label="High risk" value={String(overdue)} detail="Needs triage today" icon={<AlertTriangle />} tone="warning" />
        <StatCard label="Completed" value={String(done)} detail="This week" icon={<CheckCircle2 />} tone="success" />
      </div>
      <div className="dashboard-grid">
        <Card className="wide-card">
          <SectionTitle title="Project Progress" action="View all" />
          <div className="project-stack">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Completion Trend" />
          <ChartBox>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip />
                <Line type="monotone" dataKey="completed" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="created" stroke="#64748b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
        <Card>
          <SectionTitle title="Assigned Tasks" action="Open list" />
          <div className="task-list-compact">
            {tasks.slice(0, 5).map((task) => (
              <button key={task.id} className="compact-task" onClick={() => onOpenTask(task.id)}>
                <span>{task.key}</span>
                <strong>{task.title}</strong>
                <StatusChip status={task.status} />
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Recent Activity" />
          <div className="activity-list">
            {activityItems.map((item) => (
              <ActivityItem key={item} text={item} />
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone?: 'success' | 'warning' }) {
  return (
    <Card className={cn('stat-card', tone && `stat-${tone}`)}>
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Card>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && <button>{action}</button>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <div className="project-row">
      <div>
        <strong>{project.name}</strong>
        <span>{project.key} · {project.tasks} tasks · due {project.due}</span>
      </div>
      <StatusChip status={project.health} />
      <ProgressBar value={project.progress} />
      <AvatarStack ids={project.members} />
    </div>
  );
}

function AvatarStack({ ids }: { ids: string[] }) {
  return (
    <div className="avatar-stack">
      {ids.map((id) => {
        const user = users.find((item) => item.id === id) ?? users[0];
        return <Avatar key={id} user={user} size="sm" />;
      })}
    </div>
  );
}

function ActivityItem({ text }: { text: string }) {
  return (
    <div className="activity-item">
      <span>
        <Activity size={14} />
      </span>
      <div>
        <strong>{text}</strong>
        <small>18 minutes ago</small>
      </div>
    </div>
  );
}

function ProjectsPage({ tasks }: { tasks: Task[] }) {
  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Projects" title="Project portfolio" actions={<Button variant="primary" size="sm"><Plus size={16} />Project</Button>} />
      <FilterBar placeholder="Search projects" />
      <div className="project-card-grid">
        {projects.map((project) => (
          <Card key={project.id} className="project-card">
            <div className="project-card-head">
              <div>
                <span>{project.key}</span>
                <h2>{project.name}</h2>
              </div>
              <StatusChip status={project.health} />
            </div>
            <p>{tasks.filter((task) => task.project === project.name && task.status !== 'Done').length} active tasks owned by {project.owner}.</p>
            <ProgressBar value={project.progress} />
            <div className="project-card-foot">
              <AvatarStack ids={project.members} />
              <span>Due {project.due}</span>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function BoardPage({ tasks, onOpenTask, onStatusChange }: { tasks: Task[]; onOpenTask: (id: string) => void; onStatusChange: (taskId: string, status: Status) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const status = event.over?.id as Status | undefined;
    if (status && statusOrder.includes(status)) {
      onStatusChange(taskId, status);
    }
  };

  return (
    <motion.div className="page board-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Boards" title="Sprint Operations board" actions={<Button variant="primary" size="sm"><Plus size={16} />Task</Button>} />
      <FilterBar placeholder="Filter board tasks" />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kanban">
          {statusOrder.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <BoardColumn key={status} status={status} tasks={columnTasks} onOpenTask={onOpenTask} />
            );
          })}
        </div>
      </DndContext>
    </motion.div>
  );
}

function BoardColumn({ status, tasks, onOpenTask }: { status: Status; tasks: Task[]; onOpenTask: (id: string) => void }) {
  const { setNodeRef } = useSortable({ id: status });
  return (
    <section className="kanban-column" ref={setNodeRef}>
      <header>
        <div>
          <strong>{status}</strong>
          <span>{tasks.length}</span>
        </div>
        <Button size="icon" variant="ghost" aria-label={`Add ${status} task`}>
          <Plus size={16} />
        </Button>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="column-stack">
          {tasks.length === 0 && <EmptyState title="No tasks" detail="Drop work here when ready." icon={<Inbox size={18} />} />}
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpenTask={onOpenTask} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTaskCard({ task, onOpenTask }: { task: Task; onOpenTask: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const assignee = users.find((user) => user.id === task.assigneeId) ?? users[0];
  return (
    <article
      ref={setNodeRef}
      className={cn('task-card', isDragging && 'dragging')}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpenTask(task.id)}
    >
      <div className="task-card-top">
        <span>{task.key}</span>
        <button aria-label="Task actions">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <h3>{task.title}</h3>
      <div className="label-row">
        {task.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="task-card-meta">
        <PriorityChip priority={task.priority} />
        <span>
          <Clock3 size={13} />
          {task.due}
        </span>
        <Avatar user={assignee} size="sm" />
      </div>
    </article>
  );
}

function TasksPage({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (id: string) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnHelper = createColumnHelper<Task>();
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        cell: () => <input type="checkbox" aria-label="Select row" />,
        header: () => <input type="checkbox" aria-label="Select all" />,
      }),
      columnHelper.accessor('key', { header: 'Key', cell: (info) => <strong>{info.getValue()}</strong> }),
      columnHelper.accessor('title', { header: 'Summary' }),
      columnHelper.accessor('status', { header: 'Status', cell: (info) => <StatusChip status={info.getValue()} /> }),
      columnHelper.accessor('priority', { header: 'Priority', cell: (info) => <PriorityChip priority={info.getValue()} /> }),
      columnHelper.accessor('assigneeId', {
        header: 'Assignee',
        cell: (info) => {
          const user = users.find((item) => item.id === info.getValue()) ?? users[0];
          return <span className="assignee-cell"><Avatar user={user} size="sm" />{user.name}</span>;
        },
      }),
      columnHelper.accessor('due', { header: 'Due date' }),
    ],
    [columnHelper],
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="My Tasks" title="Issue list" actions={<Button size="sm"><TableProperties size={16} />Columns</Button>} />
      <FilterBar placeholder="Search issues" />
      <Card className="table-card">
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onOpenTask(row.original.id)}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <Button size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </Card>
    </motion.div>
  );
}

function CalendarPage({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (id: string) => void }) {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Calendar" title="Delivery calendar" actions={<div className="segmented"><button className="active">Month</button><button>Week</button></div>} />
      <div className="calendar-grid">
        {days.map((day) => {
          const dayTasks = tasks.filter((task) => Number(task.due.replace(/\D/g, '')) % 35 === day % 35).slice(0, 2);
          return (
            <div key={day} className="calendar-day">
              <strong>{day}</strong>
              {dayTasks.map((task) => (
                <button key={task.id} className={cn('calendar-task', `calendar-${task.priority.toLowerCase()}`)} onClick={() => onOpenTask(task.id)}>
                  {task.key}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function AnalyticsPage({ tasks }: { tasks: Task[] }) {
  const statusData = statusOrder.map((status) => ({ name: status, value: tasks.filter((task) => task.status === status).length }));
  const workload = users.map((user) => ({ name: user.initials, tasks: tasks.filter((task) => task.assigneeId === user.id).length }));
  const pieColors = ['#94a3b8', '#2563eb', '#f59e0b', '#8b5cf6', '#16a34a'];

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Analytics" title="Delivery intelligence" actions={<Button size="sm">Download report</Button>} />
      <div className="analytics-grid">
        <Card>
          <SectionTitle title="Task Completion" />
          <ChartBox>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip />
                <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
        <Card>
          <SectionTitle title="Status Breakdown" />
          <ChartBox>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88}>
                  {statusData.map((entry, index) => <Cell key={entry.name} fill={pieColors[index]} />)}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
        <Card>
          <SectionTitle title="Workload Distribution" />
          <ChartBox>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={workload}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <ChartTooltip />
                <Bar dataKey="tasks" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
        <Card>
          <SectionTitle title="Milestone Health" />
          <div className="milestone-list">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function TeamPage() {
  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Team" title="Workspace members" actions={<Button variant="primary" size="sm"><Plus size={16} />Invite</Button>} />
      <FilterBar placeholder="Search members" />
      <Card className="member-list">
        {users.map((user) => (
          <div key={user.id} className="member-row">
            <Avatar user={user} />
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <span>{user.role}</span>
            <StatusChip status={user.status} />
            <Button size="icon" variant="ghost" aria-label={`Manage ${user.name}`}>
              <MoreHorizontal size={16} />
            </Button>
          </div>
        ))}
      </Card>
    </motion.div>
  );
}

function SettingsPage() {
  const settingItems: Array<{ title: string; detail: string; icon: LucideIcon }> = [
    { title: 'Profile', detail: 'Name, avatar, contact preferences', icon: Users },
    { title: 'Workspace', detail: 'Project defaults and issue keys', icon: BriefcaseBusiness },
    { title: 'Notifications', detail: 'Email, in-app, and digest rules', icon: Bell },
    { title: 'Security', detail: 'Password, sessions, and SSO policies', icon: Lock },
    { title: 'Permissions', detail: 'Roles, access groups, audit controls', icon: ShieldCheck },
  ];

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Settings" title="Workspace settings" />
      <div className="settings-grid">
        {settingItems.map(({ title, detail, icon: Icon }) => (
          <Card key={title} className="settings-card">
            <Icon size={20} />
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
            <Button size="sm">Configure</Button>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function TaskDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const assignee = task ? users.find((user) => user.id === task.assigneeId) ?? users[0] : users[0];
  return (
    <div className={cn('drawer-shell', task && 'open')} aria-hidden={!task}>
      {task && (
        <aside className="task-drawer">
          <header>
            <div>
              <span>{task.key}</span>
              <h2>{task.title}</h2>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close task details">
              <X size={18} />
            </Button>
          </header>
          <p>{task.description}</p>
          <div className="drawer-fields">
            <Field label="Status"><StatusChip status={task.status} /></Field>
            <Field label="Priority"><PriorityChip priority={task.priority} /></Field>
            <Field label="Assignee"><span className="assignee-cell"><Avatar user={assignee} size="sm" />{assignee.name}</span></Field>
            <Field label="Due date">{task.due}</Field>
            <Field label="Labels"><div className="label-row">{task.labels.map((label) => <span key={label}>{label}</span>)}</div></Field>
          </div>
          <div className="drawer-actions">
            <Button variant="primary">Edit task</Button>
            <Button variant="danger">Delete</Button>
          </div>
          <SectionTitle title="Activity" />
          <div className="activity-list">
            <ActivityItem text={`${assignee.name} updated ${task.status.toLowerCase()} status`} />
            <ActivityItem text={`${task.comments} comments and ${task.attachments} attachments linked`} />
          </div>
          <SectionTitle title="Comments" />
          <div className="comment-box">
            <MessageSquare size={16} />
            <input placeholder="Add a focused update..." />
          </div>
          <div className="attachment-line">
            <Paperclip size={15} />
            {task.attachments} attachments
          </div>
        </aside>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="drawer-field">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function ChartBox({ children }: { children: ReactNode }) {
  return <div className="chart-box">{children}</div>;
}

export default App;
