"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import {
    Eye, Zap, Users, ArrowUpRight, Trophy,
    ThumbsUp, ThumbsDown, ImageIcon, Star,
    TrendingUp, Calendar, UserPlus, Building2,
    Vote, Crown, BarChart2, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mock Data ──────────────────────────────────────────────

const CREATOR_POSTS = [
    {
        id: 1,
        thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop",
        title: "Neon City Vibes - Cyberpunk Challenge",
        brand: "Nike",
        date: "Feb 14, 2026",
        votesReceived: 2412,
        rank: 1,
        earnings: "$120.50",
        xp: 340,
    },
    {
        id: 2,
        thumbnail: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=400&auto=format&fit=crop",
        title: "Adidas Futurecraft 4D Concept",
        brand: "Adidas",
        date: "Feb 10, 2026",
        votesReceived: 1102,
        rank: 3,
        earnings: "$45.00",
        xp: 110,
    },
    {
        id: 3,
        thumbnail: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=400&auto=format&fit=crop",
        title: "Minimalist Sneaker Sketch",
        brand: "New Balance",
        date: "Feb 05, 2026",
        votesReceived: 420,
        rank: 7,
        earnings: "$12.00",
        xp: 42,
    },
    {
        id: 4,
        thumbnail: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=400&auto=format&fit=crop",
        title: "Nike Air Max Redesign",
        brand: "Nike",
        date: "Jan 28, 2026",
        votesReceived: 4820,
        rank: 1,
        earnings: "$350.25",
        xp: 880,
    },
];

const VOTER_HISTORY = [
    { id: 1, eventTitle: "Puma Speed Series - Best Shot", brand: "Puma", date: "Mar 02, 2026", votesCast: 3, pickedWinner: true, earned: "$0.09" },
    { id: 2, eventTitle: "Reebok Classic Revival", brand: "Reebok", date: "Feb 24, 2026", votesCast: 1, pickedWinner: false, earned: "$0.03" },
    { id: 3, eventTitle: "Under Armour Future Collab", brand: "Under Armour", date: "Feb 18, 2026", votesCast: 2, pickedWinner: true, earned: "$2.40" },
    { id: 4, eventTitle: "Converse Art Drops", brand: "Converse", date: "Feb 12, 2026", votesCast: 1, pickedWinner: false, earned: "$0.03" },
];

const ENGAGED_BRANDS = [
    { id: 1, name: "Nike", handle: "@nike", events: 3, logo: "N", color: "bg-red-500" },
    { id: 2, name: "Adidas", handle: "@adidas", events: 1, logo: "A", color: "bg-black" },
    { id: 3, name: "Puma", handle: "@puma", events: 2, logo: "P", color: "bg-yellow-500" },
    { id: 4, name: "New Balance", handle: "@nb", events: 1, logo: "NB", color: "bg-gray-600" },
    { id: 5, name: "Reebok", handle: "@reebok", events: 1, logo: "R", color: "bg-blue-700" },
];

const XP_HISTORY = [
    { date: "Mar 2026", xp: 340, source: "Post ranked #1 — Cyberpunk Challenge" },
    { date: "Feb 2026", xp: 880, source: "Post ranked #1 — Nike Air Max Redesign" },
    { date: "Feb 2026", xp: 110, source: "Post ranked #3 — Adidas Futurecraft" },
    { date: "Feb 2026", xp: 42, source: "Post participated — NB Minimalist Sketch" },
    { date: "Jan 2026", xp: 55, source: "Votes cast — 5 events" },
];

const FOLLOWERS = [
    { id: 1, name: "Maya Chen", handle: "@mayavisuals", avatar: "MC", since: "Feb 2026" },
    { id: 2, name: "Jake Rivera", handle: "@jakedraws", avatar: "JR", since: "Jan 2026" },
    { id: 3, name: "Sofia Blanco", handle: "@sofblanco", avatar: "SB", since: "Mar 2026" },
    { id: 4, name: "Tom Park", handle: "@tpark", avatar: "TP", since: "Feb 2026" },
];

// ─── Computed totals ─────────────────────────────────────────

const totalVotesReceived = CREATOR_POSTS.reduce((s, p) => s + p.votesReceived, 0);
const totalVotesCast = VOTER_HISTORY.reduce((s, v) => s + v.votesCast, 0);
const totalXP = XP_HISTORY.reduce((s, x) => s + x.xp, 0);
const totalEarnings = CREATOR_POSTS.reduce((s, p) => s + parseFloat(p.earnings.replace("$", "")), 0)
    + VOTER_HISTORY.reduce((s, v) => s + parseFloat(v.earned.replace("$", "")), 0);

