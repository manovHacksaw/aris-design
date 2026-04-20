"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ImageOff, Search, X, Users } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

import EventRow from "@/components/explore/EventRow";
import BrandRow from "@/components/explore/BrandRow";
import ContentMosaic from "@/components/explore/ContentMosaic";
import PremiumEventCard from "@/components/events/PremiumEventCard";

import {
    getExploreEvents,
    getExploreBrands,
    getExploreContent,
    ExploreEventsResponse
} from "@/services/explore.service";
import { getEventsVotedByUser, type Event } from "@/services/event.service";
import { toBrandSlug } from "@/lib/eventUtils";
import { getUserSubmissions } from "@/services/user.service";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

const DOMAINS = [
    "ALL", "AI", "DESIGN", "MARKETING", "WEB3",
    "GAMING", "FASHION", "FOOD", "TECH", "OTHER"
];

type JoinedSubmission = {
    event?: Event | null;
};

type ExploreBrand = Parameters<typeof BrandRow>[0]["brand"];
type ExploreContentItem = Parameters<typeof ContentMosaic>[0]["submissions"][number];

function statusPriority(status?: string) {
    if (status === "posting") return 0;
    if (status === "voting") return 1;
    if (status === "scheduled") return 2;
    if (status === "completed") return 3;
    if (status === "cancelled") return 4;
    return 5;
}

function mergeEventData(base: Event, incoming?: Partial<Event> | null): Event {
    const merged: Event = {
        ...base,
        ...(incoming ?? {}),
        brand: incoming?.brand ?? base.brand,
        _count: incoming?._count ?? base._count ?? (
            base.eventAnalytics
                ? {
                    submissions: base.eventAnalytics.totalSubmissions,
                    votes: base.eventAnalytics.totalVotes,
                }
                : undefined
        ),
        participantAvatars: incoming?.participantAvatars ?? base.participantAvatars,
        eventAnalytics: incoming?.eventAnalytics ?? base.eventAnalytics,
    };

    return merged;
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-foreground/20">
            <ImageOff className="w-8 h-8" />
            <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
        </div>
    );
}

