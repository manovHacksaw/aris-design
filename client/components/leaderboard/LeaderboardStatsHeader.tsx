"use client";

import { motion } from "framer-motion";
import { Trophy, Star, Users, Flame, MousePointerClick, Zap, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import UserStatsCard from "./UserStatsCard";
import TopUsers from "./TopUsers";
import SquareEventCard from "@/components/events/SquareEventCard";
import Link from "next/link";

interface LeaderboardStatsHeaderProps {
    tab: 'users' | 'brands' | 'events' | 'content';
    user: any;
    topData: {
        brands: any[];
        events: any[];
        content: any[];
    };
}

export default function LeaderboardStatsHeader({ tab, user, topData }: LeaderboardStatsHeaderProps) {
    if (tab === 'users') {
        return (
            <div className="space-y-12">
                <div className="space-y-6">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.2em] opacity-30">Your Standings</h3>
                    <UserStatsCard user={user} />
                </div>
                <div className="space-y-8">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.2em] opacity-30">Top Contenders</h3>
                    <TopUsers />
                </div>
            </div>
        );
    }

    if (tab === 'brands') {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.2em] opacity-30">Followed Brands</h3>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                        {topData.brands.length} Following
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {topData.brands.length > 0 ? topData.brands.map((brand, i) => (
                        <motion.div
                            key={brand.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-center group cursor-pointer hover:bg-white/[0.05] transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black shadow-lg">#{brand.rank || i + 1}</div>
                            <img
                                src={brand.avatar || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80"}
                                className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover border-2 border-white/5 group-hover:border-primary/50 transition-colors"
                            />
                            <h4 className="text-sm font-black text-white truncate mb-1">{brand.name}</h4>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{brand.campaignsCount} Campaigns</p>
                        </motion.div>
                    )) : (
                        <div className="col-span-full py-12 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
                            <Star className="w-8 h-8 text-white/10 mx-auto mb-3" />
                            <p className="text-xs font-black text-white/20 uppercase tracking-widest">No followed brands yet</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (tab === 'events') {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.2em] opacity-30">Your Participations</h3>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                        Active In {topData.events.length}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {topData.events.length > 0 ? topData.events.map((event, i) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <SquareEventCard event={event} />
                        </motion.div>
                    )) : (
                        <div className="col-span-full py-16 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
                            <Layout className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-xs font-black text-white/20 uppercase tracking-widest">Jump into an event to see your rank here</p>
                            <Link href="/explore">
                                <button className="mt-4 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 bg-primary/5 px-6 py-2 rounded-full hover:bg-primary hover:text-white transition-all">Explore Events</button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (tab === 'content') {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.2em] opacity-30">Your Top Content</h3>
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/20">
                        {topData.content.length} Submissions
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {topData.content.length > 0 ? topData.content.map((post, i) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="group aspect-[3/4] relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
                        >
                            <img src={post.imageCid ? `https://gateway.pinata.cloud/ipfs/${post.imageCid}` : post.imageUrl || post.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <ThumbsUp className="w-3 h-3 text-primary fill-current" />
                                    <span className="text-xs font-black text-white">{post.voteCount || post._count?.votes || 0}</span>
                                </div>
                                <p className="text-[10px] font-bold text-white/50 truncate">Rank #{post.rank || '—'}</p>
                            </div>
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/5 text-[9px] font-black text-white/60">
                                ${post.earned || 0} EARNED
                            </div>
                        </motion.div>
                    )) : (
                        <div className="col-span-full py-16 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/10">
                            <Flame className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-xs font-black text-white/20 uppercase tracking-widest">Create stunning content to top the charts</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

function ThumbsUp({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
    );
}
