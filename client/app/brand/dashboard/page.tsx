"use client";

import { useEffect, useState } from "react";
import BrandDashboardCharts from "@/components/BrandDashboardCharts";
import {
    Plus, ArrowRight, ExternalLink, Users, Trophy, XCircle,
    ChevronRight, Layers, Radio, CheckCircle2, DollarSign,
    Eye, TrendingUp, ChevronDown, ChevronUp, MousePointerClick
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import { useNotifications } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { calculateTotalPool } from "@/lib/eventUtils";

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
    posting: "bg-neon-lime text-black border-border",
    voting: "bg-lavender text-black border-border",
    scheduled: "bg-vibrant-blue text-black border-border",
    draft: "bg-vibrant-yellow text-black border-border",
    completed: "bg-secondary text-secondary-foreground border-border",
    cancelled: "bg-vibrant-pink text-white border-border",
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
    posting: "Active", voting: "Voting",
    scheduled: "Scheduled", draft: "Draft", completed: "Ended", cancelled: "Cancelled",
};

function formatPool(pool?: number): string {
    return pool ? `$${pool.toLocaleString()}` : "—";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
    liveEvents: number;
    closedEvents: number;
    totalEvents: number;
    totalCost: number;
    costBreakdown: { id: string; title: string; pool: number; status: string }[];
    totalViews: number;
    totalVotes: number;
    totalPosts: number;
    viewToVoteRatio: number;
    costPerConversion: number;
}

function computeStats(allEvents: Event[]): DashboardStats {
    let liveEvents = 0, closedEvents = 0, totalCost = 0;
    let totalViews = 0, totalVotes = 0, totalPosts = 0;
    const costBreakdown: DashboardStats["costBreakdown"] = [];

    allEvents.forEach((ev) => {
        if (ev.status === "posting" || ev.status === "voting") liveEvents++;
        if (ev.status === "completed" || ev.status === "cancelled") closedEvents++;

        const pool = calculateTotalPool(ev);
        totalCost += pool;
        costBreakdown.push({ id: ev.id, title: ev.title, pool, status: ev.status });

        if (ev.eventAnalytics) {
            totalViews += ev.eventAnalytics.totalViews ?? 0;
            totalVotes += ev.eventAnalytics.totalVotes ?? 0;
            totalPosts += ev.eventAnalytics.totalSubmissions ?? 0;
        } else {
            totalVotes += ev._count?.votes ?? 0;
            totalPosts += ev._count?.submissions ?? 0;
        }
    });

    const totalConversions = totalVotes + totalPosts;
    const costPerConversion = totalConversions > 0 ? totalCost / totalConversions : 0;
    const viewToVoteRatio = totalVotes > 0 ? totalViews / totalVotes : 0;

    return {
        liveEvents, closedEvents, totalEvents: allEvents.length,
        totalCost, costBreakdown,
        totalViews, totalVotes, totalPosts,
        viewToVoteRatio, costPerConversion,
    };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
            <div className="h-3 w-28 bg-primary/20 rounded-full" />
            <div className="h-8 w-32 bg-primary/30 rounded-lg" />
            <div className="h-2.5 w-20 bg-primary/15 rounded-full" />
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
    icon: any;
    label: string;
    value: string;
    sub?: string;
    iconBg?: string;
    iconColor?: string;
}) {
    return (
        <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg ?? "bg-primary/10")}>
                    <Icon className={cn("w-4 h-4", iconColor ?? "text-primary")} />
                </div>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.12em]">{label}</p>
            </div>
            <p className="text-[1.75rem] font-black text-foreground leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground font-medium">{sub}</p>}
        </div>
    );
}

// ─── Cost Breakdown Table ─────────────────────────────────────────────────────

const PAGE_SIZE = 5;

