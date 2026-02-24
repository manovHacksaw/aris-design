"use client";

import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, ChevronRight, Eye, Trophy, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const campaigns = [
    { id: 1, title: "Neon Dreams Challenge", status: "Active", pool: "$5,000", filled: 84, views: "125k", roi: "3.2x", end: "2d left", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop" },
    { id: 2, title: "Summer Vibes Test", status: "Draft", pool: "$2,000", filled: 0, views: "-", roi: "-", end: "-", image: "https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop" },
    { id: 3, title: "Tech Review 2024", status: "Ended", pool: "$10,000", filled: 100, views: "450k", roi: "5.8x", end: "Completed", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop" },
    { id: 4, title: "Urban Photography", status: "Active", pool: "$3,500", filled: 45, views: "62k", roi: "2.1x", end: "5d left", image: "https://images.unsplash.com/photo-1449824913929-2b3a3e6be86c?q=80&w=800&auto=format&fit=crop" },
    { id: 5, title: "Fitness Transformation", status: "Scheduled", pool: "$7,500", filled: 0, views: "-", roi: "-", end: "Starts in 3d", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop" },
];

export default function BrandCampaignsPage() {
    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Campaigns</h1>
                    <p className="text-muted-foreground">Manage your active and past campaigns.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            className="pl-9 pr-4 py-2.5 rounded-full bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>
                    <button className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors">
                        <Filter className="w-4 h-4 text-foreground" />
                    </button>
                    <Link
                        href="/brand/create-event"
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Create Campaign</span>
                        <span className="md:hidden">New</span>
                    </Link>
                </div>
            </header>

            {/* Mobile Search - Visible only on small screens */}
            <div className="relative md:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search campaigns..."
                    className="w-full pl-9 pr-4 py-3 rounded-[16px] bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* List Content */}
            <div className="grid gap-4">
                {campaigns.map((campaign) => (
                    <div
                        key={campaign.id}
                        className="group bg-card hover:bg-card/80 border border-border rounded-[24px] p-4 md:p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col md:flex-row gap-4 md:items-center"
                    >
                        {/* Image & Basic Info */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-20 h-20 md:w-16 md:h-16 rounded-[16px] overflow-hidden shrink-0 border border-border/50">
                                <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                        campaign.status === "Active" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                            campaign.status === "Draft" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                                campaign.status === "Ended" ? "bg-muted text-foreground/50 border-border" :
                                                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    )}>
                                        {campaign.status}
                                    </span>
                                    {campaign.end !== "-" && (
                                        <span className="text-[10px] text-muted-foreground font-medium">{campaign.end}</span>
                                    )}
                                </div>
                                <h3 className="text-base md:text-lg font-black text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                                    {campaign.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Budget: {campaign.pool}</p>
                            </div>
                        </div>

                        {/* Metrics Grid - Desktop */}
                        <div className="hidden md:flex items-center gap-8 px-4 border-l border-border/50">
                            <div className="text-center">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Filled</div>
                                <div className="text-lg font-black text-foreground">{campaign.filled}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Views</div>
                                <div className="text-lg font-black text-foreground">{campaign.views}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">ROI</div>
                                <div className="text-lg font-black text-primary">{campaign.roi}</div>
                            </div>
                        </div>

                        {/* Metrics Grid - Mobile */}
                        <div className="flex md:hidden items-center justify-between gap-2 py-3 border-t border-border/50">
                            <div className="flex items-center gap-1.5">
                                <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-bold text-foreground">{campaign.views}</span>
                            </div>
                            <div className="w-px h-3 bg-border" />
                            <div className="flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-bold text-foreground">{campaign.filled}% Filled</span>
                            </div>
                            <div className="w-px h-3 bg-border" />
                            <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-bold text-primary">{campaign.roi} ROI</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 md:pl-4 md:border-l md:border-border/50">
                            <Link href={`/brand/events/${campaign.id}`} className="flex-1 md:flex-none">
                                <button className="w-full md:w-auto px-4 py-2 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                    Manage <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </Link>
                            <button className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hidden md:block">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
