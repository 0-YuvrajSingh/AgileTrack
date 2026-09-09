import type React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center bg-cf-bgLight py-16 px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center text-cf-primary">
          <ShieldAlert size={56} className="animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold text-cf-textDark font-sans">
          Page Not Found
        </h1>
        <p className="text-sm text-cf-textMuted leading-relaxed max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved. Check the URL or head back to the dashboard.
        </p>
        <div>
          <Link to="/dashboard">
            <Button className="font-semibold text-xs py-2 px-6">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
