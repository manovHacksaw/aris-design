"use client";

import { motion } from "framer-motion";
import { UserPlus, Star, ChevronRight, UserMinus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SuggestedItem {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    isFollowed: boolean;
    category?: string;
}

export default function ExploreSidebar({ brands, creators }: { brands: SuggestedItem[], creators: SuggestedItem[] }) {
    return (
        <aside className="hidden lg:flex flex-col gap-10 w-[320px] shrink-0 sticky top-10 h-fit">
            {/* Recommended Brands */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Recommended Brands</h3>
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                    {brands.map((brand) => (
                        <SuggestedItemCard key={brand.id} item={brand} />
                    ))}
                </div>
            </div>

            {/* Rising Creators */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Rising Creators</h3>
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                    {creators.map((creator) => (
                        <SuggestedItemCard key={creator.id} item={creator} />
                    ))}
                </div>
            </div>

            {/* Aris Premium Banner */}
            <div className="relative rounded-3xl overflow-hidden p-6 group cursor-pointer border border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-900/10 to-transparent" />
                <div className="relative z-10 space-y-3">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                    <p className="text-sm font-black text-white uppercase tracking-tight">Level up your <br />Creator Game</p>
                    <button className="text-[9px] font-black text-white/60 uppercase tracking-widest group-hover:text-primary transition-colors flex items-center gap-1">
                        Go Pro <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

function SuggestedItemCard({ item }: { item: SuggestedItem }) {
    const [followed, setFollowed] = useState(item.isFollowed);
    const [loading, setLoading] = useState(false);

    const handleFollow = () => {
        setLoading(true);
        // Mock follow
        setTimeout(() => {
            setFollowed(!followed);
            setLoading(false);
        }, 500);
    };

    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                    <img src={item.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/5" alt={item.name} />
                    {followed && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-[#0A0A0C]" />}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-black text-white truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-white/20 truncate uppercase tracking-widest">{item.handle}</p>
                </div>
            </div>
            <button
                onClick={handleFollow}
                disabled={loading}
                className={cn(
                    "p-2 rounded-lg transition-all border",
                    followed
                        ? "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-red-400 hover:border-red-400/20"
                        : "bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white"
                )}
            >
                {loading ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : followed ? <UserPlus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </button>
        </div>
    );
}