const TOP_STATS = [
    { label: "Total XP", value: totalXP.toLocaleString(), icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Posts Submitted", value: CREATOR_POSTS.length, icon: ImageIcon, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Votes Received", value: totalVotesReceived.toLocaleString(), icon: ThumbsUp, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Votes Cast", value: totalVotesCast, icon: Vote, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Earned", value: `$${totalEarnings.toFixed(2)}`, icon: Zap, color: "text-primary", bg: "bg-primary/10" },
    { label: "Followers", value: FOLLOWERS.length, icon: Users, color: "text-pink-400", bg: "bg-pink-500/10" },
];

// ─── Rank badge ──────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-black border border-yellow-500/25">
            <Crown className="w-3 h-3" /> #1
        </span>
    );
    if (rank <= 3) return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black border border-primary/25">
            <Trophy className="w-3 h-3" /> #{rank}
        </span>
    );
    return (
        <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold border border-border">
            #{rank}
        </span>
    );
}

// ─── Page ────────────────────────────────────────────────────

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <SidebarLayout>
                <main className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-10 pb-28 md:pb-12">

                    {/* Header */}
                    <div className="border-b border-border pb-6">
                        <h1 className="text-5xl md:text-7xl font-display text-foreground uppercase tracking-tighter leading-none mb-3">
                            <span className="text-primary">Dashboard</span>
                        </h1>
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-l-4 border-primary pl-3">
                            Creator & Voter activity — all tracked
                        </p>
                    </div>

                    {/* Top stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {TOP_STATS.map((stat) => (
                            <div key={stat.label} className={cn(
                                "bg-card border border-border rounded-2xl p-4 flex flex-col gap-2",
                                "hover:-translate-y-0.5 transition-transform"
                            )}>
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg)}>
                                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                                </div>
                                <p className="text-2xl font-display text-foreground tracking-tight">{stat.value}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

                        {/* Left column */}
                        <div className="space-y-8">

                            {/* ── Creator Mode ── */}
                            <section className="bg-card border border-border rounded-[24px] overflow-hidden">
                                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                                    <ImageIcon className="w-5 h-5 text-blue-400" />
                                    <h2 className="font-black text-lg">Creator Mode</h2>
                                    <span className="ml-auto text-xs font-bold text-muted-foreground">{CREATOR_POSTS.length} posts</span>
                                </div>

                                {/* Table header */}
                                <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 border-b border-border bg-secondary/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <div className="col-span-5">Post</div>
                                    <div className="col-span-2 text-center">Votes Received</div>
                                    <div className="col-span-2 text-center">Rank</div>
                                    <div className="col-span-1 text-center">XP</div>
                                    <div className="col-span-2 text-right">Earned</div>
                                </div>

                                <div className="divide-y divide-border">
                                    {CREATOR_POSTS.map((post) => (
                                        <div key={post.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-secondary/20 transition-colors">
                                            <div className="col-span-5 flex items-center gap-3">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border">
                                                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-foreground line-clamp-1">{post.title}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Building2 className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-[11px] text-muted-foreground">{post.brand}</span>
                                                        <span className="text-muted-foreground/30">·</span>
                                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-[11px] text-muted-foreground">{post.date}</span>
                                                    </div>
                                                    {/* Mobile stats */}
                                                    <div className="md:hidden flex items-center gap-3 mt-2">
                                                        <span className="text-xs font-black text-purple-400 flex items-center gap-1">
                                                            <ThumbsUp className="w-3 h-3" /> {post.votesReceived.toLocaleString()}
                                                        </span>
                                                        <RankBadge rank={post.rank} />
                                                        <span className="text-xs font-black text-primary ml-auto">{post.earnings}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="hidden md:flex col-span-2 justify-center items-center gap-1.5">
                                                <ThumbsUp className="w-3.5 h-3.5 text-purple-400" />
                                                <span className="font-black text-sm text-foreground">{post.votesReceived.toLocaleString()}</span>
                                            </div>

                                            <div className="hidden md:flex col-span-2 justify-center">
                                                <RankBadge rank={post.rank} />
                                            </div>

                                            <div className="hidden md:flex col-span-1 justify-center">
                                                <span className="font-black text-sm text-yellow-400 flex items-center gap-1">
                                                    <Star className="w-3 h-3" />{post.xp}
                                                </span>
                                            </div>

                                            <div className="hidden md:flex col-span-2 justify-end">
                                                <span className="font-black text-sm text-primary">{post.earnings}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* ── Voter Mode ── */}
                            <section className="bg-card border border-border rounded-[24px] overflow-hidden">
                                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                                    <Vote className="w-5 h-5 text-emerald-400" />
                                    <h2 className="font-black text-lg">Voter Mode</h2>
                                    <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1">
                                            <ThumbsUp className="w-3 h-3 text-emerald-400" />
                                            {totalVotesCast} cast
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ThumbsDown className="w-3 h-3 text-purple-400" />
                                            {totalVotesReceived.toLocaleString()} received
                                        </span>
                                    </div>
                                </div>

                                {/* Votes cast vs received highlight */}
                                <div className="grid grid-cols-2 gap-0 border-b border-border">
                                    <div className="px-6 py-4 border-r border-border">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ThumbsUp className="w-4 h-4 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Votes Cast</span>
                                        </div>
                                        <p className="text-3xl font-display text-foreground">{totalVotesCast}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Across {VOTER_HISTORY.length} events</p>
                                    </div>
                                    <div className="px-6 py-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ThumbsDown className="w-4 h-4 text-purple-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Votes Received</span>
                                        </div>
                                        <p className="text-3xl font-display text-foreground">{totalVotesReceived.toLocaleString()}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">On {CREATOR_POSTS.length} posts</p>
                                    </div>
                                </div>

                                {/* Voting history */}
                                <div className="divide-y divide-border">
                                    {VOTER_HISTORY.map((v) => (
                                        <div key={v.id} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-foreground line-clamp-1">{v.eventTitle}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-[11px] text-muted-foreground">{v.brand}</span>
                                                    <span className="text-muted-foreground/30">·</span>
                                                    <span className="text-[11px] text-muted-foreground">{v.date}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-[11px] font-bold text-muted-foreground">
                                                    {v.votesCast} vote{v.votesCast > 1 ? "s" : ""}
                                                </span>
                                                {v.pickedWinner ? (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-black border border-yellow-500/25">
                                                        <Crown className="w-2.5 h-2.5" /> Winner
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold border border-border">
                                                        Voted
                                                    </span>
                                                )}
                                                <span className="text-sm font-black text-primary">{v.earned}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>

                        {/* Right column */}
                        <div className="space-y-6">

                            {/* ── XP Timeline ── */}
                            <section className="bg-card border border-border rounded-[24px] overflow-hidden">
                                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-400" />
                                    <h3 className="font-black text-base">XP Timeline</h3>
                                    <span className="ml-auto font-black text-yellow-400">{totalXP.toLocaleString()} XP</span>
                                </div>
                                <div className="p-5 space-y-3">
                                    {XP_HISTORY.map((x, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1 shrink-0" />
                                                {i < XP_HISTORY.length - 1 && (
                                                    <div className="w-px flex-1 bg-border mt-1 min-h-[24px]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pb-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-foreground/70 line-clamp-1">{x.source}</p>
                                                    <span className="text-xs font-black text-yellow-400 shrink-0">+{x.xp}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{x.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* ── Brands I've Engaged ── */}
                            <section className="bg-card border border-border rounded-[24px] overflow-hidden">
                                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-primary" />
                                    <h3 className="font-black text-base">Brands Engaged</h3>
                                    <span className="ml-auto text-xs text-muted-foreground font-medium">{ENGAGED_BRANDS.length} brands</span>
                                </div>
                                <div className="p-5 space-y-3">
                                    {ENGAGED_BRANDS.map((brand) => (
                                        <div key={brand.id} className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-xs",
                                                brand.color
                                            )}>
                                                {brand.logo}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-foreground">{brand.name}</p>
                                                <p className="text-[11px] text-muted-foreground">{brand.handle}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-sm text-foreground">{brand.events}</p>
                                                <p className="text-[10px] text-muted-foreground">events</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* ── Followers ── */}
                            <section className="bg-card border border-border rounded-[24px] overflow-hidden">
                                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-pink-400" />
                                    <h3 className="font-black text-base">Followers</h3>
                                    <span className="ml-auto text-xs text-muted-foreground font-medium">{FOLLOWERS.length} followers</span>
                                </div>
                                <div className="p-5 space-y-3">
                                    {FOLLOWERS.map((f) => (
                                        <div key={f.id} className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-black text-primary">{f.avatar}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-foreground">{f.name}</p>
                                                <p className="text-[11px] text-muted-foreground">{f.handle}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground shrink-0">{f.since}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    </div>

                </main>
            </SidebarLayout>
        </div>
    );
}
