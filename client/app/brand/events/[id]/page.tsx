"use client";

import { useState } from "react";
import { ChevronLeft, MoreHorizontal, Download, Share2, Check, X, Clock, Users, Trophy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Mock Data
const eventData = {
    id: 1,
    title: "Neon Dreams Challenge",
    status: "Active",
    pool: "$5,000",
    filled: 84,
    views: "125k",
    endDate: "Oct 24, 2026",
    description: "Create a neon-style artwork inspired by cyberpunk aesthetics. Best entries win share of $5,000.",
    submissions: [
        { id: 101, user: "cyber_artist", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400", status: "pending", date: "2h ago" },
        { id: 102, user: "neon_vibe", image: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=400", status: "approved", date: "5h ago" },
        { id: 103, user: "night_crawler", image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=400", status: "rejected", date: "1d ago" },
        { id: 104, user: "future_punk", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400", status: "pending", date: "1d ago" },
        { id: 105, user: "retro_wave", image: "https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=400", status: "approved", date: "2d ago" },
    ]
};

export default function BrandEventDetailsPage() {
    const [activeTab, setActiveTab] = useState<"submissions" | "details" | "analytics">("submissions");

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/brand/events" className="p-2 rounded-full hover:bg-secondary transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">{eventData.title}</h1>
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[10px] font-black uppercase tracking-wider">
                                {eventData.status}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Ends {eventData.endDate}</span> • <span>{eventData.filled}% Budget Utilized</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors">
                        <Share2 className="w-4 h-4 text-foreground" />
                    </button>
                    <button className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-foreground" />
                    </button>
                    <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-foreground text-background font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap text-sm">
                        Edit Campaign
                    </button>
                </div>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
                <div className="bg-card border border-border rounded-[20px] p-4 flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="bg-primary/10 p-2 rounded-full mb-2">
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Views</span>
                    <span className="text-lg md:text-2xl font-black">{eventData.views}</span>
                </div>
                <div className="bg-card border border-border rounded-[20px] p-4 flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="bg-primary/10 p-2 rounded-full mb-2">
                        <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Submissions</span>
                    <span className="text-lg md:text-2xl font-black">{eventData.submissions.length * 12}</span> {/* Mock multiplier */}
                </div>
                <div className="bg-card border border-border rounded-[20px] p-4 flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="bg-primary/10 p-2 rounded-full mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Time Left</span>
                    <span className="text-lg md:text-2xl font-black">2d 4h</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {(["submissions", "details", "analytics"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                            activeTab === tab
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Submissions Tab */}
            {activeTab === "submissions" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Recent Entries</h3>
                        <button className="text-xs font-bold text-primary flex items-center gap-1">
                            <Download className="w-3 h-3" /> Export CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {eventData.submissions.map((sub) => (
                            <div key={sub.id} className="bg-card border border-border rounded-[20px] overflow-hidden group">
                                <div className="relative h-48">
                                    <img src={sub.image} className="w-full h-full object-cover" alt="Submission" />
                                    <div className="absolute top-3 right-3">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border backdrop-blur-md",
                                            sub.status === "approved" ? "bg-green-500/20 border-green-500/30 text-white" :
                                                sub.status === "rejected" ? "bg-red-500/20 border-red-500/30 text-white" :
                                                    "bg-black/40 border-white/20 text-white"
                                        )}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">@{sub.user}</h4>
                                            <p className="text-xs text-muted-foreground">{sub.date}</p>
                                        </div>
                                    </div>

                                    {sub.status === "pending" && (
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white rounded-xl font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1">
                                                <Check className="w-3 h-3" /> Approve
                                            </button>
                                            <button className="flex-1 py-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1">
                                                <X className="w-3 h-3" /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Details Tab Placeholder */}
            {activeTab === "details" && (
                <div className="bg-card border border-border rounded-[24px] p-6 md:p-8">
                    <h3 className="font-bold text-lg mb-4">Campaign Description</h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                        {eventData.description}
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Budget Allocation</h4>
                            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium">Reward Pool</span>
                                    <span className="font-bold">$4,500</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium">Platform Fee</span>
                                    <span className="font-bold">$500</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Target Audience</h4>
                            <div className="bg-secondary/50 rounded-xl p-4 flex flex-wrap gap-2">
                                {["Art", "Design", "Cyberpunk", "Digital"].map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-secondary rounded-full text-xs font-bold text-muted-foreground">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Tab (Simplified) */}
            {activeTab === "analytics" && (
                <div className="bg-card border border-border rounded-[24px] p-8 text-center">
                    <p className="text-muted-foreground font-medium">Detailed analytics report will be available after campaign ends.</p>
                </div>
            )}
        </div>
    );
}
