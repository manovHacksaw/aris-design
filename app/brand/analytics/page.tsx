"use client";

import { ArrowUp, ArrowDown, Download, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const stats = [
    { label: "Total Views", value: "2.4M", change: "+12.5%", trend: "up" },
    { label: "Engagement Rate", value: "8.4%", change: "+2.1%", trend: "up" },
    { label: "Total Spend", value: "$12.5k", change: "+5.0%", trend: "up" },
    { label: "Cost Per Engagement", value: "$0.12", change: "-4.2%", trend: "down" }, // Good trend for cost
];

const demographics = [
    { label: "18-24", value: 45, color: "bg-primary" },
    { label: "25-34", value: 30, color: "bg-primary/70" },
    { label: "35-44", value: 15, color: "bg-primary/40" },
    { label: "45+", value: 10, color: "bg-primary/20" },
];

const dailyViews = [45, 62, 58, 72, 85, 92, 88];

export default function BrandAnalyticsPage() {
    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Analytics</h1>
                    <p className="text-muted-foreground">Deep dive into your campaign performance.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors text-sm font-bold">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Last 7 Days
                    </button>
                    <button className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors text-foreground">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded-[24px] p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-2xl font-black text-foreground">{stat.value}</h3>
                            <div className={cn(
                                "flex items-center text-xs font-bold px-2 py-0.5 rounded-full",
                                (stat.trend === "up" && stat.label !== "Cost Per Engagement") || (stat.trend === "down" && stat.label === "Cost Per Engagement")
                                    ? "bg-green-500/10 text-green-600"
                                    : "bg-red-500/10 text-red-600"
                            )}>
                                {(stat.trend === "up" && stat.label !== "Cost Per Engagement") || (stat.trend === "down" && stat.label === "Cost Per Engagement")
                                    ? <ArrowUp className="w-3 h-3 mr-0.5" />
                                    : <ArrowDown className="w-3 h-3 mr-0.5" />
                                }
                                {stat.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Intearction Chart (CSS Only) */}
                <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-lg">Daily Engagement</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                <span className="text-xs font-medium text-muted-foreground">Views (k)</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[240px] flex items-end justify-between gap-2 md:gap-4 px-2">
                        {dailyViews.map((value, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                <div className="relative w-full max-w-[40px] bg-secondary rounded-t-lg h-full flex items-end overflow-hidden">
                                    <div
                                        className="w-full bg-primary transition-all duration-500 ease-out group-hover:bg-primary/80"
                                        style={{ height: `${value}%` }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {value}k
                                    </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Demographics */}
                <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-6">Audience Age</h3>
                    <div className="space-y-4">
                        {demographics.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-muted-foreground">{item.label}</span>
                                    <span className="font-bold">{item.value}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full", item.color)}
                                        style={{ width: `${item.value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border">
                        <h4 className="font-bold text-sm mb-2">Top Interests</h4>
                        <div className="flex flex-wrap gap-2">
                            {["Music", "Visual Arts", "Tech", "Fashion"].map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-secondary rounded-full text-xs font-bold text-muted-foreground">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
