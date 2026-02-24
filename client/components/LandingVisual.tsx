"use client";

import { motion } from "framer-motion";

export default function LandingVisual() {
    return (
        <div className="relative w-full h-[600px] flex items-center justify-center pointer-events-none">
            {/* Background Ambience - subtle glow behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[500px] bg-primary/20 blur-[100px] rounded-full" />

            {/* Main Phone Container - Floating Animation */}
            <motion.div
                animate={{
                    y: [-15, 15, -15],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="relative z-10 w-[300px] h-[600px] bg-card border border-card-border rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col"
            >
                {/* Phone Notch/Status Bar Area */}
                <div className="w-full h-8 flex justify-between items-center px-6 mt-2">
                    <div className="text-[10px] font-medium text-foreground/40">9:41</div>
                    <div className="w-16 h-4 bg-foreground/5 rounded-full" />
                    <div className="flex gap-1">
                        <div className="w-4 h-2 bg-foreground/20 rounded-sm" />
                        <div className="w-4 h-2 bg-foreground/20 rounded-sm" />
                    </div>
                </div>

                {/* Mock App Content */}
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent)]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-full bg-secondary/20" />
                        <div className="w-20 h-3 bg-secondary/10 rounded-full" />
                        <div className="w-6 h-6 rounded-full bg-secondary/10" />
                    </div>

                    {/* Feed Item 1 (Main) */}
                    <div className="w-full aspect-[4/5] bg-background rounded-[22px] p-3 shadow-sm border border-border/50 flex flex-col gap-3">
                        <div className="w-full h-full bg-secondary/5 rounded-xl animate-pulse-slow" />
                        <div className="h-12 w-full flex items-center justify-between gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/20" />
                            <div className="h-3 w-24 bg-foreground/10 rounded-full" />
                            <div className="h-8 w-16 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                VOTE
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Nav Mockup */}
                <div className="h-16 w-full border-t border-border/50 flex items-center justify-around px-6 bg-card/80 backdrop-blur-md">
                    <div className="w-6 h-6 rounded-full bg-primary/20" />
                    <div className="w-6 h-6 rounded-full bg-foreground/10" />
                    <div className="w-6 h-6 rounded-full bg-foreground/10" />
                    <div className="w-6 h-6 rounded-full bg-foreground/10" />
                </div>
            </motion.div>


            {/* Floating Micro-Cards (Parallax) */}

            {/* Top Left: Vote Recorded */}
            <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[20%] left-0 xl:-left-12 z-20 bg-card border border-card-border p-3 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex items-center gap-3 w-48"
            >
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    ✓
                </div>
                <div className="text-sm font-medium text-foreground">
                    Vote recorded
                </div>
            </motion.div>

            {/* Middle Right: Earnings */}
            <motion.div
                animate={{ y: [-12, 12, -12] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-[45%] right-0 xl:-right-16 z-20 bg-card border border-card-border p-3 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex items-center gap-3"
            >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs">
                    $
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-foreground/60">Earnings Today</span>
                    <span className="text-sm font-bold text-accent">+$0.05</span>
                </div>
            </motion.div>

            {/* Bottom Left: Challenge Completed */}
            <motion.div
                animate={{ y: [8, -8, 8] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-[20%] left-4 xl:-left-8 z-20 bg-card border border-card-border p-3 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex items-center gap-3"
            >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    ★
                </div>
                <div className="text-xs font-semibold text-foreground">
                    Challenge Completed
                </div>
            </motion.div>

        </div>
    );
}
