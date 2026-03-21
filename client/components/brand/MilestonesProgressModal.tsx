"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Megaphone, Users, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const OVERALL_LEVELS = [
    { level: 1, discount: 1, tokens: 10000, events: 3, participants: 1000 },
    { level: 2, discount: 2, tokens: 25000, events: 6, participants: 2000 },
    { level: 3, discount: 3, tokens: 50000, events: 9, participants: 5000 },
    { level: 4, discount: 5, tokens: 100000, events: 20, participants: 10000 },
    { level: 5, discount: 10, tokens: 250000, events: 50, participants: 25000 },
    { level: 6, discount: 15, tokens: 500000, events: 75, participants: 50000 },
    { level: 7, discount: 20, tokens: 1000000, events: 100, participants: 100000 },
];

interface MetricItem {
    label: string;
    icon: React.ElementType;
    current: number;
    target: number;
    format: (v: number) => string;
    prefix?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    overallLevel: number;
    eventsCreated: number;
    uniqueParticipants: number;
    usdcDistributed: number;
    currentReward: number;
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
    const clamped = Math.min(pct, 100);
    return (
        <div className="relative w-full h-2.5 bg-white/[0.06] rounded-full overflow-visible">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${clamped}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-lime-400/60 to-lime-400"
            />
            {/* Fire emoji at the tip */}
            <motion.div
                initial={{ left: 0, opacity: 0 }}
                animate={{ left: `${clamped}%`, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-base leading-none select-none"
                style={{ filter: "drop-shadow(0 0 6px rgba(163,230,53,0.6))" }}
            >
                🔥
            </motion.div>
        </div>
    );
}

export default function MilestonesProgressModal({
    open,
    onClose,
    overallLevel,
    eventsCreated,
    uniqueParticipants,
    usdcDistributed,
    currentReward,
}: Props) {
    const nextTierIndex = Math.min(overallLevel, 6);
    const target = OVERALL_LEVELS[nextTierIndex];
    const isMaxed = overallLevel >= 7;

    const metrics: MetricItem[] = [
        {
            label: "Reward Discount",
            icon: Tag,
            current: currentReward,
            target: target.discount,
            format: (v) => `${v}%`,
        },
        {
            label: "Tokens Minted",
            icon: Coins,
            current: usdcDistributed,
            target: target.tokens,
            format: (v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        },
        {
            label: "Events Created",
            icon: Megaphone,
            current: eventsCreated,
            target: target.events,
            format: (v) => v.toLocaleString(),
        },
        {
            label: "Participants",
            icon: Users,
            current: uniqueParticipants,
            target: target.participants,
            format: (v) => v.toLocaleString(),
        },
    ];

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-background border border-white/[0.08] rounded-[28px] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                            <div>
                                <h2 className="font-display text-2xl text-foreground uppercase tracking-tight">
                                    {isMaxed ? "Max Level Reached" : `Next Goal — Level ${overallLevel + 1}`}
                                </h2>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] mt-0.5">
                                    {isMaxed ? "You've unlocked every tier" : "How close you are to each target"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-foreground/50" />
                            </button>
                        </div>

                        {/* Metrics */}
                        <div className="p-6 space-y-6">
                            {metrics.map((m, i) => {
                                const Icon = m.icon;
                                const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 100;
                                const done = m.current >= m.target;

                                return (
                                    <motion.div
                                        key={m.label}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.07, duration: 0.3 }}
                                        className="space-y-3"
                                    >
                                        {/* Row: icon + label + values */}
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                                                done ? "bg-lime-400/15" : "bg-white/[0.04]"
                                            )}>
                                                <Icon className={cn("w-4 h-4", done ? "text-lime-400" : "text-foreground/30")} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">{m.label}</p>
                                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                                    <span className={cn(
                                                        "font-display text-2xl tracking-tight leading-none",
                                                        done ? "text-lime-400" : "text-foreground"
                                                    )}>
                                                        {m.format(m.current)}
                                                    </span>
                                                    <span className="text-[11px] font-black text-foreground/20">/</span>
                                                    <span className="text-[13px] font-black text-foreground/30">{m.format(m.target)}</span>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                done
                                                    ? "bg-lime-400/15 text-lime-400 border border-lime-400/30"
                                                    : "bg-white/[0.04] text-foreground/30 border border-white/[0.06]"
                                            )}>
                                                {done ? "Done" : `${Math.floor(pct)}%`}
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <ProgressBar pct={pct} label={m.label} />
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-5 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-lime-400/50 shrink-0" />
                            <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em]">
                                {isMaxed
                                    ? "All milestones complete — enjoy your maximum discount"
                                    : "All three metrics must hit their target to advance to the next level"}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
