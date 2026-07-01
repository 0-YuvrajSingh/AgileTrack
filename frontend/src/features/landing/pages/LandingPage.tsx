import { LandingHeader } from '../components/LandingHeader';
import { LandingHero } from '../components/LandingHero';
import { LandingFeatures } from '../components/LandingFeatures';
import { LandingCTA } from '../components/LandingCTA';

export const LandingPage = () => {
    return (
        <div className="min-h-screen bg-stripe-bg font-sans text-stripe-textLight selection:bg-stripe-primary selection:text-white">
            <LandingHeader />
            <main>
                <LandingHero />
                <LandingFeatures />
                <LandingCTA />
            </main>
        </div>
    );
};

