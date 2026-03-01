"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBrandAnalytics } from "@/services/mockBrandService";
import type { BrandAnalytics } from "@/types/api";
import { ArrowUpRight, Calendar, Download, TrendingUp, Users, DollarSign, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INTERESTS = ["Music", "Visual Arts", "Tech", "Fashion", "Fitness"];
const GENDER = [
    { label: "Female", value: 58, color: "bg-primary" },
    { label: "Male",   value: 35, color: "bg-primary/40" },
    { label: "Other",  value: 7,  color: "bg-primary/15" },
];

const STAT_META = [
    {
        icon: TrendingUp, label: "Total Views",
        key: "totalViews"      as const, changeKey: "viewsChange"       as const,
        color: "text-blue-400",   bg: "bg-blue-500/10",
    },
    {
        icon: Users,      label: "Engagement",
        key: "engagementRate"  as const, changeKey: "engagementChange"  as const,
        color: "text-purple-400", bg: "bg-purple-500/10",
    },
    {
        icon: DollarSign, label: "Total Spend",
        key: "totalSpend"      as const, changeKey: "spendChange"       as const,
        color: "text-yellow-400", bg: "bg-yellow-500/10",
    },
    {
        icon: Zap,        label: "Conversions",
        key: "conversions"     as const, changeKey: "conversionsChange" as const,
        color: "text-green-400",  bg: "bg-green-500/10",
    },
];

function formatValue(key: string, raw: number): string {
    if (key === "totalViews") return raw >= 1_000_000 ? `${(raw / 1_000_000).toFixed(1)}M` : `${(raw / 1000).toFixed(0)}K`;
    if (key === "engagementRate") return `${raw}%`;
    if (key === "totalSpend") return `$${raw.toLocaleString()}`;
    return raw.toLocaleString();
}

function Skeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                        <div className="h-3 bg-secondary/60 rounded w-1/2" />
                        <div className="h-8 bg-secondary/60 rounded w-3/4" />
                        <div className="h-3 bg-secondary/60 rounded w-1/3" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border border-border rounded-3xl h-[300px]" />
                <div className="bg-card border border-border rounded-3xl h-[300px]" />
            </div>
            <div className="bg-card border border-border rounded-3xl h-[220px]" />
        </div>
    );
}

