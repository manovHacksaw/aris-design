"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, Users, Calendar, Layers, Tag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/event.service";
import type { Event, EventStatus } from "@/services/event.service";
import { calculateTotalPool } from "@/lib/eventUtils";

const STATUS_STYLES: Record<string, string> = {
    posting: "bg-green-500/10 text-green-500 border-green-500/20",
    voting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
    posting: "Posting", voting: "Voting", scheduled: "Scheduled",
    draft: "Draft", completed: "Completed", cancelled: "Cancelled",
};

const FILTER_TABS = [
    { key: "all", label: "All" },
    { key: "posting", label: "Active" },
    { key: "voting", label: "Voting" },
    { key: "scheduled", label: "Scheduled" },
    { key: "draft", label: "Draft" },
    { key: "completed", label: "Completed" },
] as const;

type FilterKey = typeof FILTER_TABS[number]["key"];

function timeLeft(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
}

function formatPool(n?: number) {
    if (!n) return "—";
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function CoverImage({ imageUrl, cid, title }: { imageUrl?: string; cid?: string; title: string }) {
    const src = imageUrl || (cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : undefined);
    if (!src) {
        return (
            <div className="w-full h-full bg-secondary/60 flex items-center justify-center">
                <Layers className="w-6 h-6 text-muted-foreground/40" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
    );
}

function SkeletonCard() {
    return (
        <div className="bg-card border border-border/60 rounded-[24px] p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center animate-pulse">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-20 h-20 md:w-16 md:h-16 rounded-[16px] bg-secondary/60 shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-16 bg-secondary/60 rounded" />
                    <div className="h-5 w-48 bg-secondary/60 rounded" />
                    <div className="h-3 w-24 bg-secondary/60 rounded" />
                </div>
            </div>
            <div className="hidden md:flex gap-8 px-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="text-center space-y-1">
                        <div className="h-2 w-12 bg-secondary/60 rounded mx-auto" />
                        <div className="h-5 w-10 bg-secondary/60 rounded mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BrandCampaignsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [search, setSearch] = useState("");
    const [domainFilter, setDomainFilter] = useState<string>("all");

    useEffect(() => {
        getBrandEvents()
            .then(setEvents)
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, []);

    const domains = useMemo(() => {
        const set = new Set<string>();
        events.forEach(e => { if (e.category) set.add(e.category); });
        return Array.from(set).sort();
    }, [events]);

    const filtered = useMemo(() => {
        let list = events;
        if (filter !== "all") list = list.filter(e => e.status === filter);
        if (domainFilter !== "all") list = list.filter(e => e.category === domainFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e => e.title.toLowerCase().includes(q));
        }
        return list;
    }, [events, filter, domainFilter, search]);

    const countFor = (key: FilterKey) =>
        key === "all" ? events.length : events.filter(e => e.status === key).length;

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight mb-1">Campaigns</h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Manage your active and past campaigns.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search campaigns…"
                            className="pl-9 pr-4 py-2.5 rounded-full bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>
                    <Link
                        href="/brand/create-event"
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Create Campaign</span>
                        <span className="md:hidden">New</span>
                    </Link>
                </div>
            </header>

            {/* Mobile search */}
            <div className="relative md:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search campaigns…"
                    className="w-full pl-9 pr-4 py-3 rounded-[16px] bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Filter tabs + Domain dropdown */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {FILTER_TABS.map(tab => {
                        const count = countFor(tab.key);
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                    filter === tab.key
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={cn(
                                        "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                        filter === tab.key ? "bg-white/20" : "bg-secondary"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Domain dropdown */}
                <div className="relative shrink-0">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <select
                        value={domainFilter}
                        onChange={e => setDomainFilter(e.target.value)}
                        className={cn(
                            "appearance-none pl-8 pr-8 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
                            domainFilter !== "all"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                    >
                        <option value="all">All Domains</option>
                        {domains.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                ) : filtered.length === 0 ? (
                    <div className="bg-card border border-border/60 rounded-[24px] p-12 text-center">
                        <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="font-bold text-foreground mb-1">
                            {search ? "No campaigns match your search" : "No campaigns yet"}
                        </p>
                        <p className="text-sm text-muted-foreground mb-5">
                            {search ? "Try a different search term." : "Create your first campaign to get started."}
                        </p>
                        {!search && (
                            <Link href="/brand/create-event" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity text-sm">
                                <Plus className="w-4 h-4" /> Create Campaign
                            </Link>
                        )}
                    </div>
                ) : (
                    filtered.map(event => {
                        const submissions = event._count?.submissions ?? 0;
                        const votes = event._count?.votes ?? 0;
                        const totalPool = calculateTotalPool(event);

                        return (
                            <div
                                key={event.id}
                                className="group bg-card hover:bg-card/80 border border-border/60 rounded-[24px] p-4 md:p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col md:flex-row gap-4 md:items-center"
                            >
                                {/* Image & title */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-20 h-20 md:w-16 md:h-16 rounded-[16px] overflow-hidden shrink-0 border border-border/50 bg-secondary/40">
                                        <CoverImage imageUrl={event.imageUrl} cid={event.imageCid} title={event.title} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                                STATUS_STYLES[event.status] ?? STATUS_STYLES.draft
                                            )}>
                                                {STATUS_LABELS[event.status] ?? event.status}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-medium capitalize">
                                                {event.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                                            </span>
                                            {(event.status === "posting" || event.status === "voting" || event.status === "scheduled") && (
                                                <span className="text-[10px] text-muted-foreground">{timeLeft(event.endTime)}</span>
                                            )}
                                        </div>
                                        <h3 className="text-base md:text-lg font-black text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                                            {event.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Pool: {formatPool(totalPool || event.topReward)}
                                        </p>
                                    </div>
                                </div>

                                {/* Metrics — desktop */}
                                <div className="hidden md:flex items-center gap-6 px-4 border-l border-border/50 shrink-0">
                                    <div className="text-center w-20">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 flex items-center gap-1 justify-center">
                                            <Tag className="w-3 h-3" /> Domain
                                        </div>
                                        <div className="text-xs font-black text-foreground truncate" title={event.category ?? ""}>
                                            {event.category ?? "—"}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 flex items-center gap-1 justify-center">
                                            <Users className="w-3 h-3" /> Subs
                                        </div>
                                        <div className="text-lg font-black text-foreground">{submissions}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Votes</div>
                                        <div className="text-lg font-black text-foreground">{votes}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1 flex items-center gap-1 justify-center">
                                            <Calendar className="w-3 h-3" /> Ends
                                        </div>
                                        <div className="text-sm font-black text-foreground">
                                            {new Date(event.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics — mobile */}
                                <div className="flex md:hidden items-center justify-between gap-2 py-3 border-t border-border/50 text-xs font-bold">
                                    <span className="text-muted-foreground">{submissions} submissions</span>
                                    <span className="w-px h-3 bg-border" />
                                    <span className="text-muted-foreground">{votes} votes</span>
                                    <span className="w-px h-3 bg-border" />
                                    <span className="text-primary">{formatPool(totalPool)}</span>
                                </div>

                                {/* Manage button */}
                                <div className="flex items-center justify-end gap-2 md:pl-4 md:border-l md:border-border/50 shrink-0">
                                    <Link href={`/brand/events/${event.id}`} className="flex-1 md:flex-none">
                                        <button className="w-full md:w-auto px-4 py-2 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                            Manage <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
