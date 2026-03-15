"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, ImageOff } from "lucide-react";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreSidebar from "@/components/explore/ExploreSidebar";
import SquareEventCard from "@/components/events/SquareEventCard";
import { getEvents } from "@/services/event.service";
import { getFeaturedBrands } from "@/services/search.service";

export default function Explore() {
  const [activeTab, setActiveTab] = useState<"events" | "content">("events");
  const [eventsViewAll, setEventsViewAll] = useState(false);
  const [activeSector, setActiveSector] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [events, setEvents] = useState<any[]>([]);
  const [suggestedBrands, setSuggestedBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [eventRes, brandRes] = await Promise.all([
          getEvents({ limit: 12 }),
          getFeaturedBrands(5),
        ]);
        setEvents(eventRes.events || []);
        setSuggestedBrands(
          (brandRes.data || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            handle: `@${b.name.toLowerCase().replace(/\s+/g, "")}`,
            avatar: b.logoUrl || b.avatar || "",
            isFollowed: false,
          }))
        );
      } catch (err) {
        console.error("Explore load failed", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayedEvents = eventsViewAll ? events : events.slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <SidebarLayout>
        <div className="flex flex-col pb-24 lg:pb-10">
          <ExploreHeader
            activeSector={activeSector}
            onSectorChange={setActiveSector}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <main className="w-full pt-8 flex flex-col lg:flex-row gap-10 lg:gap-14">
            {/* ── Mobile: Suggestions on top ────────────────────────────── */}
            {suggestedBrands.length > 0 && (
              <section className="lg:hidden space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Recommended Brands</h3>
                  <button className="text-[10px] font-black text-primary uppercase tracking-widest">View All</button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                  {suggestedBrands.map((item) => (
                    <MobileSuggestCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Main Feed ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Tab bar */}
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-2xl p-1 w-fit">
                {(["events", "content"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] transition-all",
                      activeTab === tab
                        ? "bg-white text-black shadow-sm"
                        : "text-white/30 hover:text-white/60"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* ── Events Tab ──────────────────────────────────────────── */}
              {activeTab === "events" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-[28px] bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : events.length === 0 ? (
                    <EmptyState label="No events found" />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {displayedEvents.map((ev) => (
                          <SquareEventCard
                            key={ev.id}
                            event={{
                              id: ev.id,
                              title: ev.title,
                              rewardPool: ev.leaderboardPool ? `$${ev.leaderboardPool.toLocaleString()}` : "",
                              baseReward: "",
                              description: "",
                              status: "live" as const,
                              participationCount: ev._count?.submissions || 0,
                              image: ev.imageUrl || "",
                              creator: {
                                name: ev.brand?.name || "Unknown",
                                avatar: ev.brand?.logoUrl || "",
                                handle: `@${(ev.brand?.name || "brand").toLowerCase().replace(/\s+/g, "")}`,
                              },
                              timeRemaining: "Live",
                              mode: ev.eventType === "vote_only" ? "vote" : "post",
                            }}
                          />
                        ))}
                      </div>

                      {!eventsViewAll && events.length > 6 && (
                        <button
                          onClick={() => setEventsViewAll(true)}
                          className="w-full py-4 rounded-2xl bg-white/[0.03] border border-white/8 text-[11px] font-black uppercase tracking-widest text-white/30 hover:bg-white/[0.07] hover:text-white/60 transition-all flex items-center justify-center gap-2"
                        >
                          View all events <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* ── Content Tab ─────────────────────────────────────────── */}
              {activeTab === "content" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EmptyState label="Creator content coming soon" />
                </motion.div>
              )}
            </div>

            {/* ── Desktop Sidebar ───────────────────────────────────────── */}
            <ExploreSidebar brands={suggestedBrands} creators={[]} />
          </main>
        </div>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </SidebarLayout>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/20">
      <ImageOff className="w-10 h-10" />
      <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Mobile Suggestion Card ────────────────────────────────────────────────────
function MobileSuggestCard({ item }: {
  item: { id: string; name: string; handle: string; avatar: string; isFollowed: boolean };
}) {
  const [followed, setFollowed] = useState(item.isFollowed);
  return (
    <div className="shrink-0 w-[140px] bg-white/[0.04] border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl border border-white/8 bg-white/5 overflow-hidden flex items-center justify-center">
        {item.avatar ? (
          <img src={item.avatar} className="w-full h-full object-cover" alt={item.name} />
        ) : (
          <span className="text-lg font-black text-white/30">{item.name[0]}</span>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="text-[11px] font-black text-white truncate">{item.name}</p>
        <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest truncate mt-0.5">{item.handle}</p>
      </div>
      <button
        onClick={() => setFollowed((p) => !p)}
        className={cn(
          "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
          followed
            ? "bg-white/5 border-white/8 text-white/30"
            : "bg-primary border-primary text-white shadow-lg shadow-primary/20"
        )}
      >
        {followed ? "Following" : "Follow"}
      </button>
    </div>
  );
}
