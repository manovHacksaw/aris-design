"use client";

import { useState, useEffect, useMemo } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Sparkles, Palette, PenLine, Video, Building2, Rocket, Star } from "lucide-react";
import { motion } from "framer-motion";
import { AIGeneratorWindow } from "@/components/create/AIGeneratorWindow";
import { useUser } from "@/context/UserContext";
import { useLoginModal } from "@/context/LoginModalContext";
import { getEvents } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import PremiumEventCard, { PremiumEventCardSkeleton } from "@/components/events/PremiumEventCard";
import CreateHero from "@/components/create/CreateHero";
import GalleryTabs from "@/components/create/GalleryTabs";
import { cn } from "@/lib/utils";
import { ScrollIndicator } from "@/components/ui/ScrollIndicator";

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
    const { openLoginModal } = useLoginModal();
    const [generatorOpen, setGeneratorOpen] = useState(false);
    const [heroPrompt, setHeroPrompt] = useState("");
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [openEvents, setOpenEvents] = useState<Event[]>([]);
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

    /* Dynamic creator pool = sum of (leaderboardPool + topReward) for live events */
    const creatorPool = useMemo(() => {
        return openEvents.reduce((sum, e) => {
            return sum + (e.leaderboardPool ?? 0) + (e.topReward ?? 0);
        }, 0);
    }, [openEvents]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <SidebarLayout>
                <main className="flex-1 w-full max-w-[1600px] mx-auto space-y-6 pb-20 md:pb-12 pt-2">

                    {/* Hero (unchanged — just passes events for preview panel) */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <CreateHero
                            onGenerate={(p) => {
                                if (!user?.id) { openLoginModal(); return; }
                                if (!p.trim()) return;
                                setHeroPrompt(p);
                                setGeneratorOpen(true);
                            }}
                            onRequireAuth={!user?.id ? openLoginModal : undefined}
                            events={openEvents}
                        />
                    </motion.section>

                    {/* Your Gallery (Posted + Drafts tabs) */}
                    {user?.id && <GalleryTabs userId={user.id} />}

                    {/* Category Filter — compact pills */}
                    <section className="space-y-3">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Filter by Category</p>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {categoryTabs.map((cat) => {
                                const isActive = activeCategory === cat.label;
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.label}
                                        onClick={() => setActiveCategory(cat.label)}
                                        className={cn(
                                            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-200 shrink-0",
                                            isActive
                                                ? "bg-lime-400 text-black shadow-[0_2px_12px_rgba(163,230,53,0.15)]"
                                                : "bg-white/[0.04] text-white/40 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/70"
                                        )}
                                    >
                                        <Icon className={cn("w-3 h-3", isActive ? "text-black" : "text-white/30")} />
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Opportunities Header — dynamic creator pool */}
                    <div className="flex items-end justify-between border-t border-white/[0.06] pt-6">
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                                Submit your work
                            </p>
                            <h2 className="font-display text-3xl md:text-4xl text-white uppercase tracking-tight">
                                Opportunities
                            </h2>
                        </div>
                        <div className="hidden sm:flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Live Events</p>
                                <p className="text-xl font-black text-white">{openEvents.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Creator Pool</p>
                                <p className="text-xl font-black text-lime-400">
                                    {creatorPool > 0 ? `$${creatorPool.toLocaleString()}` : "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Events — horizontal scroll row matching home page */}
                    {loading ? (
                        <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex-shrink-0 w-[300px] sm:w-[340px]">
                                    <PremiumEventCardSkeleton />
                                </div>
                            ))}
                        </div>
                    ) : openEvents.length > 0 ? (
                        <div className="relative">
                            <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                                {openEvents.map((event, i) => (
                                    <motion.div
                                        key={event.id}
                                        className="flex-shrink-0 w-[300px] sm:w-[340px]"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.25 }}
                                    >
                                        <PremiumEventCard event={event} />
                                    </motion.div>
                                ))}
                            </div>
                            <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-background to-transparent pointer-events-none" />
                        </div>
                    ) : (
                        <div className="py-16 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.06]">
                            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                                <Star className="w-5 h-5 text-white/20" />
                            </div>
                            <p className="font-display text-xl text-white/30 uppercase tracking-tight mb-0.5">
                                No Active Opportunities
                            </p>
                            <p className="text-[10px] text-white/20 font-medium">Check back soon for new challenges</p>
                        </div>
                    )}

                    <ScrollIndicator bottomOffset={72} />
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>

            <AIGeneratorWindow
                isOpen={generatorOpen}
                onClose={() => { setGeneratorOpen(false); setHeroPrompt(""); }}
                userId={user?.id ?? ""}
                initialPrompt={heroPrompt}
            />
        </div>
    );
}