function CostBreakdownTable({ breakdown }: { breakdown: DashboardStats["costBreakdown"] }) {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(breakdown.length / PAGE_SIZE);
    const visible = breakdown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    return (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-sm">Cost Breakdown</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Total spend per campaign</p>
                </div>
                <span className="text-[11px] font-black text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-full">
                    {breakdown.length} campaigns
                </span>
            </div>
            <div className="divide-y divide-border/30">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => {
                    const row = visible[i];
                    return row ? (
                        <div key={row.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/20 transition-colors group">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs text-muted-foreground/50 font-bold w-5 shrink-0">
                                    {page * PAGE_SIZE + i + 1}
                                </span>
                                <span className={cn(
                                    "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                    CAMPAIGN_STATUS_STYLES[row.status] ?? CAMPAIGN_STATUS_STYLES.draft
                                )}>
                                    {CAMPAIGN_STATUS_LABELS[row.status] ?? row.status}
                                </span>
                                <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                    {row.title}
                                </span>
                            </div>
                            <span className="text-sm font-black text-foreground shrink-0 ml-4">
                                {row.pool > 0 ? `$${row.pool.toLocaleString()}` : "—"}
                            </span>
                        </div>
                    ) : (
                        <div key={`empty-${i}`} className="flex items-center px-5 py-3.5 pointer-events-none select-none">
                            <span className="text-xs text-muted-foreground/20 font-bold w-5 shrink-0">{page * PAGE_SIZE + i + 1}</span>
                            <span className="h-4 w-0" />
                        </div>
                    );
                })}
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
                    <button
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                        className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronUp className="w-3.5 h-3.5 -rotate-90" /> Prev
                    </button>
                    <span className="text-[11px] font-bold text-muted-foreground">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages - 1}
                        className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Next <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ event }: { event: Event }) {
    const totalPool = calculateTotalPool(event);
    const submissions = event._count?.submissions ?? 0;
    const votes = event._count?.votes ?? 0;
    const coverUrl = event.imageUrl || (event.imageCid ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}` : null);
    const isCancelled = event.status === "cancelled";

    return (
        <Link
            href={`/brand/events/${event.id}`}
            className={cn(
                "group block bg-card border border-border/60 rounded-[20px] overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1",
                isCancelled && "opacity-75 hover:opacity-100"
            )}
        >
            <div className="relative h-28 bg-secondary/40">
                {coverUrl ? (
                    <img src={coverUrl} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <span className={cn(
                    "absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm",
                    CAMPAIGN_STATUS_STYLES[event.status] ?? CAMPAIGN_STATUS_STYLES.draft
                )}>
                    {CAMPAIGN_STATUS_LABELS[event.status] ?? event.status}
                </span>
            </div>
            <div className="p-4 space-y-3">
                <div>
                    <h4 className="font-black text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {event.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                        {event.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                    </p>
                </div>
                {isCancelled && event.cancelReason ? (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400 leading-tight line-clamp-2">{event.cancelReason}</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium"><Users className="w-3 h-3" /> {submissions}</span>
                        <span className="flex items-center gap-1 font-medium"><Trophy className="w-3 h-3" /> {votes}</span>
                        <span className="font-bold text-foreground">{formatPool(totalPool)}</span>
                    </div>
                )}
            </div>
            <div className="px-4 pb-3 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                    {new Date(event.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandDashboard() {
    const { user } = useUser();
    const { onboardingData } = useAuth();
    const brandName = user?.ownedBrands?.[0]?.name ?? onboardingData?.brandName ?? "Your Brand";

    const [events, setEvents] = useState<Event[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const { notifications, isLoading: loadingNotifs } = useNotifications();

    useEffect(() => {
        getBrandEvents()
            .then((evts) => {
                setAllEvents(evts);
                setEvents(evts.slice(0, 6));
                setLoadingEvents(false);
            })
            .catch(() => setLoadingEvents(false));
    }, []);

    const stats = computeStats(allEvents);

    return (
        <div className="space-y-8 pb-32 md:pb-12 font-sans">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight mb-1">
                        Overview
                    </h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                        Welcome back, {brandName}
                    </p>
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

            {/* ── 4 Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {loadingEvents ? (
                    Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        <StatCard
                            icon={Radio}
                            label="Live Events"
                            value={String(stats.liveEvents)}
                            sub={`of ${stats.totalEvents} total`}
                            iconBg="bg-emerald-500/15"
                            iconColor="text-emerald-500"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Closed Events"
                            value={String(stats.closedEvents)}
                            sub={`${stats.totalEvents - stats.liveEvents - stats.closedEvents} in progress`}
                            iconBg="bg-blue-500/15"
                            iconColor="text-blue-400"
                        />
                        <StatCard
                            icon={DollarSign}
                            label="Total Spend"
                            value={stats.totalCost > 0 ? `$${stats.totalCost.toLocaleString()}` : "—"}
                            sub="across all campaigns"
                            iconBg="bg-primary/10"
                            iconColor="text-primary"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Cost / Conversion"
                            value={stats.costPerConversion > 0 ? `$${stats.costPerConversion.toFixed(2)}` : "—"}
                            sub="per vote or post"
                            iconBg="bg-orange-500/15"
                            iconColor="text-orange-400"
                        />
                    </>
                )}
            </div>

            {/* ── Below: Engagement + Cost breakdown ── */}
            {!loadingEvents && allEvents.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Engagement breakdown */}
                    <div className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4">
                        <div>
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.12em]">Engagement</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Total across all campaigns</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {[
                                { icon: Eye, label: "Views", value: stats.totalViews, color: "text-blue-400", bar: "bg-blue-500" },
                                { icon: Trophy, label: "Votes", value: stats.totalVotes, color: "text-primary", bar: "bg-primary" },
                                { icon: Users, label: "Posts", value: stats.totalPosts, color: "text-emerald-400", bar: "bg-emerald-500" },
                            ].map(({ icon: Icon, label, value, color, bar }) => {
                                const max = Math.max(stats.totalViews, stats.totalVotes, stats.totalPosts, 1);
                                const pct = Math.round((value / max) * 100);
                                return (
                                    <div key={label} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                                <Icon className={cn("w-3.5 h-3.5", color)} />
                                                {label}
                                            </span>
                                            <span className="text-sm font-black text-foreground">
                                                {value > 0 ? value.toLocaleString() : "—"}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-500", bar)}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* View → Vote ratio */}
                        <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                <MousePointerClick className="w-3.5 h-3.5" />
                                View → Vote Ratio
                            </span>
                            <span className="text-sm font-black text-foreground">
                                {stats.viewToVoteRatio > 0 ? `${stats.viewToVoteRatio.toFixed(1)}x` : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Cost breakdown table */}
                    <div className="lg:col-span-2">
                        {stats.costBreakdown.some(r => r.pool > 0)
                            ? <CostBreakdownTable breakdown={stats.costBreakdown} />
                            : (
                                <div className="bg-card border border-border/60 rounded-2xl p-6 flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground">No spend data yet.</p>
                                </div>
                            )
                        }
                    </div>
                </div>
            )}

            {/* Detailed Analytics */}
            <BrandDashboardCharts />

            {/* Campaigns + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Active Campaigns */}
                <section className="lg:col-span-2 bg-card border border-border/60 rounded-[28px] overflow-hidden">
                    <div className="p-6 border-b border-border/60 flex justify-between items-center bg-secondary/10">
                        <h3 className="font-bold text-lg">Active Campaigns</h3>
                        <Link href="/brand/events" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {loadingEvents ? (
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-52 bg-secondary/50 rounded-[20px]" />
                            ))}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">No campaigns yet.</div>
                    ) : (
                        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {events.map(event => <CampaignCard key={event.id} event={event} />)}
                        </div>
                    )}
                </section>

                {/* Notifications + Pro Tip */}
                <aside className="space-y-6">
                    <div className="bg-card border border-border/60 rounded-[28px] p-6">
                        <h3 className="font-bold text-lg mb-4">Needs Attention</h3>
                        {loadingNotifs ? (
                            <div className="space-y-3 animate-pulse">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-12 bg-secondary/50 rounded-xl" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">All clear!</p>
                        ) : (
                            <div className="space-y-3">
                                {notifications.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/30 border border-border/50">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                            item.type === "reward" ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" :
                                                item.type === "event" ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" :
                                                    "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                                        )} />
                                        <div>
                                            <p className="text-sm font-bold leading-tight">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-neon-lime border-[1.5px] border-border rounded-xl p-6 shadow-card">
                        <h3 className="font-black text-black mb-2 uppercase tracking-tight">Pro Tip</h3>
                        <p className="text-sm text-black/80 mb-4 font-bold leading-snug">
                            Campaigns with video requirements get 40% higher engagement on average.
                        </p>
                        <Link href="#" className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full text-xs font-black hover:opacity-80 transition-opacity uppercase tracking-wide">
                            Case Study <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
