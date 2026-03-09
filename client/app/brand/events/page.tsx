"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, ArrowUpRight, Users, Calendar, Layers, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandEvents } from "@/services/event.service";
import type { Event, EventStatus } from "@/services/event.service";
import { calculateTotalPool } from "@/lib/eventUtils";

const STATUS_STYLES: Record<string, string> = {
    posting:   "bg-[#00C853] text-white border-foreground",
    voting:    "bg-primary text-primary-foreground border-foreground",
    scheduled: "bg-foreground text-background border-foreground",
    draft:     "bg-secondary text-foreground border-foreground",
    completed: "bg-secondary text-muted-foreground border-foreground",
    cancelled: "bg-red-500 text-white border-foreground",
};

const STATUS_LABELS: Record<string, string> = {
    posting: "Active", voting: "Voting", scheduled: "Scheduled",
    draft: "Draft", completed: "Completed", cancelled: "Cancelled",
};

const FILTER_TABS = [
    { key: "all",       label: "All" },
    { key: "posting",   label: "Active" },
    { key: "voting",    label: "Voting" },
    { key: "scheduled", label: "Scheduled" },
    { key: "draft",     label: "Draft" },
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

function CoverImage({ cid, title }: { cid?: string; title: string }) {
    if (!cid) {
        return (
            <div className="w-full h-full bg-secondary flex items-center justify-center border-r-[3px] border-foreground">
                <Layers className="w-8 h-8 text-muted-foreground/40" />
            </div>
        );
    }
    return (
        <img
            src={`https://gateway.pinata.cloud/ipfs/${cid}`}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
    );
}

export default function BrandCampaignsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        getBrandEvents()
            .then(setEvents)
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = events;
        if (filter !== "all") list = list.filter(e => e.status === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e => e.title.toLowerCase().includes(q));
        }
        return list;
    }, [events, filter, search]);

    const countFor = (key: FilterKey) =>
        key === "all" ? events.length : events.filter(e => e.status === key).length;

    return (
        <div className="space-y-8 pb-32 md:pb-12 font-sans selection:bg-primary/30">

            {/* Header */}
            <header className="border-b-4 border-foreground pb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-6xl md:text-8xl font-display text-foreground uppercase tracking-tighter leading-none mb-4">
                            <span className="text-primary">Campaigns</span>
                        </h1>
                        <p className="text-xl font-bold uppercase tracking-widest border-l-4 border-primary pl-4">
                            Manage your active and past campaigns.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-end">
                        {/* Search */}
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search campaigns…"
                                className="pl-9 pr-4 py-3 rounded-xl bg-card border-[3px] border-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 w-64 shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#FDF6E3] uppercase tracking-wide placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                            />
                        </div>
                        <Link
                            href="/brand/create-event"
                            className="flex items-center gap-2 px-6 py-3 bg-foreground text-background font-black rounded-xl border-[3px] border-foreground hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] whitespace-nowrap uppercase tracking-widest text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">Create Campaign</span>
                            <span className="md:hidden">New</span>
                        </Link>
                    </div>
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
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-card border-[3px] border-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold"
                />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {FILTER_TABS.map(tab => {
                    const count = countFor(tab.key);
                    const isActive = filter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border-[3px] uppercase tracking-widest",
                                isActive
                                    ? "bg-primary text-primary-foreground border-foreground shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#FDF6E3] -translate-y-0.5 translate-x-0.5"
                                    : "bg-card text-foreground border-foreground hover:bg-secondary shadow-[2px_2px_0px_#1A1A1A] dark:shadow-[2px_2px_0px_#FDF6E3]"
                            )}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded-md border border-current",
                                    isActive ? "bg-white/20" : "bg-secondary"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Campaign list */}
            <div className="space-y-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-card border-[3px] border-foreground/20 rounded-2xl p-6 flex gap-4 items-center animate-pulse shadow-[4px_4px_0px_#1A1A1A20]">
                            <div className="w-24 h-20 rounded-xl bg-secondary shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="h-3 w-20 bg-secondary rounded" />
                                <div className="h-6 w-56 bg-secondary rounded" />
                                <div className="h-3 w-32 bg-secondary rounded" />
                            </div>
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="bg-card border-[3px] border-foreground rounded-2xl p-16 text-center shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]">
                        <div className="w-20 h-20 bg-secondary border-[3px] border-foreground rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3]">
                            <Layers className="w-10 h-10 text-foreground" />
                        </div>
                        <h3 className="font-black text-2xl text-foreground uppercase tracking-tight mb-2 font-display">
                            {search ? "No matches found" : "No campaigns yet"}
                        </h3>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">
                            {search ? "Try a different search term." : "Create your first campaign to get started."}
                        </p>
                        {!search && (
                            <Link
                                href="/brand/create-event"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-black rounded-xl border-[3px] border-foreground hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] uppercase tracking-widest text-sm"
                            >
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
                            <Link
                                key={event.id}
                                href={`/brand/events/${event.id}`}
                                className="group bg-card border-[3px] border-foreground rounded-2xl overflow-hidden flex flex-col md:flex-row hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]"
                            >
                                {/* Cover image */}
                                <div className="w-full md:w-32 h-28 md:h-auto shrink-0 overflow-hidden">
                                    <CoverImage cid={event.imageCid} title={event.title} />
                                </div>

                                {/* Main content */}
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 p-5 min-w-0">
                                    {/* Title + meta */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border-2",
                                                STATUS_STYLES[event.status] ?? STATUS_STYLES.draft
                                            )}>
                                                {STATUS_LABELS[event.status] ?? event.status}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-2 border-foreground/20 px-2 py-1 rounded">
                                                {event.eventType === "post_and_vote" ? "Post & Vote" : "Vote Only"}
                                            </span>
                                            {(event.status === "posting" || event.status === "voting" || event.status === "scheduled") && (
                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {timeLeft(event.endTime)}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black text-foreground tracking-tight truncate group-hover:text-primary transition-colors uppercase">
                                            {event.title}
                                        </h3>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">
                                            Pool: <span className="text-foreground font-display text-base">{formatPool(totalPool || event.topReward)}</span>
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex md:flex-col items-center justify-start md:justify-center gap-4 md:gap-2 border-t-[3px] md:border-t-0 md:border-l-[3px] border-foreground pt-3 md:pt-0 md:pl-5 shrink-0">
                                        <div className="text-center">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 justify-center">
                                                <Users className="w-3 h-3" /> Subs
                                            </div>
                                            <div className="font-display text-2xl text-foreground tracking-tighter">{submissions}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Votes</div>
                                            <div className="font-display text-2xl text-foreground tracking-tighter">{votes}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 justify-center">
                                                <Calendar className="w-3 h-3" /> Ends
                                            </div>
                                            <div className="font-black text-sm text-foreground">
                                                {new Date(event.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Manage CTA */}
                                    <div className="hidden md:flex items-center pl-4 border-l-[3px] border-foreground shrink-0">
                                        <div className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center border-[3px] border-foreground group-hover:bg-primary group-hover:border-primary transition-colors shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#FDF6E3]">
                                            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