export default function BrandDashboardCharts() {
    const [analytics, setAnalytics] = useState<BrandAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBrandAnalytics()
            .then(setAnalytics)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton />;
    if (!analytics) return null;

    const { stats, campaignPerformance, demographics } = analytics;
    const dailyData = campaignPerformance.slice(0, 7);
    const maxDaily = Math.max(...dailyData);

    return (
        <div className="space-y-6">

            {/* ── Section Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Analytics
                </h2>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors text-sm font-medium">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Last 7 Days
                    </button>
                    <button className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors text-foreground">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_META.map(({ icon: Icon, label, key, changeKey, color, bg }, i) => {
                    const raw = stats[key];
                    const change = stats[changeKey];
                    return (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:shadow-black/20 hover:border-gray-800 transition-all group"
                        >
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1 group-hover:text-gray-300 transition-colors">
                                    {label}
                                </p>
                                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                                    {formatValue(key, raw)}
                                </h2>
                                <span className="text-xs font-medium text-green-400 mt-2 inline-flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/10">
                                    <ArrowUpRight className="w-3 h-3" /> +{change}%
                                </span>
                            </div>
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10 border border-white/5 group-hover:scale-105 transition-transform duration-300",
                                bg
                            )}>
                                <Icon className={cn("w-7 h-7", color)} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Daily Engagement + Audience Insights ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Daily Engagement Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-lg shadow-black/20"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Daily Engagement</h3>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Weekly Progress Update</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                <span className="text-xs font-medium text-gray-400">Today</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary/15" />
                                <span className="text-xs font-medium text-gray-400">Other</span>
                            </div>
                        </div>
                    </div>
                    {/* XP-Analysis style arch-top bars */}
                    <div className="flex items-end gap-2 md:gap-3 px-1" style={{ height: 200 }}>
                        {dailyData.map((value, i) => {
                            const pct = maxDaily > 0 ? (value / maxDaily) * 100 : value;
                            const barH = Math.max(Math.round((pct / 100) * 158), 8);
                            const isToday = i === dailyData.length - 1;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-3 h-full group cursor-pointer">
                                    <div className="relative flex-1 w-full flex items-end">
                                        {/* Tooltip */}
                                        <div className="absolute left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                                            style={{ bottom: barH + 8 }}>
                                            {(value * 800).toLocaleString()}
                                        </div>
                                        {/* Arch-top bar */}
                                        <motion.div
                                            className={cn(
                                                "w-full rounded-t-full transition-colors duration-200",
                                                isToday
                                                    ? "bg-primary group-hover:bg-primary/85"
                                                    : "bg-primary/[0.13] group-hover:bg-primary/25"
                                            )}
                                            initial={{ height: 0 }}
                                            animate={{ height: barH }}
                                            transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">{DAYS[i]}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Audience Insights */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42 }}
                    className="bg-card border border-border rounded-3xl p-6 shadow-lg shadow-black/20 space-y-5"
                >
                    <h3 className="font-bold text-lg">Audience Insights</h3>

                    {/* Age */}
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-3">Age Group</p>
                        <div className="space-y-2.5">
                            {demographics.map((item, i) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs font-medium mb-1">
                                        <span className="text-gray-400">{item.label}</span>
                                        <span>{item.value}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary rounded-full"
                                            style={{ opacity: 1 - i * 0.18 }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.value}%` }}
                                            transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gender Split */}
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-3">Gender Split</p>
                        <div className="h-3 w-full rounded-full overflow-hidden flex">
                            {GENDER.map((g) => (
                                <div key={g.label} className={cn("h-full", g.color)} style={{ width: `${g.value}%` }} />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2.5">
                            {GENDER.map((g) => (
                                <div key={g.label} className="flex items-center gap-1.5">
                                    <div className={cn("w-2 h-2 rounded-full", g.color)} />
                                    <span className="text-xs text-gray-400 font-medium">{g.label} {g.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Interests */}
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-3">Top Interests</p>
                        <div className="flex flex-wrap gap-2">
                            {INTERESTS.map((tag) => (
                                <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Campaign Performance — Full Width ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52 }}
                className="bg-card border border-border rounded-3xl p-6 shadow-lg shadow-black/20"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-lg">Campaign Performance</h3>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Monthly Progress Update</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            <span className="text-xs font-medium text-gray-400">This Month</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary/15" />
                            <span className="text-xs font-medium text-gray-400">Past</span>
                        </div>
                    </div>
                </div>
                {/* XP-Analysis style arch-top bars */}
                <div className="flex items-end gap-1.5 md:gap-2" style={{ height: 160 }}>
                    {campaignPerformance.map((h, i) => {
                        const barH = Math.max(Math.round((h / 100) * 120), 6);
                        const isCurrent = i === campaignPerformance.length - 1;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full group cursor-pointer">
                                <div className="relative flex-1 w-full flex items-end">
                                    {/* Tooltip */}
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                                        style={{ bottom: barH + 6 }}
                                    >
                                        {h}%
                                    </div>
                                    {/* Arch-top bar */}
                                    <motion.div
                                        className={cn(
                                            "w-full rounded-t-full transition-colors duration-200",
                                            isCurrent
                                                ? "bg-primary group-hover:bg-primary/85"
                                                : "bg-primary/[0.13] group-hover:bg-primary/25"
                                        )}
                                        initial={{ height: 0 }}
                                        animate={{ height: barH }}
                                        transition={{ duration: 0.65, delay: 0.6 + i * 0.04, ease: "easeOut" }}
                                    />
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase shrink-0">{MONTHS[i]}</span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
