"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Sparkles, Palette, PenLine, Video, Building2, Rocket, Loader2, PlayCircle, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
                // Filter for events that allow posting/submissions
                const filtered = (res.events || []).filter((e: any) =>
                    e.eventType === 'post_and_vote' || e.allowSubmissions
                );
                setOpenEvents(filtered);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-12 pb-20 md:pb-12">

                    {/* New Create Hero Panel */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <CreateHero />
                    </motion.section>

                    {/* Drafts */}
                    <DraftsSection />

                    {/* User's Posted Submissions */}
                    {user?.id && <UserPostsSection userId={user.id} />}

                    {/* Category Pills */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] opacity-30">Select Category</h3>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {categoryTabs.map((cat) => {
                                const isActive = activeCategory === cat.label;
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.label}
                                        onClick={() => setActiveCategory(cat.label)}
                                        className={cn(
                                            "relative flex items-center gap-2.5 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                            isActive
                                                ? "bg-white text-black shadow-xl"
                                                : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-white/30")} />
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Active Events Header */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-12">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Opportunities</h2>
                            <p className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Submit your work to these live events</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Live Events</p>
                                <p className="text-xl font-black text-white">{openEvents.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Prize Pool</p>
                                <p className="text-xl font-black text-primary">$42,500</p>
                            </div>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <EventCardSkeleton key={i} />
                            ))
                        ) : openEvents.length > 0 ? (
                            openEvents.map((event, i) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <EventCard event={event} />
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center bg-white/[0.02] rounded-[40px] border border-dashed border-white/10">
                                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                                    <Star className="w-8 h-8 text-white/10" />
                                </div>
                                <p className="text-white/40 font-black uppercase tracking-[0.2em] text-sm">No Active Post Opportunities</p>
                                <p className="text-white/20 text-xs mt-2">Check back soon for new challenges</p>
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
