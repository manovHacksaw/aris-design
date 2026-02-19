"use client";

import { motion } from "framer-motion";
import { ThumbsUp, PenTool, TrendingUp } from "lucide-react";

const cards = [
    {
        icon: ThumbsUp,
        title: "Vote in Events",
        description: "Browse active events, pick your favorite submission, and earn base rewards for every vote.",
        color: "text-primary bg-primary/10 border-primary/10",
    },
    {
        icon: PenTool,
        title: "Create & Compete",
        description: "Submit original content to brand challenges. Top creators win from the leaderboard reward pool.",
        color: "text-accent bg-accent/10 border-accent/10",
    },
    {
        icon: TrendingUp,
        title: "Level Up",
        description: "Every action earns XP. Hit milestones to unlock badges, higher rewards, and exclusive events.",
        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/10",
    },
];

export default function StepEducation() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-foreground tracking-tighter"
                >
                    How Aris Works
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs text-foreground/40 font-bold"
                >
                    Three ways to engage and earn.
                </motion.p>
            </div>

            {/* Education Cards */}
            <div className="space-y-4">
                {cards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.1 }}
                            className="flex items-start gap-4 p-5 bg-card border border-border/40 rounded-[18px]"
                        >
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${card.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-foreground tracking-tight mb-1">{card.title}</p>
                                <p className="text-[11px] text-foreground/40 font-medium leading-relaxed">{card.description}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* XP Preview */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card border border-border/40 rounded-[18px] p-5"
            >
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">XP Milestone Preview</p>
                    <span className="text-[10px] font-black text-primary">0 / 100 XP</span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/30">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "10%" }}
                        transition={{ duration: 1.5, delay: 0.7, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    />
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-foreground/20 font-bold">Welcome Bonus: +10 XP</span>
                    <span className="text-[9px] text-foreground/20 font-bold">Bronze I</span>
                </div>
            </motion.div>
        </div>
    );
}
