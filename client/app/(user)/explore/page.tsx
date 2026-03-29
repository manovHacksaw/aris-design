"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreSidebar from "@/components/explore/ExploreSidebar";
import DynamicBanner from "@/components/explore/DynamicBanner";
import EventRow from "@/components/explore/EventRow";
import BrandRow from "@/components/explore/BrandRow";
import ContentMosaic from "@/components/explore/ContentMosaic";

import { getExploreEvents, getExploreBrands, getExploreContent, ExploreEventsResponse } from "@/services/explore.service";
import { getFeaturedBrands } from "@/services/search.service";
import { useLoginModal } from "@/context/LoginModalContext";
import { useUser } from "@/context/UserContext";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

const DOMAINS = [
    "ALL", "AI", "DESIGN", "MARKETING", "WEB3",
    "GAMING", "FASHION", "FOOD", "TECH", "OTHER", "CLOSED"
];

function EmptyState({ label }: { label: string }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-foreground/20">
            <ImageOff className="w-8 h-8" />
            <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
        </div>
    );
}

export default function Explore() {
    const [activeTab, setActiveTab] = useState<"events" | "brands" | "content">("events");
    const [activeSector, setActiveSector] = useState("ALL"); // from Header (usually for searching global stuff)
    const [activeDomain, setActiveDomain] = useState("ALL"); // secondary pill filter
    const [searchQuery, setSearchQuery] = useState("");

    const [eventsData, setEventsData] = useState<ExploreEventsResponse | null>(null);
    const [brandsData, setBrandsData] = useState<any[]>([]);
    const [contentData, setContentData] = useState<any[]>([]);
    const [suggestedBrands, setSuggestedBrands] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        Promise.all([
            getExploreEvents().catch(() => null),
            getExploreBrands().catch(() => []),
            getExploreContent().catch(() => []),
            getFeaturedBrands(6).catch(() => ({ data: [] }))
        ]).then(([eventsRes, brandsRes, contentRes, featBrands]) => {
            if (eventsRes) setEventsData(eventsRes);
            setBrandsData(brandsRes || []);
            setContentData(contentRes || []);
            setSuggestedBrands(
                ((featBrands as any)?.data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    handle: `@${b.name.toLowerCase().replace(/\s+/g, "")}`,
                    avatar: b.logoUrl || (b.logoCid ? `${PINATA_GW}/${b.logoCid}` : ""),
                    isFollowed: false,
                }))
            );
            setLoading(false);
        });
    }, []);

    // Memoized processing for currently selected secondary tab filters
    const filteredDomains = useMemo(() => {
        if (!eventsData) return [];
        let rows = [...eventsData.domains];

        // Filter by Sector (Global from Header)
        if (activeSector !== "ALL") {
            rows = rows.filter(r => r.domain.toUpperCase() === activeSector);
        }

        // Filter by Domain (Pills)
        if (activeDomain !== "ALL" && activeDomain !== "CLOSED") {
            rows = rows.filter(r => r.domain.toUpperCase() === activeDomain);
        }

        // Search text matching
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            rows = rows.map(r => ({
                domain: r.domain,
                events: r.events.filter(e =>
                    e.title.toLowerCase().includes(q) ||
                    (e.brand?.name ?? "").toLowerCase().includes(q)
                )
            })).filter(r => r.events.length > 0);
        }

        return rows;
    }, [eventsData, activeSector, activeDomain, searchQuery]);

    const displayTrending = (activeDomain === "ALL" || activeDomain === "CLOSED" === false) && !searchQuery.trim() && eventsData?.trending?.length ? true : false;
    const displayClosed = (activeDomain === "ALL" || activeDomain === "CLOSED") && eventsData?.closed?.length ? true : false;

    // Brand filtering
    const filteredBrandsRows = useMemo(() => {
        let rows = [...brandsData];
        if (activeSector !== "ALL") {
            rows = rows.filter(b => b.categories?.some((c: string) => c.toUpperCase() === activeSector));
        }
        if (activeDomain !== "ALL" && activeDomain !== "CLOSED") {
            rows = rows.filter(b => b.categories?.some((c: string) => c.toUpperCase() === activeDomain));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            rows = rows.filter(b => b.name.toLowerCase().includes(q));
        }
        return rows;
    }, [brandsData, activeSector, activeDomain, searchQuery]);

    // Content filtering
    const filteredContent = useMemo(() => {
        let subs = [...contentData];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            subs = subs.filter(s =>
                (s.caption || "").toLowerCase().includes(q) ||
                (s.user?.username || "").toLowerCase().includes(q) ||
                (s.event?.title || "").toLowerCase().includes(q)
            );
        }
        // Domain filtering on content based on Event category
        if (activeDomain !== "ALL" && activeDomain !== "CLOSED") {
            // we'd filter submissions whose event brand is in that domain
            // content response includes event.brand.id but maybe not categories. We'll skip deep category filter or approximate.
            // Simplified: if active domain is not ALL, just skip complex content filtering for now
        }
        return subs;
    }, [contentData, searchQuery, activeDomain]);


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
                        {(loading || suggestedBrands.length > 0) && (
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
                                    {loading && suggestedBrands.length === 0
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

                            {/* Dynamic Banner Carousel (Shown only when in events tab and ALL domain, no search) */}
                            {activeTab === "events" && activeDomain === "ALL" && !searchQuery && eventsData?.trending && eventsData.trending.length > 0 && (
                                <DynamicBanner events={eventsData.trending.slice(0, 5)} />
                            )}

                            {/* Top level Navigation */}
                            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-0.5 w-fit">
                                {(["events", "brands", "content"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setActiveDomain("ALL"); }}
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

                            {/* Secondary Domain Pills */}
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

                            {loading ? (
                                <div className="space-y-12 animate-pulse mt-8">
                                    <div className="h-40 w-full bg-white/[0.04] rounded-2xl" />
                                    <div className="h-40 w-full bg-white/[0.04] rounded-2xl" />
                                </div>
                            ) : (
                                <>
                                    {/* ── Events Tab ────────────────────────────── */}
                                    {activeTab === "events" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="space-y-10"
                                        >
                                            {displayTrending && activeDomain !== "CLOSED" && (
                                                <EventRow
                                                    title={searchQuery ? "Search Results" : "Trending Events"}
                                                    events={eventsData!.trending}
                                                />
                                            )}

                                            {activeDomain !== "CLOSED" && filteredDomains.map((domainObj) => (
                                                <EventRow
                                                    key={domainObj.domain}
                                                    title={`${domainObj.domain} Events`}
                                                    events={domainObj.events}
                                                />
                                            ))}

                                            {displayClosed && (
                                                <EventRow
                                                    title="Closed Events"
                                                    events={eventsData!.closed}
                                                />
                                            )}

                                            {(!displayTrending && !displayClosed && filteredDomains.length === 0) && (
                                                <EmptyState label="No events found" />
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Brands Tab ────────────────────────────── */}
                                    {activeTab === "brands" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="space-y-10"
                                        >
                                            {filteredBrandsRows.length > 0 ? (
                                                filteredBrandsRows.map((brand) => (
                                                    <BrandRow key={brand.id} brand={brand} />
                                                ))
                                            ) : (
                                                <EmptyState label="No brands found" />
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
                                            {filteredContent.length > 0 ? (
                                                <ContentMosaic submissions={filteredContent} />
                                            ) : (
                                                <EmptyState label="No content found" />
                                            )}
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Desktop Sidebar ─────────────────────────────── */}
                        <ExploreSidebar
                            brands={suggestedBrands}
                            creators={[]}
                            loading={loading && suggestedBrands.length === 0}
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
    const { isAuthenticated } = useUser();
    const { openLoginModal } = useLoginModal();
    return (
        <a href={`/brand/${item.name.toLowerCase().trim().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`} className="shrink-0 w-[120px] bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3 flex flex-col items-center gap-2.5">
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
                onClick={(e) => { e.preventDefault(); if (!isAuthenticated) { openLoginModal(); return; } setFollowed((p) => !p); }}
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
