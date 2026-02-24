"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion } from "framer-motion";
import {
    Clock,
    MessageCircle,
    ThumbsUp,
    Zap,
    Calendar,
    ArrowUpRight,
    TrendingUp,
    Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function YourActivityPage() {
    const activityStats = [
        { label: "Total Submissions", value: "24", icon: Layout, color: "text-primary" },
        { label: "Votes Cast", value: "1,420", icon: ThumbsUp, color: "text-accent" },
        { label: "Remarks", value: "86", icon: MessageCircle, color: "text-accent" },
        { label: "Activity Time", value: "128h", icon: Clock, color: "text-primary" },
    ];

    const participatedEvents = [
        {
            type: "Post Event",
            brand: "Nike",
            title: "Air Max Redesign",
            time: "Ended Feb 14",
            status: "Completed",
            role: "Creator",
            icon: Layout,
            reward: "$150 Earned",
            points: "+250 XP"
        },
        {
            type: "Vote Event",
            brand: "Coca-Cola",
            title: "Summer Vibes",
            time: "Active",
            status: "In Progress",
            role: "Voter",
            icon: ThumbsUp,
            reward: "Top 10%",
            points: "+50 XP"
        },
        {
            type: "Post Event",
            brand: "Red Bull",
            title: "Extreme Sports Edit",
            time: "Ended Jan 28",
            status: "Judging",
            role: "Creator",
            icon: Zap,
            reward: "Pending",
            points: "+100 XP"
        },
    ];

    return (
        <SidebarLayout>
            <main className="max-w-[1200px] mx-auto py-8 space-y-10 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tighter mb-2">Your Activity</h1>
                        <p className="text-[11px] font-black text-foreground/30 uppercase tracking-[0.2em]">Track your digital footprints and growth on Aris</p>
                    </div>
                    <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md px-5 py-3 rounded-xl border border-border/50 shadow-sm">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Last 30 Days</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-0">
                    {activityStats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-card/70 backdrop-blur-md border border-border/60 p-6 rounded-xl md:rounded-2xl group hover:border-primary/30 transition-all duration-300 shadow-sm"
                        >
                            <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform", stat.color)}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-black text-foreground tracking-tighter">{stat.value}</h3>
                        </motion.div>
                    ))}
                </div>

                {/* Recent Activity Sections */}
                <div className="grid lg:grid-cols-[1fr_340px] gap-8 px-4 md:px-0">
                    {/* Main Timeline */}
                    <div className="space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-foreground/40 pl-1">Events Participated In</h2>
                        <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
                            {participatedEvents.map((event, i) => (
                                <div key={i} className="flex items-center gap-6 p-7 border-b border-border/40 last:border-0 hover:bg-foreground/[0.02] transition-colors group cursor-pointer">
                                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                                        <event.icon className={cn("w-6 h-6 transition-colors", event.type === "Vote Event" ? "text-accent group-hover:text-accent/80" : "text-primary group-hover:text-primary/80")} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn("text-[9px] font-black uppercase tracking-widest", event.type === "Vote Event" ? "text-accent" : "text-primary")}>{event.type}</span>
                                            <span className="text-[10px] text-foreground/20">•</span>
                                            <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">{event.brand}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-foreground truncate tracking-tight">{event.title}</h4>
                                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-foreground/40 tracking-wider">
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {event.time}</span>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-black text-primary mb-1">{event.reward}</p>
                                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest bg-secondary px-2 py-0.5 rounded-full">{event.status}</span>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-foreground/10 group-hover:text-foreground/40 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Growth Stats */}
                    <div className="space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-foreground/40 pl-1">Growth Index</h2>
                        <div className="bg-card border border-border/60 p-8 rounded-[32px] shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-sm font-black text-foreground tracking-tight">Active Engagement</span>
                                <TrendingUp className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-6">
                                {[
                                    { label: "Creation", value: 85 },
                                    { label: "Social", value: 64 },
                                    { label: "Community", value: 92 },
                                ].map((stat, i) => (
                                    <div key={i} className="space-y-2.5">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-foreground/40">{stat.label}</span>
                                            <span className="text-foreground/60">{stat.value}%</span>
                                        </div>
                                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/20">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${stat.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-10 py-3.5 bg-secondary hover:bg-border/60 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all">
                                Detailed Insights
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </SidebarLayout>
    );
}
