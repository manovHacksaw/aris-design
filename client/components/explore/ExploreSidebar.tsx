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
            <div className="h-3 w-32 bg-foreground/6 rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-foreground/6 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-foreground/6 rounded w-3/4" />
                        <div className="h-2 bg-foreground/6 rounded w-1/2" />
                    </div>
                    <div className="h-6 w-14 bg-foreground/6 rounded" />
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
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">{title}</h3>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-[10px] font-semibold text-foreground/40 lowercase hover:text-foreground hover:underline transition-colors"
                    >
                        view all
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

    const bgColors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-amber-500"];
    const colorIndex = item.name.length % bgColors.length;
    const bgClass = type === "brand" ? bgColors[colorIndex] : "bg-foreground/5";

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
            className="flex items-center justify-between group py-2 px-2 -mx-2 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
            onClick={handleNavigate}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                    <div className={cn("w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-surface-border", bgClass)}>
                        {item.avatar ? (
                            <img src={item.avatar} className="w-full h-full object-cover" alt={item.name} />
                        ) : (
                            <span className={cn("text-xs font-black", type === "brand" ? "text-white dark:text-white" : "text-foreground/30")}>
                                {item.name[0]}
                            </span>
                        )}
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 w-full">
                        <p className="text-[12px] font-bold text-foreground truncate group-hover:text-white transition-colors">
                            {item.name}
                        </p>
                    </div>
                    <p className="text-[10px] font-semibold text-foreground/40 truncate tracking-wide mt-0.5 group-hover:text-foreground/60 transition-colors">
                        {item.handle}
                        <span className="text-foreground/20 mx-1">·</span>
                        <span className="text-foreground/50">
                            {type === "brand" ? (item.category || "Lifestyle") : `${(item as any).followers || "2.4k"} followers`}
                        </span>
                    </p>
                </div>
            </div>
            
            <button
                onClick={handleFollow}
                disabled={loading}
                className={cn(
                    "ml-3 shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all group-hover:bg-white/5 hover:!bg-white/10",
                    followed ? "text-foreground/30 hover:!text-red-400" : "text-foreground/50 hover:!text-white"
                )}
            >
                {loading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : followed ? (
                    <UserMinus className="w-4 h-4" />
                ) : (
                    <UserPlus className="w-4 h-4" />
                )}
            </button>
        </div>
    );
}
