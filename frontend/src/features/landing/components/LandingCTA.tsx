import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const LandingCTA = () => {
    return (
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
    );
};
