import { Calendar, Filter, Mail, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { Role } from '../types';

export default function Users() {
  const { hasRole } = useAuth();
  const users = useAppStore((state) => state.users);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check permissions
  if (!hasRole(['ADMIN', 'MANAGER'])) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              You don't have permission to view this page
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DEVELOPER':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleDescription = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'Full system access and user management';
      case 'MANAGER':
        return 'Can manage projects, sprints, and users';
      case 'DEVELOPER':
        return 'Can create and update stories';
      case 'VIEWER':
        return 'Read-only access to projects';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">Manage team members and their roles</p>
        </div>
        {hasRole(['ADMIN']) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new team member to your workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="userName">Full Name</Label>
                  <Input id="userName" placeholder="John Doe" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="john@company.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="userRole">Role</Label>
                  <Select defaultValue="DEVELOPER">
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="DEVELOPER">Developer</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {getRoleDescription('DEVELOPER')}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(['ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER'] as Role[]).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{role}s</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                  </div>
                  <Badge variant="outline" className={getRoleBadgeColor(role)}>
                    {role}
                  </Badge>
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
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="DEVELOPER">Developer</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasRole(['ADMIN']) && (
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Role Information */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Role Permissions</h3>
            <div className="space-y-3">
              {(['ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER'] as Role[]).map((role) => (
                <div key={role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge variant="outline" className={`${getRoleBadgeColor(role)} mt-0.5`}>
                    {role}
                  </Badge>
                  <p className="text-sm text-gray-600 flex-1">{getRoleDescription(role)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Team Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="text-sm font-medium">{users.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Active Members</span>
                <span className="text-sm font-medium">
                  {users.filter((u) => u.role !== 'VIEWER').length}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Administrators</span>
                <span className="text-sm font-medium">
                  {users.filter((u) => u.role === 'ADMIN').length}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">New This Month</span>
                <span className="text-sm font-medium">
                  {
                    users.filter((u) => {
                      const monthAgo = new Date();
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      return new Date(u.createdAt) > monthAgo;
                    }).length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
