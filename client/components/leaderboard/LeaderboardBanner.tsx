"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function LeaderboardBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-[22px] bg-card border border-border p-8 overflow-hidden shadow-lg"
        >
            {/* Content */}
            <div className="relative z-10 max-w-md">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    You're climbing fast 🚀
                </h2>
                <p className="text-sm text-foreground/60 leading-relaxed mb-6">
                    Only <span className="text-foreground font-bold">120 XP</span> left to reach Top 10. Keep engaging to rank up.
                </p>
                <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-[16px] text-sm font-medium hover:-translate-y-[1px] transition-all duration-150 ease-out flex items-center gap-2 shadow-primary/20">
                    <Zap className="w-4 h-4" />
                    Earn More XP
                </button>
            </div>

            {/* Background Decoration - Minimal, no vibrant gradients */}
            <div className="absolute top-0 right-0 w-64 h-full hidden lg:block pointer-events-none">
                <div className="absolute top-4 right-4 bg-secondary border border-border text-foreground/50 px-3 py-1.5 rounded-full text-xs font-bold opacity-60">
                    Top Voter
                </div>
                <div className="absolute top-16 right-20 bg-secondary border border-border text-foreground/50 px-3 py-1.5 rounded-full text-xs font-bold opacity-40">
                    Streak King
                </div>
                <div className="absolute bottom-8 right-12 bg-secondary border border-border text-foreground/50 px-3 py-1.5 rounded-full text-xs font-bold opacity-50">
                    Rising Star
                </div>
            </div>
        </motion.div>
    );
}
