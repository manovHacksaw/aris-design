"use client";

import { motion } from "framer-motion";
import { UserPlus, UserMinus, Star, ChevronRight } from "lucide-react";
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
        <aside className="hidden lg:flex flex-col gap-10 w-[300px] shrink-0 sticky top-[200px] h-fit">
            {/* Recommended Brands */}
            <SuggestedSection title="Recommended Brands" items={brands} />

            {/* Rising Creators */}
            <SuggestedSection title="Rising Creators" items={creators} />

            {/* Aris Pro Banner */}
            <div className="relative rounded-3xl overflow-hidden p-6 cursor-pointer border border-white/5 group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-blue-900/10 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/20 via-blue-900/15 to-transparent" />
                <div className="relative z-10 space-y-3">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                    <p className="text-sm font-black text-white uppercase leading-tight tracking-tight">Level up your<br />Creator Game</p>
                    <p className="text-[10px] font-bold text-white/30 leading-relaxed">Unlock pro tools, analytics, and exclusive events.</p>
                    <button className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:gap-2 transition-all">
                        Go Pro <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

function SuggestedSection({ title, items }: { title: string; items: SuggestedItem[] }) {
    if (!items.length) return null;
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{title}</h3>
                <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-3">
                {items.map((item) => (
                    <SuggestedItemCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}

function SuggestedItemCard({ item }: { item: SuggestedItem }) {
    const [followed, setFollowed] = useState(item.isFollowed);
    const [loading, setLoading] = useState(false);

    const handleFollow = () => {
        setLoading(true);
        setTimeout(() => {
            setFollowed(!followed);
            setLoading(false);
        }, 400);
    };

    return (
        <div className="flex items-center justify-between group py-1">
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                    <img src={item.avatar} className="w-9 h-9 rounded-xl object-cover border border-white/8" alt={item.name} />
                    {followed && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-black text-white truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-white/25 truncate uppercase tracking-widest">{item.handle}</p>
                </div>
            </div>
            <button
                onClick={handleFollow}
                disabled={loading}
                className={cn(
                    "ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                    followed
                        ? "bg-white/5 border-white/8 text-white/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/20"
                        : "bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white"
                )}
            >
                {loading ? (
                    <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : followed ? (
                    <><UserMinus className="w-3 h-3" /> Following</>
                ) : (
                    <><UserPlus className="w-3 h-3" /> Follow</>
                )}
            </button>
        </div>
    );
}
