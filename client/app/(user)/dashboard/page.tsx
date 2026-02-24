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
                        <div className="mb-12 border-b-4 border-foreground pb-8">
                            <h1 className="text-6xl md:text-8xl font-display text-foreground uppercase tracking-tighter leading-none mb-4">
                                Future Of<br />
                                <span className="text-primary">Dashboard</span>
                            </h1>
                            <p className="text-xl font-bold uppercase tracking-widest border-l-4 border-primary pl-4">Track content performance and audience growth.</p>
                        </div>

                        {/* Top Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                            {OVERALL_STATS.map((stat, i) => (
                                <div key={i} className="bg-card border-[3px] border-foreground rounded-2xl p-6 flex items-center justify-between hover:-translate-y-1 hover:translate-x-1 transition-transform shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3] group">
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">{stat.label}</p>
                                        <h2 className="text-5xl md:text-6xl font-display text-foreground tracking-tighter">{stat.value}</h2>
                                        <span className="font-bold text-xs mt-3 inline-flex items-center gap-1 bg-[#1A1A1A] text-[#FDF6E3] dark:bg-[#FDF6E3] dark:text-[#1A1A1A] px-3 py-1 rounded-full border-2 border-transparent">
                                            <ArrowUpRight className="w-4 h-4" /> {stat.trend}
                                        </span>
                                    </div>
                                    <div className={`w-20 h-20 rounded-xl flex items-center justify-center bg-secondary border-[3px] border-foreground shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] group-hover:rotate-6 transition-transform duration-300`}>
                                        <stat.icon className={`w-10 h-10 text-foreground`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Posts Analytics */}
                        <div className="space-y-6 pt-8">
                            <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tight text-foreground flex items-center gap-3 border-l-8 border-accent pl-4">
                                <TrendingUp className="w-10 h-10 text-foreground hidden sm:block" />
                                Content Performance
                            </h2>

                            <div className="bg-card border-[3px] border-foreground rounded-2xl overflow-hidden shadow-[6px_6px_0px_#1A1A1A] dark:shadow-[6px_6px_0px_#FDF6E3]">

                                {/* Table Header - Desktop */}
                                <div className="hidden md:grid grid-cols-12 gap-4 border-b-[3px] border-foreground bg-primary text-primary-foreground px-6 py-5 font-bold text-base uppercase tracking-widest sticky top-0 z-10">
                                    <div className="col-span-4">Post</div>
                                    <div className="col-span-2 text-center">Views</div>
                                    <div className="col-span-2 text-center">Engagement</div>
                                    <div className="col-span-2 text-center">Audience Impact</div>
                                    <div className="col-span-2 text-right">Earnings</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y-[3px] divide-foreground">
                                    {POSTS_ANALYTICS.map((post) => (
                                        <div key={post.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-secondary transition-colors group">

                                            {/* Post Info (Mobile: Full Width, Desktop: Col 4) */}
                                            <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                                                <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-foreground shadow-[2px_2px_0px_#1A1A1A] dark:shadow-[2px_2px_0px_#FDF6E3]">
                                                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors pr-2 leading-tight uppercase">{post.title}</h3>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <span className="font-bold text-[10px] uppercase text-foreground flex items-center gap-1 bg-secondary px-2 py-1 rounded-full border border-foreground">
                                                            <Calendar className="w-3 h-3" /> {post.date}
                                                        </span>
                                                        {/* Mobile Stats Summary */}
                                                        <div className="md:hidden flex gap-3 text-xs text-foreground mt-2 w-full font-bold">
                                                            <span className="flex items-center gap-1 text-primary">+ {post.followersGained} Flwrs</span>
                                                            <span className="flex items-center gap-1 ml-auto">{post.earnings}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Views - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-center gap-1">
                                                <div className="flex items-center gap-1.5 font-display text-3xl text-foreground">
                                                    {post.views}
                                                </div>
                                                <span className={`font-bold text-[10px] uppercase px-2 py-1 rounded-full border-2 ${post.performance === 'high' ? 'bg-[#00C853] text-white border-[#00C853]' : 'bg-foreground text-background border-foreground'}`}>
                                                    {post.trend} Trend
                                                </span>
                                            </div>

                                            {/* Engagement - Desktop */}
                                            <div className="hidden md:flex col-span-2 justify-center items-center gap-6">
                                                <div className="flex flex-col items-center gap-1" title="Likes">
                                                    <Heart className="w-6 h-6 text-foreground group-hover:scale-110 transition-transform" />
                                                    <span className="font-bold text-xs uppercase">{post.likes}</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1" title="Remarks">
                                                    <MessageSquare className="w-6 h-6 text-foreground group-hover:scale-110 transition-transform" />
                                                    <span className="font-bold text-xs uppercase">{post.remarks}</span>
                                                </div>
                                            </div>

                                            {/* Audience Impact (Followers) - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-center gap-2">
                                                <div className="flex items-center gap-2 text-xs font-bold bg-[#00C853] text-white px-3 py-1.5 rounded-lg border-2 border-foreground w-full max-w-[120px] justify-between shadow-[2px_2px_0px_#1A1A1A] dark:shadow-[2px_2px_0px_#FDF6E3]">
                                                    <span className="flex items-center gap-1.5 uppercase"><UserPlus className="w-3.5 h-3.5" /> Gained</span>
                                                    <span>+{post.followersGained}</span>
                                                </div>
                                            </div>

                                            {/* Earnings - Desktop */}
                                            <div className="hidden md:flex col-span-2 flex-col justify-center items-end pr-4">
                                                <span className="text-3xl font-display text-primary tracking-tight">
                                                    {post.earnings}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-foreground">Total Payout</span>
                                            </div>

                                        </div>
                                    ))}
                                </div>

                                {/* Footer / Pagination */}
                                <div className="p-5 bg-foreground text-background border-t-[3px] border-foreground flex justify-center hover:bg-primary transition-colors cursor-pointer group">
                                    <button className="font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
                                        View Full Analytics Report <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
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
