import type React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Mail, Shield } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-cf-border pb-4">
        <h1 className="text-xl font-bold text-cf-textDark">Profile</h1>
        <p className="text-xs text-cf-textMuted mt-1">Your account details and preferences</p>
      </div>

      <Card>
        <CardHeader className="bg-cf-bgLight">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-cf-primary text-white rounded-full flex items-center justify-center text-lg font-bold uppercase">
              {user?.email ? user.email.slice(0, 2) : '?'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-cf-textDark">{user?.email}</h2>
              <p className="text-xs text-cf-textMuted">Account</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-cf-bgLight rounded-lg">
            <Mail size={18} className="text-cf-textMuted" />
            <div>
              <p className="text-xs text-cf-textMuted">Email</p>
              <p className="text-sm font-medium text-cf-textDark">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-cf-bgLight rounded-lg">
            <Shield size={18} className="text-cf-textMuted" />
            <div>
              <p className="text-xs text-cf-textMuted">Role</p>
              <p className="text-sm font-medium text-cf-textDark">{user?.role || 'USER'}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Profile;