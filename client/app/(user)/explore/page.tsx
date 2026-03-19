"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ImageOff, Zap } from "lucide-react";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreSidebar from "@/components/explore/ExploreSidebar";
import ExploreEventCard from "@/components/events/ExploreEventCard";
import { getEvents } from "@/services/event.service";
import { getFeaturedBrands } from "@/services/search.service";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

const DOMAINS = [
    "ALL", "AI", "DESIGN", "MARKETING", "WEB3",
    "GAMING", "FASHION", "FOOD", "TECH", "OTHER",
];

function toExploreEvent(ev: any) {
    return {
        id: ev.id,
        title: ev.title,
        image: ev.imageUrl || (ev.imageCid ? `${PINATA_GW}/${ev.imageCid}` : ""),
        status: ev.status,
        eventType: ev.eventType,
        baseReward: ev.baseReward ?? 0,
        topReward: ev.topReward ?? 0,
        leaderboardPool: ev.leaderboardPool ?? 0,
        participationCount:
            ev.eventType === "vote_only"
                ? (ev._count?.votes ?? 0)
                : (ev._count?.submissions ?? 0),
        brand: ev.brand ?? null,
        timeRemaining: "",
    };
}

function EventCardSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden border border-white/[0.05] bg-white/[0.02] animate-pulse">
            <div className="w-full aspect-[3/2] bg-white/[0.04]" />
            <div className="p-3 space-y-2">
                <div className="h-3 bg-white/[0.04] rounded w-3/4" />
                <div className="h-2.5 bg-white/[0.04] rounded w-1/2" />
            </div>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-foreground/20">
            <ImageOff className="w-8 h-8" />
            <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
        </div>
    );
}

