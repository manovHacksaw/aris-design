"use client";

import { UserPlus, UserMinus, Star, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLoginModal } from "@/context/LoginModalContext";
import { useUser } from "@/context/UserContext";

interface SuggestedItem {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    isFollowed: boolean;
    category?: string;
    username?: string; // for user items
}

export default function ExploreSidebar({
    brands,
    creators,
    loading = false,
}: {
    brands: SuggestedItem[];
    creators: SuggestedItem[];
    loading?: boolean;
}) {
    const router = useRouter();
    return (
        <aside className="hidden lg:flex flex-col gap-8 w-[280px] shrink-0 sticky top-[160px] h-fit">
            {/* Recommended Brands */}
            {loading ? (
                <BrandSkeleton />
            ) : (
                <SuggestedSection
                    title="Recommended Brands"
                    items={brands}
                    type="brand"
                    onViewAll={() => router.push("/leaderboard?tab=brands")}
                />
            )}

            {/* Rising Creators */}
            {creators.length > 0 && (
                <SuggestedSection title="Rising Creators" items={creators} type="user" />
            )}



        </aside>
    );
}

function BrandSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-white/[0.04] rounded w-3/4" />
                        <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                    </div>
                    <div className="h-6 w-14 bg-white/[0.04] rounded" />
                </div>
            ))}
        </div>
    );
}

function SuggestedSection({
    title,
    items,
    type,
    onViewAll,
}: {
    title: string;
    items: SuggestedItem[];
    type: "brand" | "user";
    onViewAll?: () => void;
}) {
    if (!items.length) return null;
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">{title}</h3>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                        View All
                    </button>
                )}
            </div>
            <div className="space-y-3">
                {items.map((item) => (
                    <SuggestedItemCard key={item.id} item={item} type={type} />
                ))}
            </div>
        </div>
    );
}

function SuggestedItemCard({ item, type }: { item: SuggestedItem; type: "brand" | "user" }) {
    const router = useRouter();
    const { isAuthenticated } = useUser();
    const { openLoginModal } = useLoginModal();
    const [followed, setFollowed] = useState(item.isFollowed);
    const [loading, setLoading] = useState(false);

    const handleFollow = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) { openLoginModal(); return; }
        setLoading(true);
        setTimeout(() => {
            setFollowed(!followed);
            setLoading(false);
        }, 400);
    };

    const handleNavigate = () => {
        if (type === "brand") {
            router.push(`/brand/${item.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`);
        } else {
            const username = item.username || item.handle.replace(/^@/, "");
            router.push(`/profile/${username}`);
        }
    };

    return (
        <div
            className="flex items-center justify-between group py-1 cursor-pointer"
            onClick={handleNavigate}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl border border-border bg-foreground/5 overflow-hidden flex items-center justify-center">
                        {item.avatar ? (
                            <img src={item.avatar} className="w-full h-full object-cover" alt={item.name} />
                        ) : (
                            <span className="text-xs font-black text-foreground/30">{item.name[0]}</span>
                        )}
                    </div>
                    {followed && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-black text-foreground truncate group-hover:text-primary transition-colors">{item.name}</p>
                        {type === "user" && (
                            <div className="flex items-center justify-center bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full border border-primary/20">
                                LVL {(item as any).level || 1}
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-foreground/25 truncate uppercase tracking-widest">{item.handle}</p>
                </div>
            </div>
            <button
                onClick={handleFollow}
                disabled={loading}
                className={cn(
                    "ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                    followed
                        ? "bg-foreground/5 border-border text-foreground/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/20"
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
