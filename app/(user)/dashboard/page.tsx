"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { Eye, Heart, MessageSquare, BarChart2, TrendingUp, Calendar, Zap, Users, UserPlus, UserMinus, ArrowUpRight, ArrowDownRight } from "lucide-react";

// Mock Data for Posts Analytics
const POSTS_ANALYTICS = [
    {
        id: 1,
        thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2670&auto=format&fit=crop",
        title: "Neon City Vibes - Cyberpunk Challenge",
        date: "Feb 14, 2026",
        views: "12.5k",
        likes: "2.4k",
        remarks: "342",
        earnings: "$120.50",
        performance: "high", // high, medium, low
        trend: "+15%",
        followersGained: 124,
        followersLost: 12
    },
    {
        id: 2,
        thumbnail: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=2670&auto=format&fit=crop",
        title: "Adidas Futurecraft 4D Concept",
        date: "Feb 10, 2026",
        views: "8.2k",
        likes: "1.1k",
        remarks: "156",
        earnings: "$45.00",
        performance: "medium",
        trend: "+5%",
        followersGained: 45,
        followersLost: 5,
    },
    {
        id: 3,
        thumbnail: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2564&auto=format&fit=crop",
        title: "Minimalist Sneaker Sketch",
        date: "Feb 05, 2026",
        views: "3.4k",
        likes: "420",
        remarks: "89",
        earnings: "$12.00",
        performance: "low",
        trend: "-2%",
        followersGained: 12,
        followersLost: 8,
    },
    {
        id: 4,
        thumbnail: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=2574&auto=format&fit=crop",
        title: "Nike Air Max Redesign",
        date: "Jan 28, 2026",
        views: "25.1k",
        likes: "4.8k",
        remarks: "892",
        earnings: "$350.25",
        performance: "high",
        trend: "+22%",
        followersGained: 350,
        followersLost: 24,
    },
];

const OVERALL_STATS = [
    { label: "Total Views", value: "49.2k", trend: "+12.5%", icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Earning", value: "$527.75", trend: "+8.2%", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Followers Gained", value: "+531", trend: "+5.4%", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
];

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <div className="flex flex-col min-h-screen">
                    <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-8 pb-24 md:pb-8">

                        {/* Header */}
                        <div>
                            <h1 className="text-3xl font-display font-bold text-foreground mb-2 tracking-wide">Dashboard</h1>
                            <p className="text-gray-400">Track content performance and audience growth.</p>
                        </div>

                        {/* Top Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {OVERALL_STATS.map((stat, i) => (
                                <div key={i} className="bg-card/70 backdrop-blur-md border border-border/80 rounded-xl p-5 flex items-center justify-between hover:border-border transition-colors group shadow-sm hover:shadow-md hover:shadow-black/20">
                                    <div>
                                        <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1 group-hover:text-gray-300 transition-colors">{stat.label}</p>
                                        <h2 className="text-3xl font-mono font-bold text-foreground tracking-tighter">{stat.value}</h2>
                                        <span className="font-mono text-[10px] font-medium text-green-400 mt-2 inline-flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                            <ArrowUpRight className="w-3 h-3" /> {stat.trend}
                                        </span>
                                    </div>
                                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${stat.bg} shadow-lg shadow-black/10 group-hover:scale-105 transition-transform duration-300 border border-white/5`}>
                                        <stat.icon className={`w-7 h-7 ${stat.color}`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Posts Analytics */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Content Performance
                            </h2>

                            <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl overflow-hidden shadow-lg shadow-black/20">

                                {/* Table Header - Desktop */}
                                <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border bg-secondary px-6 py-4 font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10">
                                    <div className="col-span-4">Post</div>
                                    <div className="col-span-2 text-center">Views</div>
                                    <div className="col-span-2 text-center">Engagement</div>
                                    <div className="col-span-2 text-center">Audience Impact</div>
                                    <div className="col-span-2 text-right">Earnings</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-border">
                                    {POSTS_ANALYTICS.map((post) => (
                                        <div key={post.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-secondary/50 transition-colors group">

                                            {/* Post Info (Mobile: Full Width, Desktop: Col 4) */}
                                            <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                                                <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border group-hover:border-primary/50 transition-colors shadow-sm">
                                                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors pr-2 leading-tight">{post.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="font-mono text-[10px] text-gray-500 flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border">
                                                            <Calendar className="w-3 h-3" /> {post.date}
                                                        </span>
                                                        {/* Mobile Stats Summary */}
                                                        <div className="md:hidden flex gap-3 text-xs text-gray-400 mt-1 w-full">
                                                            <span className="flex items-center gap-1 text-green-400 font-medium">+ {post.followersGained} Flwrs</span>
                                                            <span className="flex items-center gap-1 font-bold text-foreground ml-auto">{post.earnings}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Views - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-center gap-1">
                                                <div className="flex items-center gap-1.5 font-mono text-foreground font-bold text-base">
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                    {post.views}
                                                </div>
                                                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${post.performance === 'high' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                                    {post.trend} Trend
                                                </span>
                                            </div>

                                            {/* Engagement - Desktop */}
                                            <div className="hidden md:flex col-span-2 justify-center items-center gap-6">
                                                <div className="flex flex-col items-center gap-1" title="Likes">
                                                    <Heart className="w-5 h-5 text-gray-600 group-hover:text-pink-500 group-hover:fill-pink-500/10 transition-all duration-300" />
                                                    <span className="font-mono text-[10px] font-medium text-gray-400 group-hover:text-foreground transition-colors">{post.likes}</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1" title="Remarks">
                                                    <MessageSquare className="w-5 h-5 text-gray-600 group-hover:text-blue-400 group-hover:fill-blue-400/10 transition-all duration-300" />
                                                    <span className="font-mono text-[10px] font-medium text-gray-400 group-hover:text-foreground transition-colors">{post.remarks}</span>
                                                </div>
                                            </div>

                                            {/* Audience Impact (Followers) - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-center gap-2">
                                                <div className="flex items-center gap-2 text-xs font-medium bg-green-500/5 px-3 py-1.5 rounded-lg border border-green-500/10 w-full max-w-[120px] justify-between group-hover:bg-green-500/10 transition-colors">
                                                    <span className="text-green-400 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Gained</span>
                                                    <span className="font-mono text-[11px] text-foreground font-bold">+{post.followersGained}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10 w-full max-w-[120px] justify-between group-hover:bg-red-500/10 transition-colors">
                                                    <span className="text-red-400 flex items-center gap-1.5 opacity-80"><UserMinus className="w-3.5 h-3.5" /> Lost</span>
                                                    <span className="font-mono text-[11px] text-gray-300">-{post.followersLost}</span>
                                                </div>
                                            </div>

                                            {/* Earnings - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-end pr-4">
                                                <span className="text-lg font-mono font-black text-foreground group-hover:text-yellow-400 transition-colors tracking-tight">
                                                    {post.earnings}
                                                </span>
                                                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-bold">Total Payout</span>
                                            </div>

                                        </div>
                                    ))}
                                </div>

                                {/* Footer / Pagination */}
                                <div className="p-4 bg-card border-t border-border flex justify-center hover:bg-secondary/30 transition-colors cursor-pointer">
                                    <button className="font-mono text-[10px] uppercase tracking-widest text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-1">
                                        View Full Analytics Report <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </main>
                </div>
            </SidebarLayout>
        </div>
    );
}
