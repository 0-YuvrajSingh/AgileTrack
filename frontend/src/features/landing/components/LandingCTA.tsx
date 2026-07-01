import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { motion } from 'framer-motion';

export const LandingCTA = () => {
    return (
        <section className="relative overflow-hidden bg-zinc-950 py-32 border-t border-zinc-800/50">
            <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-5 text-center md:px-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center"
                >
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-500">
                        <Sparkles className="h-4 w-4" />
                        Join the future of team coordination
                    </div>
                    
                    <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
                        Stop managing tools. <br/>
                        <span className="text-orange-500">Start shipping work.</span>
                    </h2>
                    
                    <p className="mt-6 max-w-2xl text-lg text-zinc-400">
                        Join teams that use AgileTrack to connect their workflow, eliminate noise, and focus on what actually matters.
                    </p>
                    
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link to="/register" className="w-full sm:w-auto">
                            <Button className="h-14 w-full gap-3 px-10 text-lg bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                Start for free
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
