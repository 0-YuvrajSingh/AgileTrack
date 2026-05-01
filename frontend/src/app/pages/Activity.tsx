import { Calendar, FileText, Filter, FolderKanban, Search, Timer, User } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { useAppStore } from '../store/useAppStore';
import { Activity } from '../types';

export default function ActivityPage() {
  const activities = useAppStore((state) => state.activities);
  const users = useAppStore((state) => state.users);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toDate = (value: Date | string): Date => {
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || activity.entityType === entityFilter;
    const matchesUser = userFilter === 'all' || activity.userId === userFilter;
    return matchesSearch && matchesEntity && matchesUser;
  });

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Group activities by date
  const groupedActivities = paginatedActivities.reduce((groups, activity) => {
    const date = toDate(activity.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const getEntityIcon = (entityType: Activity['entityType']) => {
    switch (entityType) {
      case 'PROJECT':
        return FolderKanban;
      case 'SPRINT':
        return Timer;
      case 'STORY':
        return FileText;
      case 'USER':
        return User;
    }
  };

  const getEntityColor = (entityType: Activity['entityType']) => {
    switch (entityType) {
      case 'PROJECT':
        return 'bg-blue-100 text-blue-700';
      case 'SPRINT':
        return 'bg-green-100 text-green-700';
      case 'STORY':
        return 'bg-purple-100 text-purple-700';
      case 'USER':
        return 'bg-orange-100 text-orange-700';
    }
  };

  const getRelativeDate = (date: string) => {
    const activityDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (activityDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (activityDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return activityDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeAgo = (date: Date | string): string => {
    const parsedDate = toDate(date);
    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return parsedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Activity stats
  const stats = [
    {
      title: 'Total Activities',
      value: activities.length,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Today',
      value: activities.filter(
        (a) => toDate(a.timestamp).toDateString() === new Date().toDateString()
      ).length,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Users',
      value: new Set(activities.map((a) => a.userId)).size,
      icon: User,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Projects Updated',
      value: activities.filter((a) => a.entityType === 'PROJECT').length,
      icon: FolderKanban,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Activity</h1>
        <p className="text-muted-foreground mt-1">Track all changes and updates across your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div
                    className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PROJECT">Projects</SelectItem>
                <SelectItem value="SPRINT">Sprints</SelectItem>
                <SelectItem value="STORY">Stories</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No activities found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background py-2 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {getRelativeDate(date)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </div>

                  {/* Activities for this date */}
                  <div className="space-y-4 pl-4">
                    {dateActivities.map((activity, index) => {
                      const isLast = index === dateActivities.length - 1;
                      const Icon = getEntityIcon(activity.entityType);

                      return (
                        <div key={activity.id} className="relative">
                          {/* Timeline line */}
                          {!isLast && (
                            <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gradient-to-b from-border to-transparent" />
                          )}

                          <div className="flex gap-4 group">
                            {/* Avatar with icon overlay */}
                            <div className="relative flex-shrink-0">
                              <Avatar className="w-9 h-9 border-2 border-card shadow-sm ring-2 ring-background">
                                <AvatarImage src={activity.userAvatar} />
                                <AvatarFallback className="text-xs">{activity.userName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getEntityColor(activity.entityType)} rounded-full flex items-center justify-center border-2 border-background shadow-sm`}>
                                <Icon className="w-2.5 h-2.5" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-6">
                              <div className="bg-muted/30 group-hover:bg-muted/50 rounded-lg p-4 border border-border/50 transition-all">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground leading-relaxed">
                                      <span className="font-semibold">{activity.userName}</span>{' '}
                                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                                      <span className="font-semibold text-primary">{activity.entityName}</span>
                                    </p>
                                    {activity.details && (
                                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed bg-background/50 rounded px-2 py-1.5 inline-block">
                                        {activity.details}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {getTimeAgo(activity.timestamp)}
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className={`${getEntityColor(activity.entityType)} text-[10px] px-2 py-0`}
                                  >
                                    {activity.entityType}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t mt-6 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{' '}
                {Math.min(startIndex + itemsPerPage, filteredActivities.length)} of{' '}
                {filteredActivities.length} activities
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
