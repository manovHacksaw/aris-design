"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { Megaphone, Users, Coins, CheckCircle, Clock, Flame } from "lucide-react";
import { motion } from "framer-motion";
import MilestonesTableModal from "@/components/brand/MilestonesTableModal";
import MilestonesProgressModal from "@/components/brand/MilestonesProgressModal";

const OVERALL_LEVELS = [
    { level: 1, discount: 1, tokens: 10000, events: 3, participants: 1000 },
    { level: 2, discount: 2, tokens: 25000, events: 6, participants: 2000 },
    { level: 3, discount: 3, tokens: 50000, events: 9, participants: 5000 },
    { level: 4, discount: 5, tokens: 100000, events: 20, participants: 10000 },
    { level: 5, discount: 10, tokens: 250000, events: 50, participants: 25000 },
    { level: 6, discount: 15, tokens: 500000, events: 75, participants: 50000 },
    { level: 7, discount: 20, tokens: 1000000, events: 100, participants: 100000 },
];

const TIMELINE_LEVELS = [
    { level: 0, discount: 0, unlocks: "" },
    { level: 1, discount: 1, unlocks: "Basic listing boost" },
    { level: 2, discount: 2, unlocks: "Featured placement + analytics" },
    { level: 3, discount: 3, unlocks: "Priority support + premium badge" },
    { level: 4, discount: 5, unlocks: "Extended reach + creator matching" },
    { level: 5, discount: 10, unlocks: "Verified brand status + API access" },
    { level: 6, discount: 15, unlocks: "Custom campaigns + brand AM" },
    { level: 7, discount: 20, unlocks: "Zero fee events + max promotion" }
];

type MilestoneData = {
    success: boolean;
    eventsCreated: number;
    uniqueParticipants: number;
    usdcDistributed: number;
    milestones: {
        eventsCreatedLevel: number;
        uniqueParticipantsLevel: number;
        usdcDistributedLevel: number;
    }
};

