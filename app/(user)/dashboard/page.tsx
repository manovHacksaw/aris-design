"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { Eye, Heart, MessageSquare, BarChart2, TrendingUp, Calendar, Zap, Users, UserPlus, UserMinus, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

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
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 noise-texture">
            <SidebarLayout>
                <div className="flex flex-col min-h-screen">
                    <main className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-8 pb-24 md:pb-8">

                        {/* Header with Cyberpunk Hero */}
                        <div className="space-y-4 mb-12">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-neon-cyan" />
                                <h1 className="text-4xl md:text-5xl font-bold text-neon-gradient tracking-tight">Creator Dashboard</h1>
                            </div>
                            <p className="text-gray-300 text-lg">Track your content performance, earnings, and audience growth in real-time.</p>
                        </div>

                        {/* Top Stats Cards - Glass Morphism */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {OVERALL_STATS.map((stat, i) => (
                                <div key={i} className="glass-card rounded-3xl p-6 flex flex-col justify-between h-full border border-neon-blue/40 hover:border-neon-blue/80 transition-all duration-300 group hover:shadow-xl">
                                    <div className="space-y-4">
                                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                                        <div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight mb-3">{stat.value}</h2>
                                            <span className="text-xs font-bold text-neon-cyan inline-flex items-center gap-1 bg-neon-cyan/10 px-3 py-1 rounded-full border border-neon-cyan/30 uppercase tracking-wider">
                                                <ArrowUpRight className="w-3 h-3" /> {stat.trend}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-neon-cyan/20 group-hover:from-primary/40 group-hover:to-neon-cyan/40 transition-all duration-300 border border-neon-blue/30 group-hover:glow-blue">
                                        <stat.icon className={`w-8 h-8 ${stat.color}`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Posts Analytics */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-neon-cyan" />
                                Content Performance
                            </h2>

                            <div className="glass-card rounded-3xl overflow-hidden border border-neon-blue/40 hover:border-neon-blue/80 transition-all duration-300">

                                {/* Table Header - Desktop */}
                                <div className="hidden md:grid grid-cols-12 gap-4 border-b border-neon-blue/30 bg-secondary/30 px-6 py-4 text-xs font-bold text-neon-cyan uppercase tracking-widest sticky top-0 z-10">
                                    <div className="col-span-4">Post</div>
                                    <div className="col-span-2 text-center">Views</div>
                                    <div className="col-span-2 text-center">Engagement</div>
                                    <div className="col-span-2 text-center">Audience Impact</div>
                                    <div className="col-span-2 text-right">Earnings</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-neon-blue/20">
                                    {POSTS_ANALYTICS.map((post) => (
                                        <div key={post.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-secondary/40 transition-all duration-300 group border-b border-neon-blue/10 hover:border-neon-blue/40">

                                            {/* Post Info (Mobile: Full Width, Desktop: Col 4) */}
                                            <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                                                <div className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-neon-blue/40 group-hover:border-neon-cyan/60 transition-all group-hover:glow-cyan">
                                                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-white truncate group-hover:text-neon-cyan transition-colors pr-2 leading-tight">{post.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="text-xs text-gray-400 flex items-center gap-1 bg-background/40 px-2 py-0.5 rounded-full border border-neon-blue/20">
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
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-center gap-2">
                                                <div className="flex items-center gap-2 text-white font-bold text-base">
                                                    <Eye className="w-4 h-4 text-neon-blue" />
                                                    {post.views}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${post.performance === 'high' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                                    {post.trend}
                                                </span>
                                            </div>

                                            {/* Engagement - Desktop */}
                                            <div className="hidden md:flex col-span-2 justify-center items-center gap-8">
                                                <div className="flex flex-col items-center gap-2" title="Likes">
                                                    <Heart className="w-5 h-5 text-gray-500 group-hover:text-neon-magenta group-hover:fill-neon-magenta transition-all duration-300" />
                                                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{post.likes}</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-2" title="Remarks">
                                                    <MessageSquare className="w-5 h-5 text-gray-500 group-hover:text-neon-blue group-hover:fill-neon-blue/10 transition-all duration-300" />
                                                    <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{post.remarks}</span>
                                                </div>
                                            </div>

                                            {/* Audience Impact (Followers) - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-center gap-2">
                                                <div className="flex items-center gap-2 text-xs font-medium bg-neon-cyan/5 px-3 py-1.5 rounded-lg border border-neon-cyan/30 w-full max-w-[140px] justify-between group-hover:bg-neon-cyan/10 group-hover:glow-cyan transition-all">
                                                    <span className="text-neon-cyan flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> +{post.followersGained}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium bg-neon-magenta/5 px-3 py-1.5 rounded-lg border border-neon-magenta/30 w-full max-w-[140px] justify-between group-hover:bg-neon-magenta/10 group-hover:glow-magenta transition-all">
                                                    <span className="text-neon-magenta flex items-center gap-1.5"><UserMinus className="w-3.5 h-3.5" /> -{post.followersLost}</span>
                                                </div>
                                            </div>

                                            {/* Earnings - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-end pr-4">
                                                <span className="text-lg font-mono font-black text-neon-cyan group-hover:text-white transition-colors tracking-tight">
                                                    {post.earnings}
                                                </span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Earnings</span>
                                            </div>

                                        </div>
                                    ))}
                                </div>

                                {/* Footer / Pagination */}
                                <div className="p-6 bg-secondary/20 border-t border-neon-blue/30 flex justify-center hover:bg-secondary/40 transition-colors cursor-pointer group">
                                    <button className="text-sm text-neon-cyan hover:text-white font-bold transition-colors flex items-center gap-2 group-hover:glow-cyan">
                                        View Full Analytics Report <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
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
