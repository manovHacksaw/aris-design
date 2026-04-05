"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreSidebar from "@/components/explore/ExploreSidebar";
import EventRow from "@/components/explore/EventRow";
import BrandRow from "@/components/explore/BrandRow";
import ContentMosaic from "@/components/explore/ContentMosaic";
import { Search, X , Award} from "lucide-react";

import { 
    getExploreEvents, 
    getExploreBrands, 
    getExploreCreators,
    ExploreEventsResponse 
} from "@/services/explore.service";
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
    const [brands, setBrands] = useState<any[]>([]);
    const [creators, setCreators] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [evData, brandsData, creatorsData] = await Promise.all([
                    getExploreEvents().catch(() => null),
                    getExploreBrands().catch(() => []),
                    getExploreCreators().catch(() => [])
                ]);
                setEventsData(evData);
                setBrands(brandsData);
                setCreators(creatorsData);
            } catch (error) {
                console.error("Failed to load explore data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
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

    // Brand filtering
    const brandsRows = useMemo(() => {
        let rows = [...brands];
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
    }, [brands, activeSector, activeDomain, searchQuery]);

    // Creator filtering
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

    // Content filtering
    const filteredContent = useMemo(() => {
        // Placeholder for content logic
        return [];
    }, [searchQuery, activeDomain]);


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

                    {/* ── Search Bar ──────────────────────────────────── */}
                    <div className="w-full mb-10 px-4 md:px-0">
                        <div className="flex flex-col gap-6">
                            <div className="w-full max-w-2xl relative group">
                                <div className="absolute inset-px bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all blur-sm pointer-events-none" />
                                <div className="relative flex items-center bg-white/[0.04] border border-border group-focus-within:border-primary/40 rounded-2xl overflow-hidden transition-all shadow-xl shadow-black/20">
                                    <Search className="absolute left-4 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors shrink-0 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search events, brands, or creators..."
                                        className="w-full bg-transparent py-4 pl-12 pr-12 text-sm font-medium text-foreground placeholder:text-foreground/20 outline-none"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-4 text-foreground/20 hover:text-foreground/60 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] opacity-80">JOIN EVENTS. EARN DOLLARS.</h2>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Explore Opportunities</h1>
                            </div>
                        </div>
                    </div>

                    <main className="w-full flex flex-col lg:flex-row gap-10 lg:gap-12">

                        {/* ── Main Feed ───────────────────────────────────── */}
                        <div className="flex-1 min-w-0 space-y-8">

                            {/* Top level Navigation */}
                            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-0.5 w-fit">
                                {(["events", "brands", "content"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setActiveDomain("ALL"); }}
                                        className={cn(
                                            "px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                            activeTab === tab
                                                ? "bg-white text-black shadow-lg"
                                                : "text-foreground/30 hover:text-foreground/60"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Secondary Domain Pills */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                                {DOMAINS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setActiveDomain(d)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 transition-all border",
                                            activeDomain === d
                                                ? "bg-primary/20 border-primary/40 text-primary shadow-sm shadow-primary/10"
                                                : "bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40 hover:border-white/10"
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                                {activeTab === "events" && (
                                    <button
                                        onClick={() => setActiveDomain("CLOSED")}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 transition-all border",
                                            activeDomain === "CLOSED"
                                                ? "bg-white/10 border-white/20 text-white"
                                                : "bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40"
                                        )}
                                    >
                                        CLOSED
                                    </button>
                                )}
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
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-12"
                                        >
                                            {/* Trending Section */}
                                            {activeDomain === "ALL" && !searchQuery.trim() && eventsData?.trending && (
                                                <EventRow
                                                    title="Trending Events"
                                                    events={eventsData.trending.slice(0, 10)}
                                                />
                                            )}

                                            {/* Domain Sections */}
                                            {activeDomain !== "CLOSED" && filteredDomains.map((domainObj) => (
                                                <EventRow
                                                    key={domainObj.domain}
                                                    title={`${domainObj.domain} Events`}
                                                    events={domainObj.events}
                                                />
                                            ))}

                                            {/* Closed Section - Only show when explicitly filtered */}
                                            {activeDomain === "CLOSED" && eventsData?.closed && eventsData.closed.length > 0 && (
                                                <EventRow
                                                    title="Closed Events"
                                                    events={eventsData.closed}
                                                />
                                            )}

                                            {((activeDomain === "ALL" && !eventsData?.trending?.length && !filteredDomains.length) || (activeDomain !== "ALL" && activeDomain !== "CLOSED" && filteredDomains.length === 0) || (activeDomain === "CLOSED" && !eventsData?.closed?.length)) && (
                                                <EmptyState label="No events found" />
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
                                        >
                                            <ContentMosaic submissions={[]} />
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Desktop Sidebar ─────────────────────────────── */}
                        <div className="hidden lg:block">
                            <ExploreSidebar
                                brands={brandsRows.slice(0, 5).map(b => ({
                                    id: b.id,
                                    name: b.name,
                                    handle: `@${b.name.toLowerCase().replace(/\s+/g, "")}`,
                                    avatar: b.logoCid ? `${PINATA_GW}/${b.logoCid}` : "",
                                    isFollowed: false
                                }))}
                                creators={creatorsRows}
                                loading={loading}
                            />
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

