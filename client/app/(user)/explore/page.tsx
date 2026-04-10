"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ImageOff, Search, X, Youtube, Twitter, Instagram, LayoutGrid, Users } from "lucide-react";
import Link from "next/link";

import ExploreHeader from "@/components/explore/ExploreHeader";
import EventRow from "@/components/explore/EventRow";
import BrandRow from "@/components/explore/BrandRow";
import ContentMosaic from "@/components/explore/ContentMosaic";
import PremiumEventCard from "@/components/events/PremiumEventCard";

import {
    getExploreEvents,
    getExploreBrands,
    getExploreCreators,
    getExploreContent,
    ExploreEventsResponse
} from "@/services/explore.service";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

const DOMAINS = [
    "ALL", "AI", "DESIGN", "MARKETING", "WEB3",
    "GAMING", "FASHION", "FOOD", "TECH", "OTHER"
];

function EmptyState({ label }: { label: string }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-foreground/20">
            <ImageOff className="w-8 h-8" />
            <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
        </div>
    );
}

// Custom Hero Banner Component
function TopEventsHero({ events }: { events: any[] }) {
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
    const displayImage = event.image || event.imageUrl || (event.imageCid ? `${PINATA_GW}/${event.imageCid}` : "");

    return (
        <div className="relative w-full h-[280px] md:h-[340px] rounded-2xl overflow-hidden mb-0 group bg-[#0a0a0c] border border-white/5">
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Content Left */}
            <div className="absolute inset-y-0 left-0 w-full md:w-2/3 p-8 sm:p-12 md:p-14 flex flex-col justify-center z-10">
                <motion.div
                    key={`content-${event.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        {event.brand?.logoCid ? (
                            <img src={`${PINATA_GW}/${event.brand.logoCid}`} alt={event.brand.name} className="w-8 h-8 rounded-full border border-white/20 px-0"/>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 text-xs font-bold text-white">{event.brand?.name?.[0] || '?'}</div>
                        )}
                        <span className="text-white/80 font-bold text-sm tracking-wider capitalize">{event.brand?.name || 'Unknown'}</span>
                        <span className="text-white/30 font-medium text-xs mx-1">•</span>
                        <span className="text-white/50 font-medium text-xs capitalize tracking-wider">{event.brand?.categories?.[0] || 'Social'}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-5xl font-black capitalize text-white tracking-tight leading-[1.1] mb-6 line-clamp-3 drop-shadow-xl">
                        {event.title}
                    </h1>

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-6 text-white/60 text-sm font-medium tracking-wide capitalize">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-white" />
                                <span className="text-white font-bold">{((event._count?.submissions || 0) + (event._count?.votes || 0)).toLocaleString()}</span> 
                                <span>Participants</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                                <span className="text-white font-bold">
                                    ${((event.leaderboardPool || 0) + (event.topReward || 0) + (event.baseReward || 0)).toLocaleString()}
                                </span> 
                                <span>Total Pool</span>
                            </div>
                        </div>
                        <Link href={`/events/${event.id}`}>
                            <button className="px-8 py-3.5 bg-white text-black font-black capitalize tracking-wider rounded-full hover:scale-105 hover:bg-white/90 transition-all w-fit shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                {event.status === "voting" ? "Vote now" : "Submit your creation"}
                            </button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Pagination Dots */}
            <div className="absolute bottom-6 left-6 md:left-12 flex gap-2 z-10">
                {events.slice(0, 10).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={cn(
                            "h-1 rounded-full transition-all duration-300",
                            i === currentIndex ? "w-6 bg-white" : "w-2 bg-white/30 hover:bg-white/50"
                        )}
                    />
                ))}
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
                    "w-full flex items-center justify-between bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-xl pl-5 pr-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer backdrop-blur-md",
                    isOpen && "border-primary/40 bg-white/[0.05] text-white"
                )}
            >
                <span className="truncate mr-2">{value === "ALL" || value === "TRENDING" ? placeholder : value}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-300 text-white/20", isOpen ? "rotate-180 text-white" : "")}><path d="m6 9 6 6 6-6"/></svg>
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
                                            "w-full text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-l-2",
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
    const [activeTab, setActiveTab] = useState<"events" | "brands" | "content">("events");
    const [activeSector, setActiveSector] = useState("ALL"); 
    
    const [activeDomain, setActiveDomain] = useState("ALL");
    const [activePhase, setActivePhase] = useState("ALL"); // ALL, VOTING, POSTING, CLOSED
    const [sortOption, setSortOption] = useState("TRENDING");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [eventsData, setEventsData] = useState<ExploreEventsResponse | null>(null);
    const [brands, setBrands] = useState<any[]>([]);
    const [creators, setCreators] = useState<any[]>([]);
    const [contentData, setContentData] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingStatic, setLoadingStatic] = useState(true);
    const [brandEventStatus, setBrandEventStatus] = useState<"LIVE" | "CLOSED">("LIVE");

    // Initial load for brands & creators
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [brandsData, creatorsData, contentRes] = await Promise.all([
                    getExploreBrands().catch(() => []),
                    getExploreCreators().catch(() => []),
                    getExploreContent().catch(() => [])
                ]);
                setBrands(brandsData);
                setCreators(creatorsData);
                setContentData(contentRes);
            } catch (error) {
                console.error("Failed to load static explore data:", error);
            } finally {
                setLoadingStatic(false);
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

    // Brand filtering (Frontend)
    const brandsRows = useMemo(() => {
        let rows = [...brands];
        if (activeSector !== "ALL") {
            rows = rows.filter(b => b.categories?.some((c: string) => c.toUpperCase() === activeSector));
        }
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
            events: (b.events || []).filter((ev: any) => {
                const status = (ev.status || "").toLowerCase();
                const isFinal = status === "closed" || status === "completed";
                if (brandEventStatus === "CLOSED") return isFinal;
                return !isFinal;
            })
        })).filter(b => b.events.length > 0);
    }, [brands, activeSector, activeDomain, debouncedSearch, brandEventStatus]);

    // Creator filtering (Frontend)
    const creatorsRows = useMemo(() => {
        if (!creators) return [];
        return creators.map((creator: any) => ({
            id: creator.id,
            name: creator.displayName || creator.username || "Anonymous",
            handle: `@${creator.username || "user"}`,
            avatar: creator.avatarUrl || "",
            isFollowed: false,
            username: creator.username
        }));
    }, [creators]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <div className="flex flex-col pb-24 lg:pb-10">


                    {/* MARQUEE + HERO BANNER SECTION (PERSISTENT) */}
                    <>
                        {/* Marquee */}
                        <div className="w-full mb-4 overflow-hidden">
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
                            <div className="w-full mb-6 px-4 md:px-0">
                                <div className="w-full h-[280px] md:h-[340px] rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
                            </div>
                        ) : (
                            eventsData?.trending && eventsData.trending.length > 0 && (
                                <div className="w-full mb-6 px-4 md:px-0">
                                    <TopEventsHero events={eventsData.trending.slice(0, 10)} />
                                </div>
                            )
                        )}
                    </>

                    {/* ── Filter Bar ──────────────────────────────────── */}
                    <div className="w-full mb-6 px-4 md:px-0 relative z-40">
                        <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
                            
                            {/* Search Input */}
                            <div className="w-full lg:flex-1 relative group bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-primary/40 focus-within:bg-white/[0.05] rounded-xl overflow-hidden transition-all shadow-2xl shadow-black/40 flex items-center backdrop-blur-md">
                                <Search className="absolute left-4 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors shrink-0 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search campaigns and creators..."
                                    className="w-full bg-transparent py-4 pl-12 pr-12 text-[13px] font-bold text-foreground placeholder:text-foreground/30 placeholder:capitalize placeholder:tracking-wider placeholder:text-[10px] outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-4 text-foreground/20 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>



                            {/* Dropdowns & Toggle */}
                            <div className="w-full lg:w-auto flex flex-wrap items-center gap-3 shrink-0">
                                <ArisSelect 
                                    value={activeTab.toUpperCase()} 
                                    onChange={(val) => {
                                        const tab = val.toLowerCase() as any;
                                        setActiveTab(tab);
                                        setActivePhase("ALL"); // Reset event lifecycle filters when switching tabs
                                    }} 
                                    options={["EVENTS", "BRANDS", "CONTENT"]} 
                                    placeholder="Explore" 
                                    minWidth="140px"
                                />

                                <ArisSelect 
                                    value={activeDomain === "ALL" ? "ALL" : activeDomain} 
                                    onChange={(val) => setActiveDomain(val === "ALL" ? "ALL" : val)} 
                                    options={DOMAINS.map(d => d === "ALL" ? "ALL" : d)} 
                                    placeholder="All" 
                                    minWidth="120px"
                                />

                                {activeTab === "events" && (
                                    <ArisSelect
                                        value={activePhase === "ALL" ? "LIVE EVENTS" : activePhase}
                                        onChange={(val) => setActivePhase(val === "LIVE EVENTS" ? "ALL" : val)}
                                        options={["LIVE EVENTS", "VOTING", "POSTING", "CLOSED"]}
                                        placeholder="Phase"
                                        minWidth="160px"
                                    />
                                )}

                                 {activeTab === "brands" && (
                                    <ArisSelect
                                        value={brandEventStatus}
                                        onChange={(val) => setBrandEventStatus(val as "LIVE" | "CLOSED")}
                                        options={["LIVE", "CLOSED"]}
                                        placeholder="Live"
                                        minWidth="120px"
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
                                        className="flex items-center gap-2 px-4 py-4 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                                        title="Clear all filters"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Reset</span>
                                    </button>
                                )}


                            </div>
                        </div>
                    </div>

                    <main className="w-full flex flex-col lg:flex-row gap-10 lg:gap-12">
                        {/* ── Main Feed ───────────────────────────────────── */}
                        <div className="flex-1 min-w-0 space-y-8">



                            {loadingEvents && activeTab === "events" ? (
                                <div className="space-y-12 animate-pulse mt-8">
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
                                            className="space-y-12"
                                        >
                                            {/* Featured Section (Horizontal Scroll) */}
                                            {eventsData?.trending && eventsData.trending.length > 0 && !debouncedSearch && activeDomain === "ALL" && (
                                                <div className="mb-8">
                                                    <EventRow
                                                        title="Featured"
                                                        events={eventsData.trending.slice(0, 5)}
                                                    />
                                                </div>
                                            )}

                                            {/* All Campaigns Header (Matching layout) */}
                                            {eventsData?.allRanked && eventsData.allRanked.length > 0 ? (
                                                <div className="space-y-6">
                                                    <h3 className="text-xl font-black text-white capitalize tracking-wider pl-4 sm:pl-0 border-white/5">
                                                        {(debouncedSearch || activeDomain !== "ALL") ? "Search Results" : "All Campaigns"}
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
                                                        {eventsData.allRanked.map((ev) => (
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
                                            className="space-y-12"
                                        >
                                            <div className="space-y-12">
                                                {brandsRows.length > 0 ? (
                                                    brandsRows.map((brand) => (
                                                        <BrandRow key={brand.id} brand={brand} />
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
                </div>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
