import {
    ArrowUpRight,
    CheckCircle2,
    Clock,
    FileText,
    FolderKanban,
    Timer,
    TrendingUp
} from 'lucide-react';
import { Link } from 'react-router';
import { DemoBanner } from '../components/DemoBanner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { sprints, projects, activities, stories } = useAppStore();

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const currentSprints = sprints.filter((s) => s.status === 'ACTIVE');
  const activeSprintProjectCount = new Set(currentSprints.map((s) => s.projectId)).size;
  const pendingStories = stories.filter((s) => s.status !== 'DONE').length;
  const completedStories = stories.filter((s) => s.status === 'DONE').length;
  const totalStories = pendingStories + completedStories;
  const completionRate = totalStories > 0
    ? Math.round((completedStories / totalStories) * 100)
    : 0;

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${user?.name || 'User'}`}
        subtitle="Here's what's happening with your projects today."
      />

      <DemoBanner />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <FolderKanban className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              +2 from last month
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sprints</CardTitle>
            <Timer className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentSprints.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {activeSprintProjectCount} {activeSprintProjectCount === 1 ? 'project' : 'projects'}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Stories</CardTitle>
            <FileText className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingStories}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              Next milestone in 4 days
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              +5% improvement
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities.slice(0, 6).map((item, index) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <Avatar className="w-9 h-9 border-2 border-background group-hover:border-primary/20 transition-colors">
                      <AvatarImage src={item.userAvatar} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {item.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {index !== activities.slice(0, 6).length - 1 && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <p className="text-sm font-medium">
                        {item.userName}{' '}
                        <span className="text-muted-foreground font-normal">
                          {item.action}
                        </span>{' '}
                        <span className="text-foreground">{item.entityName}</span>
                      </p>
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap px-2 py-0.5 rounded-full bg-secondary/50">
                        {getTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    {item.details && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        "{item.details}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Sprints */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Active Sprints
                <Badge variant="secondary" className="font-normal">{currentSprints.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentSprints.map((sprint) => {
                  const daysLeft = Math.ceil(
                    (new Date(sprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <Link
                      key={sprint.id}
                      to={`/stories?sprintId=${sprint.id}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {sprint.name}
                        </span>
                        <Badge variant={daysLeft <= 2 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {daysLeft}d left
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{sprint.projectName}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          {sprint.storyCount} stories
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Ends {new Date(sprint.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {hasRole(['ADMIN', 'MANAGER']) && (
                  <>
                    <Link to="/projects">
                      <Button variant="outline" className="w-full justify-start h-10" size="default">
                        <FolderKanban className="w-4 h-4 mr-2" />
                        Create New Project
                      </Button>
                    </Link>
                    <Link to="/sprints">
                      <Button variant="outline" className="w-full justify-start h-10" size="default">
                        <Timer className="w-4 h-4 mr-2" />
                        Start New Sprint
                      </Button>
                    </Link>
                  </>
                )}
                <Link to="/stories">
                  <Button variant="outline" className="w-full justify-start h-10" size="default">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Story
                  </Button>
                </Link>
                <Link to="/activity">
                  <Button variant="outline" className="w-full justify-start h-10" size="default">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function getTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}
