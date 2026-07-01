import { LandingHeader } from '../components/LandingHeader';
import { LandingHero } from '../components/LandingHero';
import { LandingFeatures } from '../components/LandingFeatures';
import { LandingCTA } from '../components/LandingCTA';

export const LandingPage = () => {
    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 selection:bg-orange-500 selection:text-zinc-50">
            <LandingHeader />
            <main>
                <LandingHero />
                <LandingFeatures />
                <LandingCTA />
            </main>
        </div>
    );
};

