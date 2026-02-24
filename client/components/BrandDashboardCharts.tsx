"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBrandAnalytics } from "@/services/mockBrandService";
import type { BrandAnalytics } from "@/types/api";
import { ArrowUp, Calendar, Download, TrendingUp, Users, DollarSign, Zap } from "lucide-react";
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
    { icon: TrendingUp, label: "Total Views",  key: "totalViews"     as const, changeKey: "viewsChange"       as const },
    { icon: Users,      label: "Engagement",   key: "engagementRate" as const, changeKey: "engagementChange"  as const },
    { icon: DollarSign, label: "Total Spend",  key: "totalSpend"     as const, changeKey: "spendChange"       as const },
    { icon: Zap,        label: "Conversions",  key: "conversions"    as const, changeKey: "conversionsChange" as const },
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
                    <div key={i} className="bg-card border border-border rounded-[24px] p-6 space-y-3">
                        <div className="h-3 bg-secondary/60 rounded w-1/2" />
                        <div className="h-8 bg-secondary/60 rounded w-3/4" />
                        <div className="h-3 bg-secondary/60 rounded w-1/3" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border border-border rounded-[24px] h-[300px]" />
                <div className="bg-card border border-border rounded-[24px] h-[300px]" />
            </div>
            <div className="bg-card border border-border rounded-[24px] h-[220px]" />
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
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-xl font-black text-foreground tracking-tight">Analytics</h2>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors text-sm font-bold">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Last 7 Days
                    </button>
                    <button className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors text-foreground">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_META.map(({ icon: Icon, label, key, changeKey }, i) => {
                    const raw = stats[key];
                    const change = stats[changeKey];
                    return (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="bg-card border border-border rounded-[24px] p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-primary" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-foreground mb-2">{formatValue(key, raw)}</div>
                            <div className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                                <ArrowUp className="w-3 h-3" />
                                +{change}% vs last week
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Daily Engagement + Audience Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Engagement Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="lg:col-span-2 bg-card border border-border rounded-[24px] p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">Daily Engagement</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                <span className="text-xs font-medium text-muted-foreground">Views</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary/25" />
                                <span className="text-xs font-medium text-muted-foreground">Clicks</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[210px] flex items-end justify-between gap-2 md:gap-3 px-1">
                        {dailyData.map((value, i) => {
                            const pct = maxDaily > 0 ? (value / maxDaily) * 100 : value;
                            const clickPct = Math.max(pct - 20, 4);
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                    <div className="relative w-full bg-secondary rounded-t-xl h-full flex items-end overflow-hidden">
                                        <div
                                            className="absolute bottom-0 w-full bg-primary/20 rounded-t-xl"
                                            style={{ height: `${clickPct}%` }}
                                        />
                                        <div
                                            className="w-full bg-primary rounded-t-xl transition-all duration-500 ease-out group-hover:bg-primary/80 relative z-10"
                                            style={{ height: `${pct}%` }}
                                        />
                                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                            {(value * 800).toLocaleString()} views
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">{DAYS[i]}</span>
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
                    className="bg-card border border-border rounded-[24px] p-6 shadow-sm space-y-5"
                >
                    <h3 className="font-bold text-lg">Audience Insights</h3>

                    {/* Age */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Age Group</p>
                        <div className="space-y-2.5">
                            {demographics.map((item, i) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-muted-foreground">{item.label}</span>
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Gender Split</p>
                        <div className="h-3 w-full rounded-full overflow-hidden flex">
                            {GENDER.map((g) => (
                                <div key={g.label} className={cn("h-full", g.color)} style={{ width: `${g.value}%` }} />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2.5">
                            {GENDER.map((g) => (
                                <div key={g.label} className="flex items-center gap-1.5">
                                    <div className={cn("w-2 h-2 rounded-full", g.color)} />
                                    <span className="text-xs text-muted-foreground font-medium">{g.label} {g.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Interests */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Interests</p>
                        <div className="flex flex-wrap gap-2">
                            {INTERESTS.map((tag) => (
                                <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Campaign Performance — Full Width */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52 }}
                className="bg-card border border-border rounded-[24px] p-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Campaign Performance</h3>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last 12 Months</span>
                </div>
                <div className="h-[160px] flex items-end gap-1.5 md:gap-2.5">
                    {campaignPerformance.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
                            <div className="relative w-full h-full flex items-end">
                                <motion.div
                                    className="w-full bg-primary/15 rounded-t-lg group-hover:bg-primary/35 transition-colors"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 0.7, delay: 0.6 + i * 0.04 }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        {h}%
                                    </div>
                                </motion.div>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase shrink-0">{MONTHS[i]}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
