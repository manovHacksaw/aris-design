"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Users, Palette, MousePointerClick, TrendingUp, Trophy, ThumbsUp as LikeIcon,
  ArrowRight, Star, Sparkles, Layout, Video, Building2
} from "lucide-react";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreSidebar from "@/components/explore/ExploreSidebar";
import SquareEventCard from "@/components/events/SquareEventCard";
import { getEvents } from "@/services/event.service";
import { getFeaturedBrands } from "@/services/search.service";
import { useUser } from "@/context/UserContext";

const domainCategories = [
  { label: "UI/UX", icon: Layout },
  { label: "PRODUCT", icon: Star },
  { label: "MARKETING", icon: TrendingUp },
  { label: "MOTION", icon: Video },
  { label: "BRAND", icon: Building2 },
];

export default function Explore() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'events' | 'content'>('events');
  const [eventsViewAll, setEventsViewAll] = useState(false);
  const [activeDomain, setActiveDomain] = useState("UI/UX");

  const [events, setEvents] = useState<any[]>([]);
  const [suggestedBrands, setSuggestedBrands] = useState<any[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExploreData = async () => {
      setLoading(true);
      try {
        const [eventRes, brandRes] = await Promise.all([
          getEvents({ limit: 12 }),
          getFeaturedBrands(5)
        ]);

        setEvents(eventRes.events || []);

        setSuggestedBrands((brandRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          handle: `@${b.name.toLowerCase().replace(/\s+/g, '')}`,
          avatar: b.avatar || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80",
          isFollowed: false
        })));

        // Mock creators
        setSuggestedCreators([
          { id: 'c1', name: 'David Art', handle: '@david_art', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', isFollowed: false },
          { id: 'c2', name: 'Moto Mike', handle: '@moto_mike', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80', isFollowed: true },
          { id: 'c3', name: 'Chef Jen', handle: '@chef_jen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', isFollowed: false },
        ]);

      } catch (err) {
        console.error("Explore load failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadExploreData();
  }, []);

  const displayedEvents = eventsViewAll ? events : events.slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <SidebarLayout>
        <div className="flex flex-col">
          <ExploreHeader />

          <main className="w-full py-10 flex flex-col lg:flex-row gap-12">

            {/* Mobile Suggestions (On top) */}
            <section className="lg:hidden space-y-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Suggested for you</h3>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
                {suggestedBrands.concat(suggestedCreators).slice(0, 8).map((item) => (
                  <div key={item.id} className="min-w-[160px] bg-white/5 border border-white/5 rounded-3xl p-5 text-center space-y-4">
                    <img src={item.avatar} className="w-16 h-16 rounded-2xl mx-auto object-cover border-2 border-white/5" />
                    <div className="space-y-1">
                      <p className="text-xs font-black truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.handle}</p>
                    </div>
                    <button className="w-full py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest">Follow</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Main Feed Content */}
            <div className="flex-1 space-y-12">
              {/* Main Tabs (Events | Content) */}
              <div className="flex items-center gap-6 border-b border-white/5 pb-2">
                <button
                  onClick={() => setActiveTab('events')}
                  className={cn(
                    "relative px-4 py-3 text-sm font-black uppercase tracking-[0.2em] transition-all",
                    activeTab === 'events' ? "text-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Events
                  {activeTab === 'events' && <motion.div layoutId="exploreTab" className="absolute bottom-[-1.5px] left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={cn(
                    "relative px-4 py-3 text-sm font-black uppercase tracking-[0.2em] transition-all",
                    activeTab === 'content' ? "text-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Content
                  {activeTab === 'content' && <motion.div layoutId="exploreTab" className="absolute bottom-[-1.5px] left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                </button>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'events' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                      {displayedEvents.map((ev, i) => (
                        <SquareEventCard
                          key={ev.id}
                          event={{
                            id: ev.id,
                            title: ev.title,
                            rewardPool: ev.leaderboardPool ? `$${ev.leaderboardPool.toLocaleString()}` : "TBD",
                            participationCount: ev._count?.submissions || 0,
                            image: ev.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
                            creator: { name: ev.brand?.name || "Unknown" },
                            timeRemaining: "Live",
                            mode: ev.eventType === 'vote_only' ? 'vote' : 'post'
                          }}
                        />
                      ))}
                    </div>
                    {!eventsViewAll && events.length > 6 && (
                      <button
                        onClick={() => setEventsViewAll(true)}
                        className="w-full py-4 rounded-3xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        View all events <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Domain Pills */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {domainCategories.map((dom) => (
                        <button
                          key={dom.label}
                          onClick={() => setActiveDomain(dom.label)}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            activeDomain === dom.label
                              ? "bg-primary text-white shadow-lg shadow-primary/20"
                              : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/10"
                          )}
                        >
                          <dom.icon className="w-3.5 h-3.5" />
                          {dom.label}
                        </button>
                      ))}
                    </div>

                    {/* Content Grid */}
                    <div className="columns-2 md:columns-3 gap-6 space-y-6">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="break-inside-avoid relative rounded-[32px] overflow-hidden group cursor-pointer border border-white/5">
                          <img
                            src={`https://images.unsplash.com/photo-${1500000000000 + i * 100000}?auto=format&fit=crop&w=600&q=80`}
                            className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            style={{ height: i % 3 === 0 ? '400px' : i % 3 === 1 ? '300px' : '500px' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Creator Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&q=80" className="w-6 h-6 rounded-full border border-white/20" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">David Art</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <LikeIcon className="w-3.5 h-3.5 text-primary fill-current" />
                                <span className="text-[10px] font-black text-white">1.2k</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Suggestions (Sidebar) */}
            <ExploreSidebar brands={suggestedBrands} creators={suggestedCreators} />

          </main>
        </div>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </SidebarLayout>
    </div>
  );
}

function ThumbsUp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}