export default function Explore() {
    const [activeTab, setActiveTab] = useState<"events" | "content">("events");
    const [activeSector, setActiveSector] = useState("ALL");
    const [activeDomain, setActiveDomain] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const [events, setEvents] = useState<any[]>([]);
    const [suggestedBrands, setSuggestedBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [brandsLoading, setBrandsLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setBrandsLoading(true);

        getEvents({ limit: 24 })
            .then((res) => setEvents(res.events || []))
            .catch(() => { })
            .finally(() => setLoading(false));

        getFeaturedBrands(6)
            .then((brandRes) =>
                setSuggestedBrands(
                    (brandRes.data || []).map((b: any) => ({
                        id: b.id,
                        name: b.name,
                        handle: `@${b.name.toLowerCase().replace(/\s+/g, "")}`,
                        avatar: b.logoUrl || (b.logoCid ? `${PINATA_GW}/${b.logoCid}` : ""),
                        isFollowed: false,
                    }))
                )
            )
            .catch(() => { })
            .finally(() => setBrandsLoading(false));
    }, []);

    // client-side filtering
    const filtered = useMemo(() => {
        let list = events.map(toExploreEvent);

        if (activeSector !== "ALL") {
            list = list.filter((e) =>
                e.brand?.categories?.some(
                    (c: string) => c.toUpperCase() === activeSector
                )
            );
        }

        if (activeDomain !== "ALL") {
            list = list.filter(
                (e) => e.title.toUpperCase().includes(activeDomain) ||
                    (e.brand?.name ?? "").toUpperCase().includes(activeDomain)
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (e) =>
                    e.title.toLowerCase().includes(q) ||
                    (e.brand?.name ?? "").toLowerCase().includes(q)
            );
        }

        return list;
    }, [events, activeSector, activeDomain, searchQuery]);

    const liveEvents = useMemo(
        () => filtered.filter((e) => e.status === "posting" || e.status === "voting"),
        [filtered]
    );
    const otherEvents = useMemo(
        () => filtered.filter((e) => e.status !== "posting" && e.status !== "voting"),
        [filtered]
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <div className="flex flex-col pb-24 lg:pb-10">
                    <ExploreHeader
                        activeSector={activeSector}
                        onSectorChange={(s) => { setActiveSector(s); setActiveDomain("ALL"); }}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />

                    <main className="w-full pt-6 flex flex-col lg:flex-row gap-10 lg:gap-12">

                        {/* ── Mobile: Brand strip ─────────────────────────── */}
                        {(brandsLoading || suggestedBrands.length > 0) && (
                            <section className="lg:hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">Recommended Brands</p>
                                    <button
                                        onClick={() => window.location.href = "/leaderboard?tab=brands"}
                                        className="text-[9px] font-black text-primary uppercase tracking-widest"
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                                    {brandsLoading
                                        ? Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="shrink-0 w-[120px] h-[140px] rounded-2xl bg-white/[0.03] animate-pulse" />
                                        ))
                                        : suggestedBrands.map((item) => (
                                            <MobileBrandCard key={item.id} item={item} />
                                        ))
                                    }
                                </div>
                            </section>
                        )}

                        {/* ── Main Feed ───────────────────────────────────── */}
                        <div className="flex-1 min-w-0 space-y-6">

                            {/* Tab bar */}
                            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-0.5 w-fit">
                                {(["events", "content"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            activeTab === tab
                                                ? "bg-white text-black shadow-sm"
                                                : "text-foreground/30 hover:text-foreground/60"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Domain filter — events only */}
                            {activeTab === "events" && (
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                    {DOMAINS.map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setActiveDomain(d)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 transition-all border",
                                                activeDomain === d
                                                    ? "bg-white/[0.08] border-white/25 text-white/80"
                                                    : "border-transparent text-white/20 hover:text-white/50"
                                            )}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ── Events Tab ────────────────────────────── */}
                            {activeTab === "events" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-10"
                                >
                                    {loading ? (
                                        /* Skeleton grid */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <EventCardSkeleton key={i} />
                                            ))}
                                        </div>
                                    ) : filtered.length === 0 ? (
                                        <div className="grid grid-cols-1">
                                            <EmptyState label="No events match your filters" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Live events section */}
                                            {liveEvents.length > 0 && (
                                                <section className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                                                            Live Now · {liveEvents.length} event{liveEvents.length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                                        {liveEvents.map((ev, i) => (
                                                            <motion.div
                                                                key={ev.id}
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: i * 0.04, duration: 0.2 }}
                                                            >
                                                                <ExploreEventCard event={ev} />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {/* Other events section */}
                                            {otherEvents.length > 0 && (
                                                <section className="space-y-4">
                                                    {liveEvents.length > 0 && (
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                                                            All Events
                                                        </p>
                                                    )}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                                        {otherEvents.map((ev, i) => (
                                                            <motion.div
                                                                key={ev.id}
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: i * 0.03, duration: 0.2 }}
                                                            >
                                                                <ExploreEventCard event={ev} />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Content Tab ───────────────────────────── */}
                            {activeTab === "content" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <EmptyState label="Creator content coming soon" />
                                </motion.div>
                            )}
                        </div>

                        {/* ── Desktop Sidebar ─────────────────────────────── */}
                        <ExploreSidebar
                            brands={suggestedBrands}
                            creators={[]}
                            loading={brandsLoading}
                        />
                    </main>
                </div>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}

// ─── Mobile Brand Card ────────────────────────────────────────────────────────
function MobileBrandCard({ item }: {
    item: { id: string; name: string; handle: string; avatar: string; isFollowed: boolean };
}) {
    const [followed, setFollowed] = useState(item.isFollowed);
    return (
        <a href={`/brand/${item.id}`} className="shrink-0 w-[120px] bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3 flex flex-col items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden flex items-center justify-center">
                {item.avatar ? (
                    <img src={item.avatar} className="w-full h-full object-cover" alt={item.name} />
                ) : (
                    <span className="text-base font-black text-foreground/30">{item.name[0]}</span>
                )}
            </div>
            <div className="text-center w-full">
                <p className="text-[10px] font-black text-foreground truncate">{item.name}</p>
                <p className="text-[8px] text-foreground/25 uppercase tracking-widest truncate mt-0.5">{item.handle}</p>
            </div>
            <button
                onClick={(e) => { e.preventDefault(); setFollowed((p) => !p); }}
                className={cn(
                    "w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                    followed
                        ? "bg-white/[0.04] border-white/[0.06] text-foreground/25"
                        : "bg-primary/10 border-primary/20 text-primary"
                )}
            >
                {followed ? "Following" : "Follow"}
            </button>
        </a>
    );
}