// Custom Hero Banner Component
function TopEventsHero({ events }: { events: Event[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!events || events.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % Math.min(10, events.length));
        }, 5000);
        return () => clearInterval(interval);
    }, [events]);

    if (!events || events.length === 0) return null;

    const event = events[currentIndex];
    const displayImage = event.imageUrl || (event.imageCid ? `${PINATA_GW}/${event.imageCid}` : "");

    return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-0 group bg-[#0a0a0c] border border-white/5 shadow-2xl">
            <AnimatePresence mode="wait">
                <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    {displayImage ? (
                        <img src={displayImage} alt={event.title} className="w-full h-full object-cover transition-transform duration-[10s] ease-linear group-hover:scale-110 px-0" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Content Left */}
            <div className="absolute inset-y-0 left-0 w-full md:w-2/3 p-3 sm:p-7 md:p-10 flex flex-col justify-end sm:justify-center z-10">
                <motion.div
                    key={`content-${event.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-1.5 sm:space-y-4"
                >
                    <div>
                        {/* Brand row */}
                        <Link
                            href={`/brand/${toBrandSlug(event.brand?.name || "")}`}
                            className="flex items-center gap-1.5 mb-1.5 sm:mb-3 w-fit hover:opacity-80 transition-opacity group/brand"
                        >
                            {event.brand?.logoCid ? (
                                <img src={`${PINATA_GW}/${event.brand.logoCid}`} alt={event.brand.name} className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-white/20 group-hover/brand:scale-110 transition-transform shadow-lg" />
                            ) : (
                                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 text-[10px] font-bold text-white group-hover/brand:scale-110 transition-transform">{event.brand?.name?.[0] || '?'}</div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-white font-black text-[9px] sm:text-xs tracking-widest uppercase group-hover/brand:text-primary transition-colors">{event.brand?.name || 'Unknown'}</span>
                                <span className="text-white/40 font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.15em]">{event.brand?.categories?.[0] || 'Official Brand'}</span>
                            </div>
                        </Link>

                        {/* Title */}
                        <h1 className="text-lg sm:text-3xl md:text-4xl lg:text-5xl font-black capitalize text-white tracking-tighter leading-tight mb-1.5 sm:mb-4 line-clamp-2 drop-shadow-2xl">
                            {event.title}
                        </h1>

                        {/* Stats */}
                        <div className="flex items-center gap-3 sm:gap-6 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] mb-1.5 sm:mb-4">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                                <Users className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white/80" />
                                <span className="text-white">{((event._count?.submissions || 0) + (event._count?.votes || 0)).toLocaleString()}</span>
                                <span className="text-white/50 hidden sm:inline">Participants</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 border-l border-white/10 pl-3 sm:pl-6">
                                <span className="text-primary font-black text-xs sm:text-base leading-none">
                                    ${((event.leaderboardPool || 0) + (event.topReward || 0) + (event.baseReward || 0)).toLocaleString()}
                                </span>
                                <span className="text-white/40 hidden sm:inline">Total Pool</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA + Dots */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href={`/events/${event.id}`}>
                            <button className="px-4 sm:px-8 py-1.5 sm:py-3 bg-white text-black font-black uppercase text-[8px] sm:text-[10px] tracking-[0.2em] rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all w-fit relative overflow-hidden group/btn">
                                <span className="relative z-10">{event.status === "voting" ? "Vote now" : "Submit entry"}</span>
                                <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            </button>
                        </Link>

                        {/* Pagination Dots */}
                        <div className="flex gap-1.5 sm:gap-2">
                            {events.slice(0, 10).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={cn(
                                        "h-1 sm:h-1.5 rounded-full transition-all duration-500",
                                        i === currentIndex ? "w-6 sm:w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]" : "w-2 sm:w-3 bg-white/20 hover:bg-white/40"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function ArisSelect({ value, onChange, options, placeholder, minWidth = "150px" }: { value: string, onChange: (v: string) => void, options: string[], placeholder: string, minWidth?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative shrink-0" style={{ minWidth }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-md pl-2 pr-2 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer backdrop-blur-md",
                    isOpen && "border-primary/40 bg-white/[0.05] text-white"
                )}
            >
                <span className="truncate mr-1">{value === "ALL" || value === "TRENDING" ? placeholder : value}</span>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-300 text-white/20 shrink-0", isOpen ? "rotate-180 text-white" : "")}><path d="m6 9 6 6 6-6" /></svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-2 w-full bg-[#0a0a0c] border border-white/20 rounded-xl overflow-hidden z-[999] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                        >
                            <div className="max-h-[300px] overflow-y-auto no-scrollbar py-2">
                                {options.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-[8px] font-bold uppercase tracking-[0.12em] transition-all border-l-2",
                                            (value === opt)
                                                ? "bg-white/10 border-primary text-white"
                                                : "border-transparent text-white/40 hover:bg-white/5 hover:text-white hover:border-white/20"
                                        )}
                                    >
                                        {opt === "ALL" || opt === "TRENDING" ? placeholder : opt}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Explore() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<"events" | "brands" | "content">("events");

    const [activeDomain, setActiveDomain] = useState("ALL");
    const [activePhase, setActivePhase] = useState("ALL"); // ALL, VOTING, POSTING, CLOSED
    const [sortOption, setSortOption] = useState("TRENDING");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [eventsData, setEventsData] = useState<ExploreEventsResponse | null>(null);
    const [brands, setBrands] = useState<ExploreBrand[]>([]);
    const [contentData, setContentData] = useState<ExploreContentItem[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingJoinedEvents, setLoadingJoinedEvents] = useState(false);
    const [brandEventStatus, setBrandEventStatus] = useState<"LIVE" | "CLOSED">("LIVE");
    const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);

    // Initial load for brands & creators
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [brandsData, contentRes] = await Promise.all([
                    getExploreBrands().catch(() => []),
                    getExploreContent().catch(() => [])
                ]);
                setBrands(brandsData);
                setContentData(contentRes);
            } catch (error) {
                console.error("Failed to load static explore data:", error);
            }
        };
        loadInitial();
    }, []);

    // Debounce search Query
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Events based on filters
    useEffect(() => {
        let isMounted = true;
        setLoadingEvents(true);
        const fetchEvents = async () => {
            try {
                const queryOptions = {
                    search: debouncedSearch || undefined,
                    category: activeDomain !== "ALL" ? activeDomain : undefined,
                    sort: sortOption !== "TRENDING" ? sortOption : undefined,
                    status: activePhase === "CLOSED" ? "CLOSED" : "OPEN",
                    type: activePhase === "VOTING" ? "VOTE" : activePhase === "POSTING" ? "POST" : undefined
                };
                const data = await getExploreEvents(queryOptions);
                if (isMounted) {
                    setEventsData(data);
                }
            } catch (error) {
                console.error("Failed to fetch explore events with filters", error);
            } finally {
                if (isMounted) setLoadingEvents(false);
            }
        };
        fetchEvents();
        return () => { isMounted = false; };
    }, [debouncedSearch, activeDomain, activePhase, sortOption]);

    useEffect(() => {
        let isMounted = true;

        if (!user?.id) {
            setJoinedEvents([]);
            return () => { isMounted = false; };
        }

        setLoadingJoinedEvents(true);

        const loadJoinedEvents = async () => {
            try {
                const [votedEvents, userSubmissions] = await Promise.all([
                    getEventsVotedByUser(user.id).catch(() => []),
                    getUserSubmissions(user.id).catch(() => []),
                ]);

                if (!isMounted) return;

                const eventsById = new Map<string, Event>();
                const addEvent = (event?: Event | null) => {
                    if (!event?.id) return;
                    const existing = eventsById.get(event.id);
                    eventsById.set(event.id, existing ? mergeEventData(existing, event) : mergeEventData(event));
                };

                votedEvents.forEach(addEvent);
                (userSubmissions as JoinedSubmission[]).forEach((submission) => addEvent(submission.event ?? null));

                const ordered = Array.from(eventsById.values()).sort((a, b) => {
                    const priorityDiff = statusPriority(a.status) - statusPriority(b.status);
                    if (priorityDiff !== 0) return priorityDiff;

                    const aTime = new Date(a.updatedAt || a.createdAt || a.endTime || 0).getTime();
                    const bTime = new Date(b.updatedAt || b.createdAt || b.endTime || 0).getTime();
                    return bTime - aTime;
                });

                setJoinedEvents(ordered);
            } catch (error) {
                console.error("Failed to load joined events:", error);
                if (isMounted) setJoinedEvents([]);
            } finally {
                if (isMounted) setLoadingJoinedEvents(false);
            }
        };

        loadJoinedEvents();

        return () => { isMounted = false; };
    }, [user?.id]);

    // Brand filtering (Frontend)
    const brandsRows = useMemo(() => {
        let rows = [...brands];
        if (activeDomain !== "ALL") {
            rows = rows.filter(b => b.categories?.some((c: string) => c.toUpperCase() === activeDomain));
        }
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            rows = rows.filter(b => b.name.toLowerCase().includes(q));
        }
        // Filter brand events by live/closed status
        return rows.map(b => ({
            ...b,
            events: (b.events || []).filter((ev) => {
                const status = (ev.status || "").toLowerCase();
                const isFinal = status === "closed" || status === "completed";
                if (brandEventStatus === "CLOSED") return isFinal;
                return !isFinal;
            })
        })).filter(b => b.events.length > 0);
    }, [brands, activeDomain, debouncedSearch, brandEventStatus]);

    const joinedEventRows = useMemo(() => {
        const exploreLookup = new Map<string, Partial<Event>>();

        (eventsData?.allRanked ?? []).forEach((event: Event) => {
            if (event?.id) {
                exploreLookup.set(event.id, event);
            }
        });

        return joinedEvents
            .map((event) => mergeEventData(event, exploreLookup.get(event.id)))
            .slice(0, 10);
    }, [eventsData?.allRanked, joinedEvents]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <div className="flex flex-col gap-3 sm:gap-4 pb-20 lg:pb-10">

                    {/* MARQUEE + HERO BANNER SECTION (PERSISTENT) */}
                    <>
                        {/* Marquee */}
                        <div className="w-full overflow-hidden">
                            <div className="flex gap-0 animate-marquee whitespace-nowrap">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <span key={i} className="inline-flex items-center gap-6 px-6 text-[11px] font-black uppercase tracking-[0.3em] text-foreground/30">
                                        <span>Join Events</span>
                                        <span className="text-primary">✦</span>
                                        <span>Earn Dollars</span>
                                        <span className="text-primary">✦</span>
                                        <span>Submit & Vote</span>
                                        <span className="text-primary">✦</span>
                                        <span>Win Rewards</span>
                                        <span className="text-primary">✦</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Banner */}
                        {loadingEvents ? (
                            <div className="w-full px-4 md:px-0">
                                <div className="w-full aspect-video rounded-2xl bg-white/3 border border-white/5 animate-pulse" />
                            </div>
                        ) : (
                            eventsData?.trending && eventsData.trending.length > 0 && (
                                <div className="w-full px-4 md:px-0">
                                    <TopEventsHero events={eventsData.trending.slice(0, 10)} />
                                </div>
                            )
                        )}
                    </>

                    {/* ── Filter Bar ──────────────────────────────────── */}
                    <div className="w-full px-4 md:px-0 relative z-40">
                        <div className="flex flex-col gap-2 w-full">

                            {/* Search Input */}
                            <div className="w-full relative group bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-primary/40 focus-within:bg-white/[0.05] rounded-lg overflow-hidden transition-all flex items-center backdrop-blur-md">
                                <Search className="absolute left-2.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors shrink-0 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-transparent py-2 sm:py-3 pl-8 pr-8 text-xs sm:text-sm font-bold text-foreground placeholder:text-foreground/30 outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 text-foreground/20 hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdowns & Toggle — always one row, no wrap */}
                            <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                                <ArisSelect
                                    value={activeTab.toUpperCase()}
                                    onChange={(val) => {
                                        const tab = val.toLowerCase() as "events" | "brands" | "content";
                                        setActiveTab(tab);
                                        setActivePhase("ALL");
                                    }}
                                    options={["EVENTS", "BRANDS", "CONTENT"]}
                                    placeholder="Explore"
                                    minWidth="80px"
                                />

                                <ArisSelect
                                    value={activeDomain === "ALL" ? "ALL" : activeDomain}
                                    onChange={(val) => setActiveDomain(val === "ALL" ? "ALL" : val)}
                                    options={DOMAINS.map(d => d === "ALL" ? "ALL" : d)}
                                    placeholder="All"
                                    minWidth="72px"
                                />

                                {activeTab === "events" && (
                                    <ArisSelect
                                        value={activePhase === "ALL" ? "LIVE" : activePhase}
                                        onChange={(val) => setActivePhase(val === "LIVE" ? "ALL" : val)}
                                        options={[
                                            "LIVE",
                                            "VOTING",
                                            "POSTING",
                                            "JOINED",
                                            "CLOSED"
                                        ].filter(o => o !== "JOINED" || !!user?.id)}
                                        placeholder="Phase"
                                        minWidth="76px"
                                    />
                                )}

                                {activeTab === "brands" && (
                                    <ArisSelect
                                        value={brandEventStatus}
                                        onChange={(val) => setBrandEventStatus(val as "LIVE" | "CLOSED")}
                                        options={["LIVE", "CLOSED"]}
                                        placeholder="Live"
                                        minWidth="72px"
                                    />
                                )}

                                {(activeDomain !== "ALL" || activePhase !== "ALL" || searchQuery !== "" || brandEventStatus !== "LIVE") && (
                                    <button
                                        onClick={() => {
                                            setActiveDomain("ALL");
                                            setActivePhase("ALL");
                                            setSearchQuery("");
                                            setBrandEventStatus("LIVE");
                                            setSortOption("TRENDING");
                                        }}
                                        className="flex items-center justify-center p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all shrink-0"
                                        title="Clear all filters"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <main className="w-full flex flex-col lg:flex-row gap-4 lg:gap-8">
                        {/* ── Main Feed ───────────────────────────────────── */}
                        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">

                            {loadingEvents && activeTab === "events" ? (
                                <div className="space-y-6 animate-pulse">
                                    <div className="h-60 w-full bg-white/[0.02] rounded-2xl border border-white/5" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="h-80 w-full bg-white/[0.02] rounded-2xl border border-white/5" />
                                        <div className="h-80 w-full bg-white/[0.02] rounded-2xl border border-white/5" />
                                        <div className="h-80 w-full bg-white/[0.02] rounded-2xl border border-white/5" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* ── Events Tab ────────────────────────────── */}
                                    {activeTab === "events" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4 sm:space-y-8"
                                        >
                                            {/* Featured Section (Horizontal Scroll) */}
                                            {eventsData?.trending && eventsData.trending.length > 0 && !debouncedSearch && activeDomain === "ALL" && activePhase !== "JOINED" && (
                                                <EventRow
                                                    title="Featured"
                                                    events={eventsData.trending.slice(0, 5)}
                                                />
                                            )}

                                            {/* All Campaigns Header (Matching layout) */}
                                            {eventsData?.allRanked && eventsData.allRanked.length > 0 ? (
                                                <div className="space-y-3 sm:space-y-4">
                                                    <h3 className="text-base sm:text-lg font-black text-white capitalize tracking-wider pl-4 sm:pl-0">
                                                        {(debouncedSearch || activeDomain !== "ALL") ? "Search Results" : activePhase === "JOINED" ? "My Joined Events" : "All Campaigns"}
                                                    </h3>
                                                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0">
                                                        {(activePhase === "JOINED" ? joinedEventRows : eventsData.allRanked).map((ev) => (
                                                            <PremiumEventCard key={ev.id} event={ev} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <EmptyState label="No campaigns found" />
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Brands Tab ────────────────────────────── */}
                                    {activeTab === "brands" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4 sm:space-y-8"
                                        >
                                            <div className="space-y-4 sm:space-y-8">
                                                {brandsRows.length > 0 ? (
                                                    brandsRows.map((brand) => (
                                                        <BrandRow key={brand.name} brand={{ id: brand.name, ...brand } as any} />
                                                    ))
                                                ) : (
                                                    <EmptyState label="No brands found" />
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── Content Tab ───────────────────────────── */}
                                    {activeTab === "content" && (
                                        <motion.div
                                            key="content"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-full"
                                        >
                                            {contentData.length > 0 ? (
                                                <ContentMosaic submissions={contentData} />
                                            ) : (
                                                <EmptyState label="No content found" />
                                            )}
                                        </motion.div>
                                    )}
                                </>
                            )}

                        </div>
                    </main>

                    {/* ── Joined Events Row (At the very end) ──────────────── */}
                    {!!user?.id && !loadingJoinedEvents && joinedEventRows.length > 0 && activePhase !== "JOINED" && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 sm:mt-10 mb-6 border-t border-white/5 pt-6 sm:pt-8"
                        >
                            <EventRow
                                title="Joined Events"
                                events={joinedEventRows}
                            />
                        </motion.div>
                    )}
                </div>

            </SidebarLayout>
        </div>
    );
}
