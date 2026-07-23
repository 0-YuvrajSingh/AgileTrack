import type React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center bg-cf-bgLight py-16 px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center text-cf-orange">
          <ShieldAlert size={56} className="animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold text-cf-textDark font-sans">
          Error 1004: Page Not Found
        </h1>
        <p className="text-sm text-cf-textMuted leading-relaxed max-w-sm mx-auto">
          The requested routing target could not be resolved by the local proxy router. The page may have been moved or deleted.
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
