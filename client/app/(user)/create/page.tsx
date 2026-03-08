"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Clock, Users, ArrowRight, Zap, Sparkles, Wand2, Search } from "lucide-react";
import { motion } from "framer-motion";

const OPEN_EVENTS = [
    {
        id: 1,
        title: "Neon Nights Photography",
        brand: "Sony Alpha",
        type: "Post Only",
        reward: "$2,500 Pool",
        participants: "1.2k",
        timeLeft: "2 days",
        image: "https://images.unsplash.com/photo-1555685812-4b943f3e9942?w=800&q=80",
        color: "from-blue-600 to-purple-600"
    },
    {
        id: 2,
        title: "Future of Fitness",
        brand: "Gymshark",
        type: "Post Only",
        reward: "$5,000 Pool",
        participants: "850",
        timeLeft: "5 days",
        image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
        color: "from-emerald-500 to-teal-500"
    },
    {
        id: 3,
        title: "Sustainable Fashion",
        brand: "H&M Conscious",
        type: "Post Only",
        reward: "$3,000 Pool",
        participants: "2.1k",
        timeLeft: "12 hours",
        image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
        color: "from-orange-500 to-red-500"
    },
    {
        id: 4,
        title: "Indie Game Devs",
        brand: "Unity",
        type: "Post Only",
        reward: "$10,000 Grant",
        participants: "500",
        timeLeft: "1 week",
        image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
        color: "from-indigo-600 to-blue-600"
    },
    {
        id: 5,
        title: "Healthy Eats",
        brand: "Whole Foods",
        type: "Post Only",
        reward: "$1,000 Pool",
        participants: "3.4k",
        timeLeft: "3 days",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
        color: "from-green-500 to-emerald-600"
    },
    {
        id: 6,
        title: "Abstract Art",
        brand: "Adobe",
        type: "Post Only",
        reward: "$1,500 Software",
        participants: "900",
        timeLeft: "4 days",
        image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
        color: "from-pink-500 to-rose-500"
    }
];

export default function Create() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto">
                    {/* AI Creation Hero */}
                    <div className="relative w-full mb-16 rounded-[40px] overflow-hidden group shadow-2xl">
                        {/* Dynamic Background */}
                        <div className="absolute inset-0 bg-neutral-900">
                            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
                            <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />

                            {/* Animated Mesh/Glow */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.5, 0.3]
                                }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"
                            />
                        </div>

                        <div className="relative z-10 p-8 md:p-14 flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Next Gen AI Engine
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] max-w-xl">
                                    Manifest Your <br />
                                    <span className="italic text-primary">Creative Vision</span> <br />
                                    In Seconds.
                                </h2>
                                <p className="text-white/40 text-sm md:text-lg font-medium max-w-md">
                                    Describe your idea and let Aris AI generate high-fidelity assets, copy, and designs for your next challenge entry.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <button className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl">
                                        Launch Generator
                                        <Wand2 className="w-4 h-4" />
                                    </button>
                                    <button className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all active:scale-95">
                                        View Gallery
                                    </button>
                                </div>
                            </div>

                            {/* Prompt Mockup */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden group/card"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

                                <div className="space-y-6 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Initial Prompt</label>
                                        <div className="relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2">
                                                <Search className="w-4 h-4 text-white/20" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="A futuristic sneaker for the metaverse..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-primary/40 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Style</p>
                                            <p className="text-xs font-black text-white">Cyberpunk</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Ratio</p>
                                            <p className="text-xs font-black text-white">16:9 4K</p>
                                        </div>
                                    </div>

                                    <button className="w-full py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
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
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{OPEN_EVENTS.length} Events Live</span>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {OPEN_EVENTS.map((event) => (
                            <div
                                key={event.id}
                                className="group relative bg-card/50 backdrop-blur-xl border border-card-border rounded-[24px] overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-spotify cursor-pointer flex flex-col"
                            >
                                {/* Image Container */}
                                <div className="h-48 relative overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-t ${event.color} opacity-20 mix-blend-overlay z-10`} />
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">{event.brand}</div>
                                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{event.title}</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-secondary rounded-xl p-3 border border-border">
                                            <div className="text-foreground/40 text-[10px] uppercase font-bold tracking-widest mb-1">Prize Pool</div>
                                            <div className="text-primary font-bold text-sm tracking-tight">{event.reward}</div>
                                        </div>
                                        <div className="bg-secondary rounded-xl p-3 border border-border">
                                            <div className="text-foreground/40 text-[10px] uppercase font-bold tracking-widest mb-1">Ending In</div>
                                            <div className="text-foreground font-bold text-sm flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-accent" />
                                                {event.timeLeft}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs text-foreground/40">
                                        <span className="flex items-center gap-1.5 font-bold">
                                            <Users className="w-3.5 h-3.5" />
                                            {event.participants} joined
                                        </span>
                                        <span className="group-hover:translate-x-1 transition-transform duration-300 text-foreground font-bold flex items-center gap-1">
                                            Join Now <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}
