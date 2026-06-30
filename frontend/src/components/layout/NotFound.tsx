import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export const NotFound = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stripe-bg">
            <h1 className="text-6xl font-bold text-stripe-textDark mb-4">404</h1>
            <p className="text-lg text-stripe-textLight mb-8">Oops! The page you're looking for doesn't exist.</p>
            <Link to="/dashboard">
                <Button>Return to Dashboard</Button>
            </Link>
        </div>
    );
};
