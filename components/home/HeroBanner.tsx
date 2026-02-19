"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export default function HeroBanner() {
    return (
        <div className="relative w-full h-[340px] md:h-[380px] rounded-[32px] overflow-hidden group shadow-spotify">
            {/* Background with subtle overlay */}
            <div className="absolute inset-0">
                <img
                    src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    alt="Hero"
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content Overlay */}
            <div className="relative h-full flex flex-col justify-center p-8 md:p-14 max-w-3xl z-10">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6 w-fit"
                >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    Seasonal Update
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.85] mb-6"
                >
                    Create the <br />
                    <span className="italic">Future</span> of Art
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/70 text-sm md:text-base font-medium max-w-md mb-8 leading-relaxed"
                >
                    Join the monthly creative battle. Showcase your skills, earn rewards, and level up your global ranking.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
                >
                    <button className="bg-foreground text-background px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all hover:bg-foreground/90 active:scale-95">
                        Register Now
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-white/20 active:scale-95">
                        View Details
                    </button>
                </motion.div>
            </div>

            {/* Subtle side highlight instead of floating image */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        </div>
    );
}
