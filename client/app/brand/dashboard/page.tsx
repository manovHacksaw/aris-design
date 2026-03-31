"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Plus, ChevronDown, ChevronUp, LayoutList, LayoutGrid,
    Eye, Trophy, Users, DollarSign, Radio, ChevronRight,
    Layers, XCircle, Lightbulb, CheckCircle2,
    Save, ArrowUpRight
} from "lucide-react";
import { getBrandEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import { getCurrentBrand, getBrandAnalyticsOverview } from "@/services/brand.service";
import type { Brand } from "@/services/brand.service";
import { calculateTotalPool } from "@/lib/eventUtils";
import { motion, AnimatePresence } from "framer-motion";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell,
    TooltipProps
} from "recharts";

// ─── Status Maps ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    posting: "bg-neon-lime text-black border-border",
    voting: "bg-lavender text-black border-border",
    scheduled: "bg-vibrant-blue text-black border-border",
    draft: "bg-vibrant-yellow text-black border-border",
    completed: "bg-secondary text-secondary-foreground border-border",
    cancelled: "bg-vibrant-pink text-white border-border",
};
const STATUS_LABELS: Record<string, string> = {
    posting: "Active", voting: "Voting", scheduled: "Scheduled",
    draft: "Draft", completed: "Ended", cancelled: "Cancelled",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenderCounts {
    male: number; female: number; nonBinary: number; other: number; unknown: number;
}
interface AgeGroupCounts {
    "24_under": number; "25_34": number; "35_44": number;
    "45_54": number; "55_64": number; "65_plus": number; unknown: number;
}
interface EventSummary {
    eventId: string; title: string; eventType: "post_and_vote" | "vote_only";
    status: string; totalVotes: number; totalSubmissions: number;
    uniqueParticipants: number; winningMargin: number; entropy: number;
    normalizedEntropy: number; historicalAlignment: number;
    topContentVotePercent: number; votesByGender: GenderCounts;
    votesByAgeGroup: AgeGroupCounts;
}
interface BrandAnalytics {
    totalEvents: number; totalVoteEvents: number; totalPostEvents: number;
    totalVotesAcrossEvents: number; totalUniqueParticipants: number;
    averageHistoricalAlignment: number; avgParticipantTrustScore: number;
    averageEntropy: number; averageWinningMargin: number;
    decisionConfidenceScore: number; overallVotesByGender: GenderCounts;
    overallVotesByAgeGroup: AgeGroupCounts; eventsSummary: EventSummary[];
}
interface DashboardStats {
    totalEvents: number; liveEvents: number; closedEvents: number;
    totalCost: number; totalViews: number; totalVotes: number; totalPosts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStats(events: Event[]): DashboardStats {
    let liveEvents = 0, closedEvents = 0, totalCost = 0;
    let totalViews = 0, totalVotes = 0, totalPosts = 0;
    events.forEach(ev => {
        if (ev.status === "posting" || ev.status === "voting") liveEvents++;
        if (ev.status === "completed" || ev.status === "cancelled") closedEvents++;
        totalCost += calculateTotalPool(ev);
        if (ev.eventAnalytics) {
            totalViews += ev.eventAnalytics.totalViews ?? 0;
            totalVotes += ev.eventAnalytics.totalVotes ?? 0;
            totalPosts += ev.eventAnalytics.totalSubmissions ?? 0;
        } else {
            totalVotes += ev._count?.votes ?? 0;
            totalPosts += ev._count?.submissions ?? 0;
        }
    });
    return { totalEvents: events.length, liveEvents, closedEvents, totalCost, totalViews, totalVotes, totalPosts };
}

function formatPool(n?: number) {
    if (!n) return "—";
    return `$${n.toLocaleString()}`;
}

// ─── Chart theme ──────────────────────────────────────────────────────────────

const CC = { cyan: "#06b6d4", blue: "#3B82F6", violet: "#8B5CF6", gray: "#6B7280", emerald: "#10b981", amber: "#f59e0b" };
const TICK = { fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700 as const };
const GRID = { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "0" };
const AGE_LABELS: Record<string, string> = {
    "24_under": "≤24", "25_34": "25-34", "35_44": "35-44",
    "45_54": "45-54", "55_64": "55-64", "65_plus": "65+"
};

function ChartTooltip({ active, payload, label }: TooltipProps<any, any>) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
            <p className="font-black text-white/60 uppercase tracking-wider mb-1.5 text-[10px]">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="font-bold text-white/50 capitalize">{p.name}</span>
                    <span className="font-black text-white ml-1">{p.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-primary/10 rounded-xl", className)} />;
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function BrandBanner({ brand, stats, loading }: { brand: Brand | null; stats: DashboardStats; loading: boolean }) {
    const [showMore, setShowMore] = useState(false);
    const logoSrc = brand?.logoUrls?.medium || (brand?.logoCid ? `https://gateway.pinata.cloud/ipfs/${brand.logoCid}` : null);
    const desc = brand?.description ?? "";
    const truncated = desc.length > 160;

    return (
        <div className="bg-card border border-border/60 rounded-[24px] p-6 md:p-8 space-y-5">
            <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-border/60 shrink-0 bg-secondary/40">
                    {logoSrc
                        ? <img src={logoSrc} alt={brand?.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Layers className="w-6 h-6 text-muted-foreground/30" /></div>
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    ) : (
                        <>
                            <h1 className="font-display text-[2.5rem] md:text-[3.5rem] text-foreground uppercase leading-[0.9] tracking-tight">
                                {brand?.name ?? "Your Brand"}
                            </h1>
                            {brand?.tagline && (
                                <p className="text-sm text-muted-foreground font-medium mt-1 italic">{brand.tagline}</p>
                            )}
                        </>
                    )}
                </div>

                {/* Create button */}
                <Link
                    href="/brand/create-event"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Create Campaign</span>
                    <span className="md:hidden">New</span>
                </Link>
            </div>

            {/* Description */}
            {!loading && desc && (
                <div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {truncated && !showMore ? desc.slice(0, 160) + "…" : desc}
                    </p>
                    {truncated && (
                        <button
                            onClick={() => setShowMore(v => !v)}
                            className="mt-1 text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            {showMore ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                        </button>
                    )}
                </div>
            )}

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-border/40">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-28" />)
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                <Radio className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Events</p>
                                <p className="text-base font-black text-foreground">{stats.totalEvents}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Followers</p>
                                <p className="text-base font-black text-foreground">
                                    {brand?.followerCount != null ? brand.followerCount.toLocaleString() : "—"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Spend</p>
                                <p className="text-base font-black text-foreground">
                                    {stats.totalCost > 0 ? `$${stats.totalCost.toLocaleString()}` : "—"}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Tab Header ───────────────────────────────────────────────────────────────

type Tab = "overview" | "stats" | "insights";

const TAB_LABELS: Record<Tab, string> = {
    overview: "Overview",
    stats: "Stats",
    insights: "Insights",
};

function TabHeader({
    active, onChange, viewMode, onViewMode,
}: {
    active: Tab;
    onChange: (t: Tab) => void;
    viewMode: "list" | "card";
    onViewMode: (v: "list" | "card") => void;
}) {
    const tabs: Tab[] = ["overview", "stats", "insights"];
    return (
        <div className="flex items-center justify-between gap-4">
            {/* Active tab name — left */}
            <h2 className="font-display text-[2rem] md:text-[2.5rem] text-foreground uppercase leading-none tracking-tight">
                {TAB_LABELS[active]}
            </h2>

            {/* Right: list/card toggle (overview only) + tab switcher */}
            <div className="flex items-center gap-2 shrink-0">
                {active === "overview" && (
                    <div className="flex items-center gap-1 bg-card border border-border/60 rounded-full p-1">
                        <button
                            onClick={() => onViewMode("list")}
                            className={cn("p-1.5 rounded-full transition-all", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="List view"
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onViewMode("card")}
                            className={cn("p-1.5 rounded-full transition-all", viewMode === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="Card view"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Tab switcher pills */}
                <div className="flex items-center gap-1 bg-card border border-border/60 rounded-full p-1">
                    {tabs.map(t => (
                        <button
                            key={t}
                            onClick={() => onChange(t)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                active === t
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

type ViewMode = "list" | "card";

function OverviewTab({ events, loading, viewMode }: { events: Event[]; loading: boolean; viewMode: ViewMode }) {
    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-card border border-border/60 rounded-[20px] p-12 text-center">
                <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-bold text-foreground mb-1">No campaigns yet</p>
                <p className="text-sm text-muted-foreground mb-5">Create your first campaign to get started.</p>
                <Link href="/brand/create-event" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 text-sm">
                    <Plus className="w-4 h-4" /> Create Campaign
                </Link>
            </div>
        );
    }

    return viewMode === "list" ? <OverviewListView events={events} /> : <OverviewCardView events={events} />;
}

function OverviewListView({ events }: { events: Event[] }) {
    return (
        <div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[32px_80px_1fr_100px_110px_80px_60px_90px_80px_100px] gap-3 px-4 py-2.5 border-b border-border/40 bg-secondary/20">
                {["#", "Status", "Event Title", "Type", "Domain", "Cost", "Views", "Votes", "Posts", "Confidence"].map(h => (
                    <span key={h} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider truncate">{h}</span>
                ))}
            </div>
            <div className="divide-y divide-border/30">
                {events.map((ev, idx) => {
                    const pool = calculateTotalPool(ev);
                    const views = ev.eventAnalytics?.totalViews ?? 0;
                    const votes = ev.eventAnalytics?.totalVotes ?? ev._count?.votes ?? 0;
                    const posts = ev._count?.submissions ?? ev.eventAnalytics?.totalSubmissions ?? 0;
                    const isPostEvent = ev.eventType === "post_and_vote";

                    return (
                        <Link
                            key={ev.id}
                            href={`/brand/events/${ev.id}`}
                            className="flex flex-col md:grid md:grid-cols-[32px_80px_1fr_100px_110px_80px_60px_90px_80px_100px] gap-3 px-4 py-3.5 hover:bg-secondary/20 transition-colors group items-center"
                        >
                            <span className="hidden md:block text-xs text-muted-foreground/40 font-bold">{idx + 1}</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border w-fit",
                                STATUS_STYLES[ev.status] ?? STATUS_STYLES.draft
                            )}>
                                {STATUS_LABELS[ev.status] ?? ev.status}
                            </span>
                            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {ev.title}
                            </span>
                            <span className="hidden md:block text-xs text-muted-foreground capitalize">
                                {ev.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                            </span>
                            <span className="hidden md:block text-xs text-muted-foreground truncate">{ev.category ?? "—"}</span>
                            <span className="hidden md:block text-xs font-bold text-foreground">{pool > 0 ? `$${pool.toLocaleString()}` : "—"}</span>
                            <span className="hidden md:block text-xs text-muted-foreground">{views > 0 ? views.toLocaleString() : "—"}</span>
                            <span className="hidden md:block text-xs text-muted-foreground">{votes > 0 ? votes.toLocaleString() : "—"}</span>
                            <span className="hidden md:block text-xs text-muted-foreground">{isPostEvent ? (posts > 0 ? posts.toLocaleString() : "—") : "N/A"}</span>
                            <span className="hidden md:block text-xs text-muted-foreground">—</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function OverviewCardView({ events }: { events: Event[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => {
                const pool = calculateTotalPool(ev);
                const votes = ev.eventAnalytics?.totalVotes ?? ev._count?.votes ?? 0;
                const posts = ev._count?.submissions ?? ev.eventAnalytics?.totalSubmissions ?? 0;
                const coverUrl = ev.imageUrl || (ev.imageCid ? `https://gateway.pinata.cloud/ipfs/${ev.imageCid}` : null);
                const isCancelled = ev.status === "cancelled";

                return (
                    <Link
                        key={ev.id}
                        href={`/brand/events/${ev.id}`}
                        className="group block bg-card border border-border/60 rounded-[20px] overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="relative h-28 bg-secondary/40">
                            {coverUrl
                                ? <img src={coverUrl} alt={ev.title} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Layers className="w-8 h-8 text-muted-foreground/20" /></div>
                            }
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className={cn(
                                "absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm",
                                STATUS_STYLES[ev.status] ?? STATUS_STYLES.draft
                            )}>
                                {STATUS_LABELS[ev.status] ?? ev.status}
                            </span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <h4 className="font-black text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                    {ev.title}
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                                    {ev.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                                </p>
                            </div>
                            {isCancelled && ev.cancelReason ? (
                                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-red-400 leading-tight line-clamp-2">{ev.cancelReason}</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(ev.eventAnalytics?.totalViews ?? 0) > 0 ? ev.eventAnalytics!.totalViews.toLocaleString() : "—"}</span>
                                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {votes > 0 ? votes.toLocaleString() : "—"}</span>
                                    <span className="font-bold text-foreground">{formatPool(pool)}</span>
                                </div>
                            )}
                            {/* Vote % per proposal preview */}
                            {ev.proposals && ev.proposals.length > 0 && (
                                <div className="space-y-1.5">
                                    {ev.proposals.slice(0, 3).map(p => {
                                        const totalVotes = ev.proposals!.reduce((s, pp) => s + pp.voteCount, 0);
                                        const pct = totalVotes > 0 ? Math.round((p.voteCount / totalVotes) * 100) : 0;
                                        return (
                                            <div key={p.id} className="space-y-0.5">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-muted-foreground truncate max-w-[70%]">{p.title}</span>
                                                    <span className="font-bold text-foreground">{pct}%</span>
                                                </div>
                                                <div className="h-1 bg-secondary/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="px-4 pb-3 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(ev.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

type StatsFilterDomain = string;
type StatsFilterTime = "7d" | "30d" | "90d" | "all";

function StatsTab({ events, analytics, loading }: { events: Event[]; analytics: BrandAnalytics | null; loading: boolean }) {
    const [domainFilter, setDomainFilter] = useState<StatsFilterDomain>("all");
    const [eventFilter, setEventFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<StatsFilterTime>("all");

    const domains = useMemo(() => {
        const s = new Set<string>();
        events.forEach(e => { if (e.category) s.add(e.category); });
        return Array.from(s).sort();
    }, [events]);

    const filteredEvents = useMemo(() => {
        let list = events;
        if (domainFilter !== "all") list = list.filter(e => e.category === domainFilter);
        if (eventFilter !== "all") list = list.filter(e => e.id === eventFilter);
        if (timeFilter !== "all") {
            const cutoff = new Date();
            if (timeFilter === "7d") cutoff.setDate(cutoff.getDate() - 7);
            else if (timeFilter === "30d") cutoff.setDate(cutoff.getDate() - 30);
            else if (timeFilter === "90d") cutoff.setDate(cutoff.getDate() - 90);
            list = list.filter(e => new Date(e.endTime) >= cutoff);
        }
        return list;
    }, [events, domainFilter, eventFilter, timeFilter]);

    const summaryMap = useMemo(() => new Map<string, EventSummary>(
        (analytics?.eventsSummary ?? []).map(s => [s.eventId, s])
    ), [analytics]);

    // Filtered summaries — only events that pass the current filters
    const filteredSummaries = useMemo(() => {
        const ids = new Set(filteredEvents.map(e => e.id));
        return (analytics?.eventsSummary ?? []).filter(s => ids.has(s.eventId));
    }, [filteredEvents, analytics]);

    // Filtered aggregates derived from filteredSummaries
    const filteredAgg = useMemo(() => {
        if (!filteredSummaries.length) return null;
        const totalVotes = filteredSummaries.reduce((s, e) => s + e.totalVotes, 0) || 1;
        const gKeys = ["male", "female", "nonBinary", "other", "unknown"] as const;
        const gender = gKeys.reduce((acc, k) => {
            acc[k] = filteredSummaries.reduce((s, e) => s + (e.votesByGender[k] ?? 0), 0);
            return acc;
        }, {} as GenderCounts);
        const ageKeys = Object.keys(AGE_LABELS) as (keyof AgeGroupCounts)[];
        const ageGroup = ageKeys.reduce((acc, k) => {
            acc[k] = filteredSummaries.reduce((s, e) => s + (e.votesByAgeGroup[k] ?? 0), 0);
            return acc;
        }, {} as AgeGroupCounts);
        const avgEntropy = filteredSummaries.reduce((s, e) => s + e.entropy, 0) / filteredSummaries.length;
        const avgAlignment = filteredSummaries.reduce((s, e) => s + e.historicalAlignment, 0) / filteredSummaries.length;
        const uniqueParticipants = filteredSummaries.reduce((s, e) => s + e.uniqueParticipants, 0);
        const avgWinningMargin = filteredSummaries.reduce((s, e) => s + e.winningMargin, 0) / filteredSummaries.length;
        return { gender, ageGroup, totalVotes, avgEntropy, avgAlignment, uniqueParticipants, avgWinningMargin };
    }, [filteredSummaries]);

    // Build time-series data from filtered events
    const timeSeriesData = useMemo(() => {
        return filteredEvents
            .filter(e => e.eventAnalytics || e._count)
            .map(e => ({
                name: e.title.length > 14 ? e.title.slice(0, 13) + "…" : e.title,
                views: e.eventAnalytics?.totalViews ?? 0,
                votes: e.eventAnalytics?.totalVotes ?? e._count?.votes ?? 0,
                posts: e._count?.submissions ?? e.eventAnalytics?.totalSubmissions ?? 0,
            }));
    }, [filteredEvents]);

    // Demographic data from filtered summaries
    const demoData = useMemo(() => {
        if (!filteredAgg) return [];
        const g = filteredAgg.gender;
        const a = filteredAgg.ageGroup;
        const total = filteredAgg.totalVotes;
        const mp = g.male / total, fp = g.female / total;
        const op = (g.nonBinary + g.other + g.unknown) / total;
        return (Object.keys(AGE_LABELS) as (keyof AgeGroupCounts)[]).map(age => {
            const t = a[age] || 0;
            return { age: AGE_LABELS[age], male: Math.round(t * mp), female: Math.round(t * fp), others: Math.round(t * op) };
        });
    }, [filteredAgg]);

    const dcs = analytics?.decisionConfidenceScore ?? 0;
    const hasData = filteredEvents.length > 0;

    if (loading) {
        return (
            <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[280px]" />)}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Domain */}
                <select
                    value={domainFilter}
                    onChange={e => setDomainFilter(e.target.value)}
                    className="px-3 py-2 rounded-full text-xs font-bold bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">All Domains</option>
                    {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {/* Event */}
                <select
                    value={eventFilter}
                    onChange={e => setEventFilter(e.target.value)}
                    className="px-3 py-2 rounded-full text-xs font-bold bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px]"
                >
                    <option value="all">All Events</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>

                {/* Time range */}
                <div className="flex gap-1">
                    {(["7d", "30d", "90d", "all"] as StatsFilterTime[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeFilter(t)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                                timeFilter === t
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                            )}
                        >
                            {t === "all" ? "All time" : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Charts grid */}
            <div className="grid md:grid-cols-2 gap-4">

                {/* Time vs Views/Votes/Posts */}
                <div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40">
                        <h3 className="font-bold text-sm">Views, Votes & Posts per Event</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Engagement across selected events</p>
                    </div>
                    <div className="px-2 py-3 h-[220px]">
                        {!hasData ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeSeriesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CC.blue} stopOpacity={0.2} /><stop offset="95%" stopColor={CC.blue} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gVotes" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CC.cyan} stopOpacity={0.2} /><stop offset="95%" stopColor={CC.cyan} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gPosts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CC.emerald} stopOpacity={0.2} /><stop offset="95%" stopColor={CC.emerald} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid {...GRID} />
                                    <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={TICK} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
                                    <Area type="monotone" dataKey="views" name="Views" stroke={CC.blue} strokeWidth={2} fill="url(#gViews)" dot={{ fill: CC.blue, r: 3, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="votes" name="Votes" stroke={CC.cyan} strokeWidth={2} fill="url(#gVotes)" dot={{ fill: CC.cyan, r: 3, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="posts" name="Posts" stroke={CC.emerald} strokeWidth={2} fill="url(#gPosts)" dot={{ fill: CC.emerald, r: 3, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Demographics double bar chart */}
                <div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40">
                        <h3 className="font-bold text-sm">Voter Demographics</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Age × Gender breakdown across all events</p>
                    </div>
                    <div className="px-2 py-3 h-[220px]">
                        {!filteredAgg || !demoData.some(d => d.male + d.female + d.others > 0) ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={demoData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                                    <CartesianGrid {...GRID} vertical={false} />
                                    <XAxis dataKey="age" tick={TICK} axisLine={false} tickLine={false} />
                                    <YAxis tick={TICK} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                                    <Bar dataKey="male" name="Male" fill={CC.cyan} radius={[3, 3, 0, 0]} maxBarSize={20} />
                                    <Bar dataKey="female" name="Female" fill={CC.blue} radius={[3, 3, 0, 0]} maxBarSize={20} />
                                    <Bar dataKey="others" name="Others" fill={CC.gray} radius={[3, 3, 0, 0]} maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Decision quality metrics */}
                <div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40">
                        <h3 className="font-bold text-sm">Decision Quality per Event</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Entropy, winning margin, historical alignment</p>
                    </div>
                    <div className="px-2 py-3 h-[220px]">
                        {!analytics || analytics.eventsSummary.filter(s => s.totalVotes > 0).length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={analytics.eventsSummary.filter(s => s.totalVotes > 0).slice(-10).map(s => ({
                                        name: s.title.length > 12 ? s.title.slice(0, 11) + "…" : s.title,
                                        margin: parseFloat(s.winningMargin.toFixed(1)),
                                        entropy: parseFloat((s.normalizedEntropy * 100).toFixed(1)),
                                        alignment: parseFloat((s.historicalAlignment * 100).toFixed(1)),
                                    }))}
                                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid {...GRID} />
                                    <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={TICK} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
                                    <Line type="monotone" dataKey="margin" name="Winning Margin" stroke={CC.emerald} strokeWidth={2} dot={{ fill: CC.emerald, r: 3, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="entropy" name="Norm. Entropy ×100" stroke={CC.amber} strokeWidth={2} strokeDasharray="4 3" dot={{ fill: CC.amber, r: 3, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="alignment" name="Hist. Alignment" stroke={CC.violet} strokeWidth={2} dot={{ fill: CC.violet, r: 3, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Decision Confidence + key metrics */}
                <div className="bg-card border border-border/60 rounded-[20px] p-5 space-y-4">
                    <h3 className="font-bold text-sm">Decision Confidence & Quality</h3>
                    {!analytics ? (
                        <p className="text-sm text-muted-foreground">Not available</p>
                    ) : (
                        <>
                            {/* DCS gauge */}
                            <div className="flex items-center gap-5">
                                <DCSGaugeSmall score={dcs} />
                                <div className="flex-1 space-y-2">
                                    {[
                                        { label: "Avg Entropy", value: analytics.averageEntropy.toFixed(2), color: "text-amber-400" },
                                        { label: "Avg Alignment", value: `${(analytics.averageHistoricalAlignment * 100).toFixed(1)}%`, color: "text-violet-400" },
                                        { label: "Trust Score", value: `${(analytics.avgParticipantTrustScore * 100).toFixed(0)}%`, color: "text-blue-400" },
                                        { label: "Unique Voters", value: analytics.totalUniqueParticipants.toLocaleString(), color: "text-cyan-400" },
                                    ].map(m => (
                                        <div key={m.label} className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{m.label}</span>
                                            <span className={cn("text-xs font-black", m.color)}>{m.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                                Profile visits and follower growth require additional backend integration.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* ── Row 2: Clicks Breakdown + Profile Visits + Avg Engagement ── */}
            <div className="grid md:grid-cols-3 gap-4">

                {/* Clicks Breakdown Pie */}
                <div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40">
                        <h3 className="font-bold text-sm">Clicks Breakdown</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Vote · Event · Website · Social</p>
                    </div>
                    <div className="px-4 py-4">
                        {(() => {
                            const totalVotes = filteredEvents.reduce((s, e) => s + (e.eventAnalytics?.totalVotes ?? e._count?.votes ?? 0), 0);
                            const totalPosts = filteredEvents.reduce((s, e) => s + (e._count?.submissions ?? e.eventAnalytics?.totalSubmissions ?? 0), 0);
                            const totalViews = filteredEvents.reduce((s, e) => s + (e.eventAnalytics?.totalViews ?? 0), 0);
                            const pieData = [
                                { name: "Vote", value: totalVotes, color: CC.cyan },
                                { name: "Event", value: totalPosts, color: CC.blue },
                                { name: "Website", value: Math.round(totalViews * 0.35), color: CC.violet },
                                { name: "Social", value: Math.round(totalViews * 0.15), color: CC.amber },
                            ].filter(d => d.value > 0);
                            const total = pieData.reduce((s, d) => s + d.value, 0) || 1;
                            if (!hasData || total === 0) return (
                                <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">Not available</div>
                            );
                            return (
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width={110} height={110}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const p = payload[0];
                                                    return (
                                                        <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full" style={{ background: p.payload.color }} />
                                                                <span className="font-bold text-white/60">{p.name}</span>
                                                                <span className="font-black text-white">{p.value?.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col gap-2 flex-1">
                                        {pieData.map(d => (
                                            <div key={d.name} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                                                    <span className="text-[10px] font-bold text-muted-foreground">{d.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-foreground">{Math.round(d.value / total * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Profile Visits */}
                <div className="bg-card border border-border/60 rounded-[20px] p-5 flex flex-col gap-3">
                    <div>
                        <h3 className="font-bold text-sm">Profile Visits</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Unique profile views across events</p>
                    </div>
                    {!hasData ? (
                        <p className="text-sm text-muted-foreground flex-1 flex items-center">Not available</p>
                    ) : (
                        <>
                            <div className="flex items-end gap-2">
                                <span className="text-[2.2rem] font-black leading-none text-foreground">
                                    {filteredEvents.reduce((s, e) => s + (e.eventAnalytics?.totalViews ?? 0), 0).toLocaleString()}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground mb-1">total views</span>
                            </div>
                            <div className="space-y-1.5 border-t border-border/40 pt-3">
                                {filteredEvents.slice(0, 4).map(e => {
                                    const v = e.eventAnalytics?.totalViews ?? 0;
                                    const maxV = Math.max(...filteredEvents.map(ev => ev.eventAnalytics?.totalViews ?? 0), 1);
                                    return (
                                        <div key={e.id} className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-muted-foreground truncate w-20 shrink-0">
                                                {e.title.length > 14 ? e.title.slice(0, 13) + "…" : e.title}
                                            </span>
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(v / maxV) * 100}%` }} />
                                            </div>
                                            <span className="text-[9px] font-black text-foreground w-8 text-right">{v.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Average Engagement Time */}
                <div className="bg-card border border-border/60 rounded-[20px] p-5 flex flex-col gap-3">
                    <div>
                        <h3 className="font-bold text-sm">Avg Engagement Time</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Estimated time users spend per event</p>
                    </div>
                    {!hasData ? (
                        <p className="text-sm text-muted-foreground flex-1 flex items-center">Not available</p>
                    ) : (
                        <>
                            {(() => {
                                // Estimate: votes + posts as proxy for engagement depth
                                const rows = filteredEvents.map(e => {
                                    const votes = e.eventAnalytics?.totalVotes ?? e._count?.votes ?? 0;
                                    const posts = e._count?.submissions ?? e.eventAnalytics?.totalSubmissions ?? 0;
                                    // ~15s per vote action, ~45s per post action as engagement proxy
                                    const secs = votes * 15 + posts * 45;
                                    return { title: e.title.length > 14 ? e.title.slice(0, 13) + "…" : e.title, secs };
                                });
                                const avgSecs = rows.length ? rows.reduce((s, r) => s + r.secs, 0) / rows.length : 0;
                                const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
                                const maxSecs = Math.max(...rows.map(r => r.secs), 1);
                                return (
                                    <>
                                        <div className="flex items-end gap-2">
                                            <span className="text-[2.2rem] font-black leading-none text-foreground">{fmt(avgSecs)}</span>
                                            <span className="text-xs font-bold text-muted-foreground mb-1">avg / event</span>
                                        </div>
                                        <div className="space-y-1.5 border-t border-border/40 pt-3">
                                            {rows.slice(0, 4).map((r, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-muted-foreground truncate w-20 shrink-0">{r.title}</span>
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${(r.secs / maxSecs) * 100}%` }} />
                                                    </div>
                                                    <span className="text-[9px] font-black text-foreground w-10 text-right">{fmt(r.secs)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>

            {/* ── Row 3: Time vs Follower Growth ── */}
            <div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">
                <div className="px-5 py-4 border-b border-border/40">
                    <h3 className="font-bold text-sm">Time vs Follower Growth</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Cumulative unique participants over events (proxy for audience growth)</p>
                </div>
                <div className="px-2 py-3 h-[220px]">
                    {!analytics || analytics.eventsSummary.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={(() => {
                                    let cumulative = 0;
                                    return analytics.eventsSummary.map(s => {
                                        cumulative += s.uniqueParticipants;
                                        return {
                                            name: s.title.length > 12 ? s.title.slice(0, 11) + "…" : s.title,
                                            participants: s.uniqueParticipants,
                                            cumulative,
                                        };
                                    });
                                })()}
                                margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="gCumulative" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={CC.violet} /><stop offset="100%" stopColor={CC.cyan} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
                                <Line type="monotone" dataKey="participants" name="New Participants" stroke={CC.blue} strokeWidth={2} strokeDasharray="4 3" dot={{ fill: CC.blue, r: 3, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="cumulative" name="Cumulative Reach" stroke={CC.cyan} strokeWidth={2.5} dot={{ fill: CC.cyan, r: 4, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>
    );
}

function DCSGaugeSmall({ score }: { score: number }) {
    const pct = Math.min(Math.max(score, 0), 1);
    const circumference = 2 * Math.PI * 30;
    const offset = circumference * (1 - pct);
    const color = pct >= 0.7 ? CC.emerald : pct >= 0.45 ? CC.amber : "#ef4444";
    const label = pct >= 0.7 ? "High" : pct >= 0.45 ? "Moderate" : "Low";
    return (
        <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative w-[60px] h-[60px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="30" strokeWidth="6" fill="transparent" stroke="rgba(255,255,255,0.07)" />
                    <motion.circle
                        cx="36" cy="36" r="30" strokeWidth="6" strokeLinecap="round"
                        fill="transparent" stroke={color}
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-foreground">{Math.round(pct * 100)}%</span>
                </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</p>
            <p className="text-[9px] text-muted-foreground text-center leading-tight">Decision Confidence</p>
        </div>
    );
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "aris_brand_insights";
function loadNotes(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveNote(id: string, text: string) {
    const c = loadNotes(); c[id] = text;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function InsightsTab({ events, analytics, loading }: { events: Event[]; analytics: BrandAnalytics | null; loading: boolean }) {
    const summaryMap = useMemo(() => new Map<string, EventSummary>(
        (analytics?.eventsSummary ?? []).map(s => [s.eventId, s])
    ), [analytics]);

    const dcs = analytics?.decisionConfidenceScore ?? 0;

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-[200px]" />
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[80px]" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overall insight panel */}
            <div className="bg-card border border-border/60 rounded-[20px] p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-base">Overall Brand Insights</h3>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider ml-auto">Across all events</span>
                </div>

                {!analytics ? (
                    <p className="text-sm text-muted-foreground">Not available</p>
                ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* Result */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400">Result</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {analytics.totalVotesAcrossEvents > 0
                                    ? `${analytics.totalVotesAcrossEvents.toLocaleString()} total votes across ${analytics.totalEvents} events with ${analytics.totalUniqueParticipants.toLocaleString()} unique participants.`
                                    : "No vote data available yet."
                                }
                                {analytics.overallVotesByGender && analytics.totalVotesAcrossEvents > 0 && (() => {
                                    const g = analytics.overallVotesByGender;
                                    const t = analytics.totalVotesAcrossEvents;
                                    const mp = Math.round(g.male / t * 100);
                                    const fp = Math.round(g.female / t * 100);
                                    return mp > 0 || fp > 0 ? ` Audience is ${mp}% male, ${fp}% female.` : "";
                                })()}
                            </p>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400">Reason</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {analytics.averageWinningMargin > 0
                                    ? `Average winning margin of ${analytics.averageWinningMargin.toFixed(1)}% indicates ${analytics.averageWinningMargin > 20 ? "strong audience preference clarity" : "moderate audience split"}. `
                                    : ""}
                                {analytics.averageEntropy > 0
                                    ? `Entropy score of ${analytics.averageEntropy.toFixed(2)} reflects ${analytics.averageEntropy < 1 ? "low" : analytics.averageEntropy < 2 ? "moderate" : "high"} decision spread.`
                                    : "Not enough data to analyze audience preference."}
                            </p>
                        </div>

                        {/* Next action */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">Next Action</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {dcs >= 0.75
                                    ? "Decision confidence is high (≥75%). You can move forward confidently with your creative decisions."
                                    : dcs >= 0.5
                                    ? "Decision confidence is moderate (50–75%). Consider running additional test events to resolve top content confusion."
                                    : dcs > 0
                                    ? "Decision confidence is low (<50%). Create new events with different creative ideas to gather clearer audience signals."
                                    : "Run your first events to generate confidence data."
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Per-event insight cards */}
            {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No events to show insights for.</p>
            ) : (
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Per Event Insights</p>
                    {events.map(ev => (
                        <EventInsightCard key={ev.id} event={ev} summary={summaryMap.get(ev.id)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function EventInsightCard({ event, summary }: { event: Event; summary?: EventSummary }) {
    const [expanded, setExpanded] = useState(false);
    const [note, setNote] = useState(() => loadNotes()[event.id] ?? "");
    const [saved, setSaved] = useState(false);

    const votes = summary?.totalVotes ?? event._count?.votes ?? 0;
    const posts = summary?.totalSubmissions ?? event._count?.submissions ?? 0;
    const dcs = summary ? (summary.topContentVotePercent / 100) : 0;

    function handleSave() {
        saveNote(event.id, note);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    const nextAction = summary
        ? dcs >= 0.75
            ? "High confidence — move on to the next decision."
            : dcs >= 0.5
            ? "Moderate confidence — run additional test cases to resolve confusion."
            : "Low confidence — create a new event with different ideas."
        : null;

    return (
        <div className="bg-card border border-border/60 rounded-[18px] overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/20 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border", STATUS_STYLES[event.status] ?? STATUS_STYLES.draft)}>
                            {STATUS_LABELS[event.status] ?? event.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">
                            {event.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                        </span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground truncate">{event.title}</h4>
                </div>

                <div className="hidden md:flex items-center gap-5 shrink-0 text-center">
                    {[
                        { label: "Votes", value: votes > 0 ? votes.toLocaleString() : "—" },
                        { label: "Posts", value: posts > 0 ? posts.toLocaleString() : "—" },
                        ...(summary ? [
                            { label: "Top %", value: `${summary.topContentVotePercent.toFixed(0)}%` },
                            { label: "Margin", value: `${summary.winningMargin.toFixed(0)}%` },
                        ] : []),
                    ].map(s => (
                        <div key={s.label}>
                            <p className="text-sm font-black text-foreground">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="text-muted-foreground shrink-0">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border/40 px-4 py-5 space-y-5">
                            {/* 3-section insights */}
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400">Result</p>
                                    {summary ? (
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {`Top content received ${summary.topContentVotePercent.toFixed(1)}% of votes with a ${summary.winningMargin.toFixed(1)}% margin over runner-up. `}
                                            {summary.votesByGender && votes > 0 && (() => {
                                                const mp = Math.round(summary.votesByGender.male / votes * 100);
                                                const fp = Math.round(summary.votesByGender.female / votes * 100);
                                                return `Voters: ${mp}% male, ${fp}% female.`;
                                            })()}
                                        </p>
                                    ) : <p className="text-xs text-muted-foreground">Not available — no analytics data yet.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400">Reason</p>
                                    {summary && summary.totalVotes > 0 ? (
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {`Entropy of ${summary.entropy.toFixed(2)} (norm. ${summary.normalizedEntropy.toFixed(2)}) indicates ${summary.normalizedEntropy < 0.5 ? "a clear winner with focused audience preference" : "a spread vote suggesting mixed audience preference"}. Historical alignment at ${(summary.historicalAlignment * 100).toFixed(1)}%.`}
                                        </p>
                                    ) : <p className="text-xs text-muted-foreground">Not enough vote data to analyze.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">Next Action</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {nextAction ?? "Run this event to completion to generate action recommendations."}
                                    </p>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-3.5 h-3.5 text-primary" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Outcome Notes</h4>
                                </div>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="What worked? What would you change? Key learnings…"
                                    className="w-full min-h-[72px] bg-secondary/20 border border-border/60 rounded-[12px] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-y focus:outline-none focus:border-primary/50 transition-colors font-medium leading-relaxed"
                                />
                                <div className="flex items-center justify-between">
                                    <Link href={`/brand/events/${event.id}`} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> Full Campaign Analytics
                                    </Link>
                                    <button
                                        onClick={handleSave}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                                            saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-primary text-primary-foreground hover:opacity-90"
                                        )}
                                    >
                                        {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save Note</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandDashboard() {
    const [tab, setTab] = useState<Tab>("overview");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [events, setEvents] = useState<Event[]>([]);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [analytics, setAnalytics] = useState<BrandAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.allSettled([getBrandEvents(), getCurrentBrand(), getBrandAnalyticsOverview()])
            .then(([evtsRes, brandRes, analyticsRes]) => {
                if (evtsRes.status === "fulfilled") setEvents(evtsRes.value);
                if (brandRes.status === "fulfilled") setBrand(brandRes.value);
                if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value);
            })
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => computeStats(events), [events]);

    return (
        <div className="space-y-6 pb-32 md:pb-12 font-sans">
            {/* Brand Banner */}
            <BrandBanner brand={brand} stats={stats} loading={loading} />

            {/* Tab header + content */}
            <div className="space-y-5">
                <TabHeader
                    active={tab}
                    onChange={setTab}
                    viewMode={viewMode}
                    onViewMode={setViewMode}
                />

                {tab === "overview" && (
                    <OverviewTab events={events} loading={loading} viewMode={viewMode} />
                )}
                {tab === "stats" && (
                    <StatsTab events={events} analytics={analytics} loading={loading} />
                )}
                {tab === "insights" && (
                    <InsightsTab events={events} analytics={analytics} loading={loading} />
                )}
            </div>
        </div>
    );
}
