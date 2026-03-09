"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Clock, Users, ArrowRight, Sparkles, Wand2, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { AIGeneratorWindow } from "@/components/create/AIGeneratorWindow";
import { useUser } from "@/context/UserContext";
import { getEvents } from "@/services/event.service";
import EventCard, { EventCardSkeleton } from "@/components/events/EventCard";

const STYLES = ["Cinematic", "Cyberpunk", "Minimalist", "Anime", "Photorealistic", "Abstract", "Vintage", "Neon"];
const RATIOS = ["1:1", "4:5", "16:9 4K", "9:16", "3:2", "2:3"];


export default function Create() {
    const { user } = useUser();
    const [generatorOpen, setGeneratorOpen] = useState(false);
    const [heroPrompt, setHeroPrompt] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("Cyberpunk");
    const [selectedRatio, setSelectedRatio] = useState("16:9 4K");
    const [styleIndex, setStyleIndex] = useState(STYLES.indexOf("Cyberpunk"));
    const [ratioIndex, setRatioIndex] = useState(RATIOS.indexOf("16:9 4K"));

    const [openEvents, setOpenEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getEvents({ status: "posting", limit: 12 }).then((res) => {
            setOpenEvents(res.events || []);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handleHeroGenerate = () => setGeneratorOpen(true);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto">
                    {/* AI Creation Hero */}
                    <div className="relative w-full mb-8 md:mb-16 rounded-2xl md:rounded-[40px] overflow-hidden shadow-2xl">
                        {/* Dynamic Background */}
                        <div className="absolute inset-0 bg-neutral-900">
                            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
                            <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"
                            />
                        </div>

                        <div className="relative z-10 p-5 sm:p-8 md:p-14 flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-6 sm:gap-10 lg:gap-12 items-center">
                            {/* Left: copy + buttons */}
                            <div className="space-y-4 sm:space-y-6 w-full">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    Next Gen AI Engine
                                </div>
                                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.9] max-w-xl">
                                    Manifest Your <br />
                                    <span className="italic text-primary">Creative Vision</span> <br />
                                    In Seconds.
                                </h2>
                                <p className="text-white/40 text-xs sm:text-sm md:text-base font-medium max-w-sm sm:max-w-md">
                                    Describe your idea and let Aris AI generate high-fidelity assets for your next challenge entry.
                                </p>

                                <div className="flex flex-row gap-3 pt-2 sm:pt-4">
                                    <button
                                        onClick={() => setGeneratorOpen(true)}
                                        className="bg-white text-black px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
                                    >
                                        Launch Generator
                                        <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all active:scale-95">
                                        View Gallery
                                    </button>
                                </div>
                            </div>

                            {/* Right: interactive prompt panel */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[32px] p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

                                <div className="space-y-4 sm:space-y-6 relative z-10">
                                    {/* Prompt input */}
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Initial Prompt</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/20" />
                                            </div>
                                            <input
                                                type="text"
                                                value={heroPrompt}
                                                onChange={(e) => setHeroPrompt(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleHeroGenerate(); }}
                                                placeholder="A futuristic sneaker for the metaverse..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-primary/40 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Style & Ratio pickers */}
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        {/* Style */}
                                        <div className="p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5 sm:mb-2 text-center">Style</p>
                                            <div className="flex items-center justify-between gap-1">
                                                <button
                                                    onClick={() => {
                                                        const i = (styleIndex - 1 + STYLES.length) % STYLES.length;
                                                        setStyleIndex(i);
                                                        setSelectedStyle(STYLES[i]);
                                                    }}
                                                    className="text-white/30 hover:text-white/70 transition-colors p-0.5"
                                                >
                                                    <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                </button>
                                                <p className="text-[10px] sm:text-xs font-black text-white text-center flex-1 truncate px-1">{selectedStyle}</p>
                                                <button
                                                    onClick={() => {
                                                        const i = (styleIndex + 1) % STYLES.length;
                                                        setStyleIndex(i);
                                                        setSelectedStyle(STYLES[i]);
                                                    }}
                                                    className="text-white/30 hover:text-white/70 transition-colors p-0.5"
                                                >
                                                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex justify-center gap-1 mt-1.5 sm:mt-2">
                                                {STYLES.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setStyleIndex(i); setSelectedStyle(STYLES[i]); }}
                                                        className={`w-1 h-1 rounded-full transition-colors ${i === styleIndex ? "bg-primary" : "bg-white/20"}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Ratio */}
                                        <div className="p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5 sm:mb-2 text-center">Ratio</p>
                                            <div className="flex items-center justify-between gap-1">
                                                <button
                                                    onClick={() => {
                                                        const i = (ratioIndex - 1 + RATIOS.length) % RATIOS.length;
                                                        setRatioIndex(i);
                                                        setSelectedRatio(RATIOS[i]);
                                                    }}
                                                    className="text-white/30 hover:text-white/70 transition-colors p-0.5"
                                                >
                                                    <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                </button>
                                                <p className="text-[10px] sm:text-xs font-black text-white text-center flex-1 truncate px-1">{selectedRatio}</p>
                                                <button
                                                    onClick={() => {
                                                        const i = (ratioIndex + 1) % RATIOS.length;
                                                        setRatioIndex(i);
                                                        setSelectedRatio(RATIOS[i]);
                                                    }}
                                                    className="text-white/30 hover:text-white/70 transition-colors p-0.5"
                                                >
                                                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex justify-center gap-1 mt-1.5 sm:mt-2">
                                                {RATIOS.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setRatioIndex(i); setSelectedRatio(RATIOS[i]); }}
                                                        className={`w-1 h-1 rounded-full transition-colors ${i === ratioIndex ? "bg-primary" : "bg-white/20"}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleHeroGenerate}
                                        className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Generate Draft
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Events Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tighter">Active Opportunity</h2>
                            <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest mt-1">Manual Creation for Open Events</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{openEvents.length} Events Live</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <EventCardSkeleton key={i} />
                            ))
                        ) : openEvents.length > 0 ? (
                            openEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <Sparkles className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
                                <p className="text-foreground/40 font-black uppercase tracking-widest text-sm">No Active Opportunities</p>
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
                initialPrompt={heroPrompt}
                initialStyle={selectedStyle}
                initialRatio={selectedRatio}
            />
        </div>
    );
}
