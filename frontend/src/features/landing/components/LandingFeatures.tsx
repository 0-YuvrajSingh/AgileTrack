import { LayoutDashboard, PanelsTopLeft, UsersRound } from 'lucide-react';

export const LandingFeatures = () => {
    return (
        <section className="border-y border-stripe-border bg-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-3 md:px-8">
                <div>
                    <PanelsTopLeft className="mb-4 h-6 w-6 text-stripe-primary" />
                    <h2 className="text-base font-bold text-stripe-textDark">Workspaces stay separate</h2>
                    <p className="mt-2 text-sm leading-6">Members see only the workspaces they belong to, with owner-level controls kept out of the task board noise.</p>
                </div>
                <div>
                    <LayoutDashboard className="mb-4 h-6 w-6 text-stripe-primary" />
                    <h2 className="text-base font-bold text-stripe-textDark">Boards are the default view</h2>
                    <p className="mt-2 text-sm leading-6">Projects open directly into task status columns, so planning and execution live in the same surface.</p>
                </div>
                <div>
                    <UsersRound className="mb-4 h-6 w-6 text-stripe-primary" />
                    <h2 className="text-base font-bold text-stripe-textDark">Roles match the workflow</h2>
                    <p className="mt-2 text-sm leading-6">Owners manage settings, members move work, and viewers can follow progress without accidental edits.</p>
                </div>
            </div>
        </section>
    );
};
