"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = [1, 2, 3, 4, 5, 6, 7];

const ROWS = [
    {
        label: "Tokens Minted",
        values: [10000, 25000, 50000, 100000, 250000, 500000, 1000000],
        format: (v: number) => v.toLocaleString(),
    },
    {
        label: "Events Created",
        values: [3, 6, 9, 20, 50, 75, 100],
        format: (v: number) => v.toLocaleString(),
    },
    {
        label: "Unique Participants",
        values: [1000, 2000, 5000, 10000, 25000, 50000, 100000],
        format: (v: number) => v.toLocaleString(),
    },
    {
        label: "Reward Discount",
        values: [1, 2, 3, 5, 10, 15, 20],
        format: (v: number) => `${v}%`,
        highlight: true,
    },
];

interface Props {
    open: boolean;
    onClose: () => void;
    overallLevel: number;
}

export default function MilestonesTableModal({ open, onClose, overallLevel }: Props) {
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
                        className="w-full max-w-3xl bg-background border border-surface-border rounded-[28px] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
                            <div>
                                <h2 className="font-display text-2xl text-foreground uppercase tracking-tight">Global Milestone Tiers</h2>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] mt-0.5">
                                    Requirements & rewards per level
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-surface hover:bg-white/[0.1] flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-foreground/50" />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto p-6">
                            <table className="w-full min-w-[560px] text-left border-separate border-spacing-0">
                                {/* Column headers */}
                                <thead>
                                    <tr>
                                        <th className="pb-3 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] w-[180px]" />
                                        <th
                                            colSpan={7}
                                            className="pb-3 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] text-center"
                                        >
                                            Levels
                                        </th>
                                    </tr>
                                    <tr className="border-b border-surface-border">
                                        <th className="pb-3 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]" />
                                        {LEVELS.map((lvl) => {
                                            const isCurrent = overallLevel === lvl;
                                            return (
                                                <th
                                                    key={lvl}
                                                    className={cn(
                                                        "pb-3 text-center text-[11px] font-black uppercase tracking-widest",
                                                        isCurrent ? "text-lime-400" : "text-foreground/40"
                                                    )}
                                                >
                                                    {isCurrent ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            {lvl}
                                                            <span className="text-[8px] bg-lime-400/15 text-lime-400 border border-lime-400/30 px-1.5 py-0.5 rounded-full font-black tracking-widest">YOU</span>
                                                        </span>
                                                    ) : lvl}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>

                                <tbody>
                                    {ROWS.map((row, ri) => (
                                        <tr
                                            key={row.label}
                                            className={cn(
                                                "border-b border-surface-border last:border-0",
                                                row.highlight && "bg-lime-400/[0.04]"
                                            )}
                                        >
                                            <td className={cn(
                                                "py-4 text-[11px] uppercase tracking-widest pr-4",
                                                row.highlight ? "font-black text-lime-400" : "font-black text-foreground/50"
                                            )}>
                                                {row.label}
                                            </td>
                                            {row.values.map((val, ci) => {
                                                const lvl = ci + 1;
                                                const isCurrent = overallLevel === lvl;
                                                const isPast = overallLevel > lvl;
                                                return (
                                                    <td key={ci} className="py-4 text-center">
                                                        <span className={cn(
                                                            "font-mono font-black text-[13px]",
                                                            isCurrent
                                                                ? "text-lime-400"
                                                                : isPast
                                                                    ? "text-foreground/40"
                                                                    : row.highlight
                                                                        ? "text-foreground/70"
                                                                        : "text-foreground/50"
                                                        )}>
                                                            {row.format(val)}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer hint */}
                        <div className="px-6 pb-5 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-lime-400 shrink-0" />
                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">
                                Your current level — all three metrics must reach the target to advance
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
