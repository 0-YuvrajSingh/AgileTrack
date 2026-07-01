import { LayoutDashboard, PanelsTopLeft, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
    {
        icon: PanelsTopLeft,
        title: "Workspaces stay separate",
        desc: "Members see only the workspaces they belong to, with owner-level controls kept out of the task board noise."
    },
    {
        icon: LayoutDashboard,
        title: "Boards are the default view",
        desc: "Projects open directly into task status columns, so planning and execution live in the same surface."
    },
    {
        icon: UsersRound,
        title: "Roles match the workflow",
        desc: "Owners manage settings, members move work, and viewers can follow progress without accidental edits."
    }
];

export const LandingFeatures = () => {
    return (
        <section className="relative border-y border-zinc-800/50 bg-zinc-950">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-24 md:grid-cols-3 md:px-8">
                {features.map((feature, i) => (
                    <motion.div 
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: i * 0.1, type: "spring" }}
                        className="group relative rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-8 hover:bg-zinc-800/40 transition-colors"
                    >
                        <div className="relative">
                            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-50">{feature.title}</h2>
                            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{feature.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
