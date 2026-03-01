"use client";

import { useEffect, useState } from "react";
import BrandDashboardCharts from "@/components/BrandDashboardCharts";
import { Plus, ArrowUpRight, BarChart2, DollarSign, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/mockBrandService";
import type { BrandEvent } from "@/types/api";

/* ─── Status styling ──────────────────────────────────────────────────────── */
const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
    live:        "bg-green-500/10 text-green-500 border-green-500/20",
    ending_soon: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    scheduled:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
    draft:       "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    ended:       "bg-muted text-muted-foreground border-border",
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
    live: "Active", ending_soon: "Ending Soon",
    scheduled: "Scheduled", draft: "Draft", ended: "Ended",
};

const STATUS_TREND: Record<string, { label: string; cls: string }> = {
    live:        { label: "+Live Now",   cls: "bg-green-500/10 text-green-400 border-green-500/10" },
    ending_soon: { label: "Ending Soon", cls: "bg-orange-500/10 text-orange-400 border-orange-500/10" },
    scheduled:   { label: "Upcoming",   cls: "bg-blue-500/10 text-blue-400 border-blue-500/10" },
    draft:       { label: "Draft",      cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/10" },
    ended:       { label: "Completed",  cls: "bg-gray-500/10 text-gray-400 border-gray-500/10" },
};

/* ─── Campaign thumbnail images (cycled by index) ─────────────────────────── */
const CAMPAIGN_THUMBNAILS = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=400&auto=format&fit=crop",
];

function engagementPercent(event: BrandEvent): number {
    if (!event.totalSubmissions) return 0;
    return Math.min(100, Math.round((event.totalSubmissions / 100) * 100));
}

export default function BrandDashboard() {
    const [events, setEvents] = useState<BrandEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        getBrandEvents()
            .then((res) => { setEvents(res.data.slice(0, 5)); setLoadingEvents(false); })
            .catch(() => setLoadingEvents(false));
    }, []);

    return (
        <div className="space-y-8 pb-32 md:pb-12">

            {/* ── Header ── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Overview</h1>
                    <p className="text-gray-400">Welcome back, Nike Inc.</p>
                </div>
                <Link
                    href="/brand/create-event"
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Create Campaign</span>
                    <span className="md:hidden">New</span>
                </Link>
            </header>

            {/* ── Analytics Charts ── */}
            <BrandDashboardCharts />

            {/* ── Active Campaigns — full-width, Content Performance style ── */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    Active Campaigns
                </h2>

                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-lg shadow-black/20">

                    {/* ── Desktop column header ── */}
                    <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border bg-secondary px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                        <div className="col-span-4">Campaign</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2 text-center">Pool</div>
                        <div className="col-span-2 text-center">Engagement</div>
                        <div className="col-span-2 text-right">Submissions</div>
                    </div>

                    {/* ── Body ── */}
                    {loadingEvents ? (
                        <div className="p-6 space-y-4 animate-pulse">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-20 h-14 bg-secondary/60 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-secondary/60 rounded w-1/2" />
                                        <div className="h-2 bg-secondary/60 rounded w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">No campaigns yet.</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {events.map((event, idx) => {
                                const pct = engagementPercent(event);
                                const thumbnail = CAMPAIGN_THUMBNAILS[idx % CAMPAIGN_THUMBNAILS.length];
                                const trend = STATUS_TREND[event.status] ?? STATUS_TREND.ended;

                                return (
                                    <div
                                        key={event.id}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-secondary/50 transition-colors group cursor-pointer"
                                    >
                                        {/* ── Campaign (col 4) ── */}
                                        <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                                            {/* Thumbnail */}
                                            <div className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border group-hover:border-primary/50 transition-colors shadow-sm">
                                                <img
                                                    src={thumbnail}
                                                    alt={event.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                                />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors pr-2 leading-tight">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border capitalize">
                                                        <Calendar className="w-3 h-3" /> {event.eventType}
                                                    </span>
                                                    {/* Mobile: status badge inline */}
                                                    <span className={cn(
                                                        "md:hidden inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                                                        CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.ended
                                                    )}>
                                                        {CAMPAIGN_STATUS_LABELS[event.status]}
                                                    </span>
                                                </div>
                                                {/* Mobile: pool + engagement */}
                                                <div className="md:hidden flex items-center gap-3 text-xs mt-1 w-full">
                                                    <span className="font-bold text-foreground">${event.leaderboardPool.toLocaleString()}</span>
                                                    <span className="text-primary font-bold ml-auto">{pct}% engaged</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Status (col 2) ── */}
                                        <div className="hidden md:flex col-span-2 flex-col items-center gap-1.5">
                                            <span className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.ended
                                            )}>
                                                {CAMPAIGN_STATUS_LABELS[event.status]}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                                trend.cls
                                            )}>
                                                {trend.label}
                                            </span>
                                        </div>

                                        {/* ── Pool (col 2) ── */}
                                        <div className="hidden md:flex col-span-2 flex-col items-center gap-1">
                                            <div className="flex items-center gap-1 group-hover:text-green-400 transition-colors">
                                                <DollarSign className="w-4 h-4 text-green-500" />
                                                <span className="text-lg font-mono font-black text-foreground group-hover:text-green-400 transition-colors tracking-tight">
                                                    {event.leaderboardPool.toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Pool</span>
                                        </div>

                                        {/* ── Engagement (col 2) ── */}
                                        <div className="hidden md:flex col-span-2 flex-col items-center gap-2">
                                            <span className="text-base font-bold text-foreground">{pct}%</span>
                                            <div className="w-full max-w-[100px] h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* ── Submissions (col 2) ── */}
                                        <div className="hidden md:flex col-span-2 flex-col items-end pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                                                <span className="text-lg font-mono font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                                                    {event.totalSubmissions?.toLocaleString() ?? "0"}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Submissions</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Footer ── */}
                    <div className="p-4 bg-card border-t border-border flex justify-center hover:bg-secondary/30 transition-colors cursor-pointer">
                        <Link
                            href="/brand/events"
                            className="text-sm text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-1"
                        >
                            View All Campaigns <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
