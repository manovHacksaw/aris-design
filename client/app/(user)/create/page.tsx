"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Sparkles, Palette, PenLine, Video, Building2, Rocket, Star } from "lucide-react";
import { motion } from "framer-motion";
import { AIGeneratorWindow } from "@/components/create/AIGeneratorWindow";
import { useUser } from "@/context/UserContext";
import { getEvents } from "@/services/event.service";
import EventCard, { EventCardSkeleton } from "@/components/events/EventCard";
import CreateHero from "@/components/create/CreateHero";
import DraftsSection from "@/components/create/DraftsSection";
import UserPostsSection from "@/components/create/UserPostsSection";
import { cn } from "@/lib/utils";

const categoryTabs = [
    { label: "ALL", icon: Sparkles },
    { label: "ARTISTS", icon: Palette },
    { label: "DESIGNERS", icon: PenLine },
    { label: "CREATORS", icon: Video },
    { label: "BRANDS", icon: Building2 },
    { label: "STARTUPS", icon: Rocket },
];

export default function Create() {
    const { user } = useUser();
    const [generatorOpen, setGeneratorOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [openEvents, setOpenEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getEvents({ status: "posting", limit: 20 })
            .then((res) => {
                const filtered = (res.events || []).filter((e: any) =>
                    e.eventType === 'post_and_vote' || e.allowSubmissions
                );
                setOpenEvents(filtered);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <SidebarLayout>
                <main className="flex-1 w-full max-w-[1600px] mx-auto space-y-12 pb-20 md:pb-12 pt-2">

                    {/* Hero */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <CreateHero />
                    </motion.section>

                    {/* Drafts */}
                    <DraftsSection />

                    {/* User's Posted Submissions */}
                    {user?.id && <UserPostsSection userId={user.id} />}

                    {/* Category Filter */}
                    <section className="space-y-5">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Filter by Category</p>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {categoryTabs.map((cat) => {
                                const isActive = activeCategory === cat.label;
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.label}
                                        onClick={() => setActiveCategory(cat.label)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 shrink-0",
                                            isActive
                                                ? "bg-lime-400 text-black shadow-[0_4px_20px_rgba(163,230,53,0.2)]"
                                                : "bg-white/[0.04] text-white/40 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/70"
                                        )}
                                    >
                                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-black" : "text-white/30")} />
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Opportunities Header */}
                    <div className="flex items-end justify-between border-t border-white/[0.06] pt-10">
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                                Submit your work
                            </p>
                            <h2 className="font-display text-4xl md:text-5xl text-white uppercase tracking-tight">
                                Opportunities
                            </h2>
                        </div>
                        <div className="hidden sm:flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Live Events</p>
                                <p className="text-2xl font-black text-white">{openEvents.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total Prize Pool</p>
                                <p className="text-2xl font-black text-lime-400">$42,500</p>
                            </div>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            [...Array(6)].map((_, i) => <EventCardSkeleton key={i} />)
                        ) : openEvents.length > 0 ? (
                            openEvents.map((event, i) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.3 }}
                                >
                                    <EventCard event={event} />
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/[0.08]">
                                <div className="w-14 h-14 rounded-3xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                                    <Star className="w-7 h-7 text-white/20" />
                                </div>
                                <p className="font-display text-2xl text-white/30 uppercase tracking-tight mb-1">
                                    No Active Opportunities
                                </p>
                                <p className="text-xs text-white/20 font-medium">Check back soon for new challenges</p>
                            </div>
                        )}
                    </div>
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>

            <AIGeneratorWindow
                isOpen={generatorOpen}
                onClose={() => setGeneratorOpen(false)}
                userId={user?.id ?? ""}
            />
        </div>
    );
}
