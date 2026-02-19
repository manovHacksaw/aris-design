"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBrandAnalytics } from "@/services/mockBrandService";
import type { BrandAnalytics } from "@/types/api";

const DEMO_COLORS = ["bg-primary", "bg-secondary", "bg-accent", "bg-foreground/20"];

function formatStat(label: string, raw: number): string {
    if (label === "Total Views") return raw >= 1_000_000 ? `${(raw / 1_000_000).toFixed(1)}M` : `${(raw / 1000).toFixed(0)}K`;
    if (label === "Engagement Rate") return `${raw}%`;
    if (label === "Total Spend") return `$${raw.toLocaleString()}`;
    return raw.toLocaleString();
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-card-border p-6 rounded-[22px] space-y-3">
                    <div className="h-3 bg-secondary/60 rounded w-1/2" />
                    <div className="h-8 bg-secondary/60 rounded w-3/4" />
                    <div className="h-3 bg-secondary/60 rounded w-1/3" />
                </div>
            ))}
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

    if (loading) return <StatsSkeleton />;
    if (!analytics) return null;

    const { stats, campaignPerformance, demographics } = analytics;

    const statCards = [
        { label: "Total Views",      raw: stats.totalViews,      change: stats.viewsChange },
        { label: "Engagement Rate",  raw: stats.engagementRate,  change: stats.engagementChange },
        { label: "Total Spend",      raw: stats.totalSpend,      change: stats.spendChange },
        { label: "Conversions",      raw: stats.conversions,     change: stats.conversionsChange },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-card-border p-6 rounded-[22px] shadow-sm"
                >
                    <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">{stat.label}</div>
                    <div className="text-3xl font-black text-foreground">{formatStat(stat.label, stat.raw)}</div>
                    <div className="text-sm font-bold text-green-500 mt-2">
                        +{stat.change}% <span className="text-foreground/20 font-normal ml-1">vs last week</span>
                    </div>
                </motion.div>
            ))}

            {/* Campaign Performance Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="col-span-1 md:col-span-2 lg:col-span-3 bg-card border border-card-border p-6 rounded-[22px] h-[300px] flex flex-col justify-center items-center relative overflow-hidden"
            >
                <h3 className="absolute top-6 left-6 font-bold text-foreground">Campaign Performance</h3>
                <div className="flex items-end gap-2 h-[150px] w-full max-w-lg">
                    {campaignPerformance.map((h, i) => (
                        <motion.div
                            key={i}
                            className="flex-1 bg-primary/10 rounded-t-sm hover:bg-primary/30 transition-colors cursor-pointer relative group"
                            style={{ height: `${h}%` }}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.05 }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {h * 10}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Demographics */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card border border-card-border p-6 rounded-[22px]"
            >
                <h3 className="font-bold text-foreground mb-4">Top Demographics</h3>
                <div className="space-y-4">
                    {demographics.map((demo, i) => (
                        <div key={demo.label}>
                            <div className="flex justify-between text-xs font-bold text-foreground/60 mb-1.5 uppercase tracking-widest">
                                <span>{demo.label}</span>
                                <span>{demo.value}%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-card-border">
                                <div className={`h-full ${DEMO_COLORS[i % DEMO_COLORS.length]}`} style={{ width: `${demo.value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