export default function MilestonesPage() {
    const { user } = useUser();
    const [data, setData] = useState<MilestoneData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tiersModalOpen, setTiersModalOpen] = useState(false);
    const [progressModalOpen, setProgressModalOpen] = useState(false);

    const activeBrand = user?.ownedBrands?.[0];
    const brandName = activeBrand?.name || "Your Brand";
    const brandDesc = activeBrand?.description || "Track your brand's growth journey. Unlocking higher tiers grants you platform perks, reduced fees, and exclusive access to top-tier creators.";

    useEffect(() => {
        const fetchMilestones = async () => {
            try {
                const res = await apiRequest<MilestoneData>("/brands/milestones", { method: 'GET' });
                setData(res);
            } catch (err: any) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMilestones();
    }, []);

    if (loading) {
        return (
            <div className="w-full pb-20 space-y-6">
                {/* Brand Header Skeleton */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-80 bg-surface rounded-2xl animate-pulse" />
                        <div className="h-8 w-24 bg-surface rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-full max-w-2xl bg-surface rounded-lg animate-pulse" />
                        <div className="h-4 w-2/3 max-w-md bg-surface rounded-lg animate-pulse" />
                    </div>
                </motion.div>

                {/* Row 1: Metrics & Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-[160px] bg-surface border border-surface-border rounded-[28px] animate-pulse" />
                        ))}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="lg:col-span-4 h-full min-h-[300px] bg-surface border border-surface-border rounded-[32px] animate-pulse"
                    />
                </div>

                {/* Row 2: Table & Upgrade */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="lg:col-span-8 min-h-[450px] bg-surface border border-surface-border rounded-[28px] animate-pulse"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="lg:col-span-4 min-h-[450px] bg-surface border border-surface-border rounded-[28px] animate-pulse"
                    />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h3 className="text-xl font-bold">Data Unavailable</h3>
                <p className="text-foreground/40 mt-2 max-w-sm">We couldn't fetch your milestones right now. Please try again later.</p>
            </div>
        );
    }

    const { eventsCreatedLevel, uniqueParticipantsLevel, usdcDistributedLevel } = data.milestones;
    // The brand's overall level is gated by the lowest of the 3 sub-levels.
    const overallLevel = Math.min(eventsCreatedLevel, uniqueParticipantsLevel, usdcDistributedLevel);
    const currentReward = overallLevel > 0 && overallLevel <= 7 ? OVERALL_LEVELS[overallLevel - 1].discount : 0;

    // Safety fallback: if they maxed out Level 7, we lock the "Next" variables to the max tier index 6.
    const nextTierIndex = Math.min(overallLevel, 6);
    const targetTier = OVERALL_LEVELS[nextTierIndex];

    return (
        <div className="w-full pb-20 space-y-6">

            {/* Brand Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-[2.5rem] sm:text-[3rem] md:text-[4rem] text-foreground uppercase leading-[0.92] tracking-tight">
                        {brandName} Milestones
                    </h1>
                    <div className="flex items-center gap-1 px-3 py-1 bg-lime-400/10 border border-lime-400/30 rounded-full">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [-5, 5, -5]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Flame className="w-5 h-5 text-lime-400" />
                        </motion.div>
                        <span className="text-[10px] sm:text-[11px] font-black text-lime-400 uppercase tracking-[0.2em]">Lv. {overallLevel}</span>
                    </div>
                </div>
                <p className="text-[10px] sm:text-[11px] font-black text-foreground/30 uppercase tracking-[0.2em] max-w-2xl leading-relaxed mt-3">
                    {brandDesc}
                </p>
            </div>

            {/* Top Row: Left Cards (8 cols) & Right Graphic (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Top Left: 4 Data Metric Cards */}
                <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6">
                    {/* Card 1: Lime Hero Card (Discount Reward) */}
                    <div onClick={() => setProgressModalOpen(true)} className="bg-surface border border-lime-400/20 rounded-[28px] p-4 sm:p-8 flex flex-col justify-center min-h-[140px] sm:min-h-[160px] relative overflow-hidden group cursor-pointer hover:bg-lime-400/[0.02] transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-lime-400/10 transition-colors duration-700" />
                        <h2 className="font-display text-[3.5rem] lg:text-[4.8rem] text-lime-400 uppercase tracking-tight leading-none mb-1 sm:mb-2">{currentReward}%</h2>
                        <p className="text-[10px] font-black text-lime-400/40 uppercase tracking-[0.2em]">Reward Discount</p>
                    </div>

                    {/* Card 2: Tokens Minted */}
                    <div onClick={() => setProgressModalOpen(true)} className="bg-surface border border-surface-border rounded-[28px] p-4 sm:p-8 flex flex-col justify-center min-h-[140px] sm:min-h-[160px] hover:bg-surface hover:border-surface-border-strong transition-all cursor-pointer">
                        <h2 className="font-display text-[2rem] sm:text-[3rem] lg:text-[4rem] text-foreground tracking-tight leading-none mb-1 sm:mb-2">${data.usdcDistributed.toLocaleString(undefined, { maximumFractionDigits: 1 })}</h2>
                        <p className="text-[9px] sm:text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">Tokens Minted</p>
                    </div>

                    {/* Card 3: Events Created */}
                    <div onClick={() => setProgressModalOpen(true)} className="bg-surface border border-surface-border rounded-[28px] p-4 sm:p-8 flex flex-col justify-center min-h-[140px] sm:min-h-[160px] hover:bg-surface hover:border-surface-border-strong transition-all cursor-pointer">
                        <h2 className="font-display text-[2.5rem] sm:text-[3rem] lg:text-[4rem] text-foreground tracking-tight leading-none mb-1 sm:mb-2">{data.eventsCreated.toLocaleString()}</h2>
                        <p className="text-[9px] sm:text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">Events Created</p>
                    </div>

                    {/* Card 4: Participants */}
                    <div onClick={() => setProgressModalOpen(true)} className="bg-surface border border-surface-border rounded-[28px] p-4 sm:p-8 flex flex-col justify-center min-h-[140px] sm:min-h-[160px] hover:bg-surface hover:border-surface-border-strong transition-all cursor-pointer">
                        <h2 className="font-display text-[2.5rem] sm:text-[3rem] lg:text-[4rem] text-foreground tracking-tight leading-none mb-1 sm:mb-2">{data.uniqueParticipants.toLocaleString()}</h2>
                        <p className="text-[9px] sm:text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">Participants</p>
                    </div>
                </div>

                {/* Top Right: Overall Brand Level & Timeline */}
                <div
                    onClick={() => setTiersModalOpen(true)}
                    className="lg:col-span-4 bg-surface border border-surface-border rounded-[32px] p-5 lg:p-6 flex flex-col relative min-h-[300px] cursor-pointer hover:border-surface-border-strong hover:bg-surface transition-all group"
                >
                    <div className="flex items-center justify-between gap-2 mb-2 relative z-10 w-full pr-1">
                        <h3 className="font-display text-2xl text-foreground uppercase tracking-tight truncate group-hover:text-lime-400 transition-colors">
                            Global Milestones Tiers
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest hidden group-hover:inline transition-all">View all</span>
                            <div className="px-3 py-1 bg-lime-400 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_4px_10px_rgba(163,230,53,0.3)]">
                                Lv. {overallLevel}
                            </div>
                        </div>
                    </div>

                    <div className="relative flex-1 flex flex-col justify-center mt-2 w-full">
                        {/* Timeline line */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-surface z-0 -translate-y-1/2" />

                        {/* Horizontal scrollable wrapper */}
                        <div className="flex items-center overflow-x-auto scrollbar-hide -mx-5 px-5 w-[calc(100%+40px)] relative z-10 snap-x snap-mandatory py-6">
                            <div className="flex gap-4 items-center">
                                {TIMELINE_LEVELS.map((tier) => {
                                    const isCurrent = overallLevel === tier.level;

                                    return (
                                        <div key={tier.level} className="shrink-0 snap-center">
                                            <div className={cn(
                                                "w-[120px] md:w-[140px] p-4 rounded-[24px] flex flex-col items-center justify-center transition-all duration-300 relative",
                                                isCurrent
                                                    ? "bg-surface border-[2px] border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.2)] min-h-[110px]"
                                                    : "bg-surface border border-surface-border min-h-[150px]"
                                            )}>
                                                <h4 className={cn(
                                                    "text-[10px] font-black uppercase tracking-[0.15em] mb-2",
                                                    isCurrent ? "text-lime-400" : "text-foreground/30"
                                                )}>
                                                    LEVEL {tier.level}
                                                </h4>

                                                <div className={cn(
                                                    "flex items-baseline mb-2",
                                                    isCurrent ? "text-lime-400" : "text-foreground"
                                                )}>
                                                    <span className="font-display text-[4rem] tracking-tight leading-none">{tier.discount}</span>
                                                    <span className="font-display text-2xl text-foreground/30 ml-1">%</span>
                                                </div>

                                                {!isCurrent && tier.unlocks && (
                                                    <div className="mt-5 flex flex-col items-center text-center px-1">
                                                        <span className="text-[10px] font-black tracking-widest text-foreground/30 mb-1.5">
                                                            UNLOCKS
                                                        </span>
                                                        <span className="text-[11px] font-bold text-foreground/40 leading-tight">
                                                            {tier.unlocks}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Row: Detailed Category sub-milestones & Upgrade Reward Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Bottom Left: Detailed Sub-Milestones Table */}
                <div className="lg:col-span-8 bg-surface border border-surface-border rounded-[28px] p-6 lg:p-8 overflow-hidden flex flex-col">
                    <h3 className="font-display text-2xl lg:text-3xl text-foreground uppercase tracking-tight mb-6">Milestone Requirements Data</h3>

                    <div className="overflow-x-auto w-full pb-4">
                        <table className="w-full text-left min-w-[500px]">
                            <thead>
                                <tr className="border-b border-surface-border">
                                    <th className="pb-4 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em]">Category</th>
                                    <th className="pb-4 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] text-center">Current Value</th>
                                    <th className="pb-4 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] text-center">Required Target</th>
                                    <th className="pb-4 text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] text-right">Category Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Tokens Row */}
                                <tr className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors group">
                                    <td className="py-6 font-black text-foreground text-[11px] uppercase tracking-widest flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-lime-400/10 flex items-center justify-center text-lime-400 group-hover:scale-105 transition-transform">
                                            <Coins className="w-6 h-6" />
                                        </div>
                                        Tokens Minted
                                    </td>
                                    <td className="py-6 font-mono font-black text-center text-lg text-foreground/80">{data.usdcDistributed.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                    <td className="py-6 font-mono font-black text-foreground/30 text-base text-center">
                                        {OVERALL_LEVELS[Math.min(usdcDistributedLevel, 6)].tokens.toLocaleString()}
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className={cn(
                                            "inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                            usdcDistributedLevel >= 7 ? "bg-lime-400 border-lime-400 text-black" : "bg-surface text-foreground/50 border-surface-border"
                                        )}>
                                            {usdcDistributedLevel >= 7 ? "MAXED" : `LVL ${usdcDistributedLevel}`}
                                        </span>
                                    </td>
                                </tr>

                                {/* Events Row */}
                                <tr className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors group">
                                    <td className="py-6 font-black text-foreground text-[11px] uppercase tracking-widest flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-lime-400/10 flex items-center justify-center text-lime-400 group-hover:scale-105 transition-transform">
                                            <Megaphone className="w-6 h-6" />
                                        </div>
                                        Events Created
                                    </td>
                                    <td className="py-6 font-mono font-black text-center text-lg text-foreground/80">{data.eventsCreated.toLocaleString()}</td>
                                    <td className="py-6 font-mono font-black text-foreground/30 text-base text-center">
                                        {OVERALL_LEVELS[Math.min(eventsCreatedLevel, 6)].events.toLocaleString()}
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className={cn(
                                            "inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                            eventsCreatedLevel >= 7 ? "bg-lime-400 border-lime-400 text-black" : "bg-surface text-foreground/50 border-surface-border"
                                        )}>
                                            {eventsCreatedLevel >= 7 ? "MAXED" : `LVL ${eventsCreatedLevel}`}
                                        </span>
                                    </td>
                                </tr>

                                {/* Participants Row */}
                                <tr className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors group">
                                    <td className="py-6 font-black text-foreground text-[11px] uppercase tracking-widest flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-lime-400/10 flex items-center justify-center text-lime-400 group-hover:scale-105 transition-transform">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        Unique Participants
                                    </td>
                                    <td className="py-6 font-mono font-black text-center text-lg text-foreground/80">{data.uniqueParticipants.toLocaleString()}</td>
                                    <td className="py-6 font-mono font-black text-foreground/30 text-base text-center">
                                        {OVERALL_LEVELS[Math.min(uniqueParticipantsLevel, 6)].participants.toLocaleString()}
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className={cn(
                                            "inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                            uniqueParticipantsLevel >= 7 ? "bg-lime-400 border-lime-400 text-black" : "bg-surface text-foreground/50 border-surface-border"
                                        )}>
                                            {uniqueParticipantsLevel >= 7 ? "MAXED" : `LVL ${uniqueParticipantsLevel}`}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Right: Upgrade Info Modal-style Container */}
                <div className="lg:col-span-4 bg-surface border border-surface-border rounded-[28px] overflow-hidden relative h-full flex flex-col group">
                    {/* Top Hero Section of the card */}
                    <div className="bg-surface p-8 border-b border-surface-border relative flex-shrink-0 z-10">
                        {/* Decorative glow inside header */}
                        <div className="absolute top-0 right-0 p-24 bg-lime-400/5 blur-[60px] rounded-full -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-black text-foreground/30 text-[10px] tracking-[0.2em] uppercase">Next Unlock</h3>
                            <span className="bg-lime-400/10 border border-lime-400/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-lime-400">Target Lv. {Math.min(overallLevel + 1, 7)}</span>
                        </div>

                        <h1 className="font-display text-[4.5rem] text-foreground uppercase tracking-tight leading-none mb-1 flex items-end">
                            {targetTier.discount}<span className="text-4xl text-lime-400/40 pb-1 ml-1">%</span>
                        </h1>
                        <p className="font-black text-foreground/40 text-[11px] uppercase tracking-widest mt-2 px-1">Discount Reward on Fees</p>
                    </div>

                    {/* Bottom Tasks Section */}
                    <div className="p-8 flex-1 flex flex-col justify-start">
                        <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] mb-6">Path to Unlock Level {Math.min(overallLevel + 1, 7)}</p>

                        <ul className="space-y-5">
                            <li className="flex items-center gap-4">
                                <div className={cn("shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
                                    data.usdcDistributed >= targetTier.tokens
                                        ? "bg-lime-400 border-lime-400"
                                        : "bg-surface border-surface-border"
                                )}>
                                    {data.usdcDistributed >= targetTier.tokens ? <CheckCircle className="w-4 h-4 text-black" /> : <Clock className="w-4 h-4 text-foreground/30" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn("text-[11px] font-black uppercase tracking-widest", data.usdcDistributed >= targetTier.tokens ? "text-foreground" : "text-foreground/30")}>
                                        {targetTier.tokens.toLocaleString()} Tokens Minted
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className={cn("shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
                                    data.eventsCreated >= targetTier.events
                                        ? "bg-lime-400 border-lime-400"
                                        : "bg-surface border-surface-border"
                                )}>
                                    {data.eventsCreated >= targetTier.events ? <CheckCircle className="w-4 h-4 text-black" /> : <Clock className="w-4 h-4 text-foreground/30" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn("text-[11px] font-black uppercase tracking-widest", data.eventsCreated >= targetTier.events ? "text-foreground" : "text-foreground/30")}>
                                        {targetTier.events.toLocaleString()} Events Created
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className={cn("shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
                                    data.uniqueParticipants >= targetTier.participants
                                        ? "bg-lime-400 border-lime-400"
                                        : "bg-surface border-surface-border"
                                )}>
                                    {data.uniqueParticipants >= targetTier.participants ? <CheckCircle className="w-4 h-4 text-black" /> : <Clock className="w-4 h-4 text-foreground/30" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn("text-[11px] font-black uppercase tracking-widest", data.uniqueParticipants >= targetTier.participants ? "text-foreground" : "text-foreground/30")}>
                                        {targetTier.participants.toLocaleString()} Participants
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>

            <MilestonesTableModal
                open={tiersModalOpen}
                onClose={() => setTiersModalOpen(false)}
                overallLevel={overallLevel}
            />

            <MilestonesProgressModal
                open={progressModalOpen}
                onClose={() => setProgressModalOpen(false)}
                overallLevel={overallLevel}
                eventsCreated={data.eventsCreated}
                uniqueParticipants={data.uniqueParticipants}
                usdcDistributed={data.usdcDistributed}
                currentReward={currentReward}
            />
        </div>
    );
}
