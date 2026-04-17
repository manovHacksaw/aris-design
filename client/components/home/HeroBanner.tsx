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
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 text-foreground text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6 w-fit"
                >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    Seasonal Update
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-6"
                >
                    Participate & <br />
                    <span className="text-primary italic">Earn Dollars</span>
                </motion.h1>

                {/* Gamified Reward Badges */}
                <div className="flex flex-wrap gap-3 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl group/reward"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-400 group-hover/reward:scale-110 transition-transform">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">Base Reward</span>
                            <span className="text-sm font-black text-white leading-none">Guaranteed $1+</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl group/reward"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary group-hover/reward:scale-110 transition-transform">
                            <ArrowRight className="w-4 h-4 -rotate-45" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">Top Prize</span>
                            <span className="text-sm font-black text-white leading-none">Win Up to $1000</span>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
                >
                    <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95">
                        Start Earning
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-white/20 hover:-translate-y-1 active:scale-95">
                        How it Works
                    </button>
                </motion.div>
            </div>

            {/* Subtle side highlight instead of floating image */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        </div>
    );
}
