"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBrandAnalyticsOverview } from "@/services/brand.service";
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


const FALLBACK: BrandAnalytics = {
    brandId: "", period: "7d",
    stats: {
        totalViews: 1200000, viewsChange: 12,
        engagementRate: 8.5, engagementChange: 2.1,
        totalSpend: 4200, spendChange: 5,
        conversions: 850, conversionsChange: 15,
    },
    campaignPerformance: [40, 55, 35, 70, 60, 80, 45, 65, 50, 75, 85, 90],
    demographics: [
        { label: "18-24", value: 45 },
        { label: "25-34", value: 30 },
        { label: "35-44", value: 15 },
        { label: "45+",   value: 10 },
    ],
};

export default function BrandDashboardCharts() {
    const [analytics, setAnalytics] = useState<BrandAnalytics>(FALLBACK);

    useEffect(() => {
        getBrandAnalyticsOverview()
            .then((data) => { if (data) setAnalytics(data as BrandAnalytics); })
            .catch(() => {});
    }, []);

    const { stats, campaignPerformance, demographics } = analytics;
    if (!stats) return null;
    const dailyData = (campaignPerformance ?? []).slice(0, 7);
    const maxDaily = dailyData.length > 0 ? Math.max(...dailyData) : 1;

    return (
        <div className="space-y-8">

            {/* ── Section Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tight text-foreground flex items-center gap-3 border-l-8 border-accent pl-4">
                    <TrendingUp className="w-8 h-8 text-foreground hidden sm:block" />
                    Analytics
                </h2>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border-[3px] border-foreground rounded-xl hover:bg-secondary transition-colors text-sm font-black uppercase tracking-widest shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#FDF6E3]">
                        <Calendar className="w-4 h-4" />
                        Last 7 Days
                    </button>
                    <button className="p-2.5 bg-card border-[3px] border-foreground rounded-xl hover:bg-secondary transition-colors text-foreground shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#FDF6E3]">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {STAT_META.map(({ icon: Icon, label, key, changeKey, color, bg }, i) => {
                    const raw = stats[key];
                    const change = stats[changeKey];
                    return (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="bg-card border-[3px] border-foreground rounded-2xl p-6 flex items-center justify-between hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3] group"
                        >
                            <div>
                                <p className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">{label}</p>
                                <h2 className="text-4xl md:text-5xl font-display text-foreground tracking-tighter">
                                    {formatValue(key, raw)}
                                </h2>
                                <span className="font-bold text-xs mt-3 inline-flex items-center gap-1 bg-[#1A1A1A] text-[#FDF6E3] dark:bg-[#FDF6E3] dark:text-[#1A1A1A] px-3 py-1 rounded-full border-2 border-transparent">
                                    <ArrowUpRight className="w-4 h-4" /> +{change}%
                                </span>
                            </div>
                            <div className={cn(
                                "w-16 h-16 rounded-xl flex items-center justify-center bg-secondary border-[3px] border-foreground shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] group-hover:rotate-6 transition-transform duration-300 shrink-0",
                                bg
                            )}>
                                <Icon className={cn("w-8 h-8", color)} />
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
                    className="lg:col-span-2 bg-card border-[3px] border-foreground rounded-2xl p-6 shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-widest">Daily Engagement</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 border-l-4 border-primary pl-2">Weekly Progress Update</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-primary border-2 border-foreground" />
                                <span className="text-xs font-bold uppercase tracking-wide text-foreground">Today</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-primary/15 border-2 border-foreground/30" />
                                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Other</span>
                            </div>
                        </div>
                    </div>
                    {/* Arch-top bars */}
                    <div className="flex items-end gap-2 md:gap-3 px-1" style={{ height: 200 }}>
                        {dailyData.map((value, i) => {
                            const pct = maxDaily > 0 ? (value / maxDaily) * 100 : value;
                            const barH = Math.max(Math.round((pct / 100) * 158), 8);
                            const isToday = i === dailyData.length - 1;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-3 h-full group cursor-pointer">
                                    <div className="relative flex-1 w-full flex items-end">
                                        {/* Tooltip */}
                                        <div className="absolute left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border-2 border-foreground"
                                            style={{ bottom: barH + 8 }}>
                                            {(value * 800).toLocaleString()}
                                        </div>
                                        {/* Arch-top bar */}
                                        <motion.div
                                            className={cn(
                                                "w-full rounded-t-full transition-colors duration-200 border-x-2 border-t-2 border-foreground",
                                                isToday
                                                    ? "bg-primary group-hover:bg-primary/85"
                                                    : "bg-primary/[0.13] group-hover:bg-primary/25"
                                            )}
                                            initial={{ height: 0 }}
                                            animate={{ height: barH }}
                                            transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-black uppercase shrink-0">{DAYS[i]}</span>
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
                    className="bg-card border-[3px] border-foreground rounded-2xl p-6 shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3] space-y-5"
                >
                    <h3 className="font-black text-lg uppercase tracking-widest">Audience Insights</h3>

                    {/* Age */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-l-4 border-primary pl-2">Age Group</p>
                        <div className="space-y-3">
                            {demographics.map((item, i) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs font-black mb-1 uppercase tracking-wide">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="text-foreground">{item.value}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-secondary border border-foreground rounded-full overflow-hidden">
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-l-4 border-primary pl-2">Gender Split</p>
                        <div className="h-3 w-full border-[2px] border-foreground rounded-full overflow-hidden flex">
                            {GENDER.map((g) => (
                                <div key={g.label} className={cn("h-full", g.color)} style={{ width: `${g.value}%` }} />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2.5">
                            {GENDER.map((g) => (
                                <div key={g.label} className="flex items-center gap-1.5">
                                    <div className={cn("w-2.5 h-2.5 rounded-full border-2 border-foreground", g.color)} />
                                    <span className="text-xs text-muted-foreground font-black uppercase tracking-wide">{g.label} {g.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Interests */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-l-4 border-primary pl-2">Top Interests</p>
                        <div className="flex flex-wrap gap-2">
                            {INTERESTS.map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-secondary border-2 border-foreground text-foreground rounded-xl text-xs font-black uppercase tracking-wide">
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
                className="bg-card border-[3px] border-foreground rounded-2xl p-6 shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-black text-lg uppercase tracking-widest">Campaign Performance</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 border-l-4 border-primary pl-2">Monthly Progress Update</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-primary border-2 border-foreground" />
                            <span className="text-xs font-black uppercase tracking-wide text-foreground">This Month</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-primary/15 border-2 border-foreground/30" />
                            <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">Past</span>
                        </div>
                    </div>
                </div>
                {/* Arch-top bars */}
                <div className="flex items-end gap-1.5 md:gap-2" style={{ height: 160 }}>
                    {campaignPerformance.map((h, i) => {
                        const barH = Math.max(Math.round((h / 100) * 120), 6);
                        const isCurrent = i === campaignPerformance.length - 1;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full group cursor-pointer">
                                <div className="relative flex-1 w-full flex items-end">
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-black px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border-2 border-foreground"
                                        style={{ bottom: barH + 6 }}
                                    >
                                        {h}%
                                    </div>
                                    <motion.div
                                        className={cn(
                                            "w-full rounded-t-full transition-colors duration-200 border-x-2 border-t-2 border-foreground",
                                            isCurrent
                                                ? "bg-primary group-hover:bg-primary/85"
                                                : "bg-primary/[0.13] group-hover:bg-primary/25"
                                        )}
                                        initial={{ height: 0 }}
                                        animate={{ height: barH }}
                                        transition={{ duration: 0.65, delay: 0.6 + i * 0.04, ease: "easeOut" }}
                                    />
                                </div>
                                <span className="text-[9px] text-muted-foreground font-black uppercase shrink-0">{MONTHS[i]}</span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
