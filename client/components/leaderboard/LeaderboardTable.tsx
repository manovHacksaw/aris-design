"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Calendar, Trophy } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { getUserLeaderboard, getBrandLeaderboard, getEventLeaderboard } from "@/services/leaderboard.service";

type TabType = "users" | "brands" | "events";

interface LeaderboardTableProps {
    activeTab: TabType;
    domain?: string;
    timeline?: string;
}

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-[11px] font-black text-amber-400 tabular-nums w-6 text-center">01</span>;
    if (rank === 2) return <span className="text-[11px] font-black text-zinc-300 tabular-nums w-6 text-center">02</span>;
    if (rank === 3) return <span className="text-[11px] font-black text-orange-400 tabular-nums w-6 text-center">03</span>;
    return <span className="text-[11px] font-black text-white/18 tabular-nums w-6 text-center">{String(rank).padStart(2, "0")}</span>;
}

function SkeletonRows() {
    return (
        <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-2 animate-pulse">
                    <div className="w-6 h-3 bg-white/[0.04] rounded" />
                    <div className="w-[26px] h-[26px] rounded-full bg-white/[0.04]" />
                    <div className="flex-1 h-3 bg-white/[0.04] rounded max-w-[160px]" />
                    <div className="ml-auto w-12 h-3 bg-white/[0.04] rounded" />
                    <div className="w-10 h-3 bg-white/[0.04] rounded" />
                </div>
            ))}
        </div>
    );
}

function ColHead({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] text-white/20", className)}>
            {children}
        </span>
    );
}

export default function LeaderboardTable({ activeTab, domain = "ALL", timeline = "A" }: LeaderboardTableProps) {
    const { user: currentUser } = useUser();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            try {
                if (activeTab === "users") {
                    const res = await getUserLeaderboard(1, 50, timeline);
                    setData(res.data || []);
                } else if (activeTab === "brands") {
                    const res = await getBrandLeaderboard(timeline);
                    setData(res.data || []);
                } else {
                    const res = await getEventLeaderboard(timeline);
                    setData(Array.isArray(res?.data) ? res.data : []);
                }
            } catch {
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activeTab, timeline]);

    const filtered =
        domain === "ALL"
            ? data
            : data.filter((item: any) => {
                if (Array.isArray(item.categories)) {
                    return item.categories.some((c: string) => c.toUpperCase() === domain);
                }
                return item.category?.toUpperCase() === domain || item.domain?.toUpperCase() === domain;
            });

    if (loading) return <SkeletonRows />;

    if (!filtered.length) {
        return (
            <div className="py-24 text-center">
                <Trophy className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-xs text-white/25 font-black uppercase tracking-widest">No data available</p>
            </div>
        );
    }

    /* ── USERS ── */
    if (activeTab === "users") {
        const currentUserEntry = currentUser
            ? filtered.find(
                (item: any) =>
                    item.id === currentUser.id ||
                    item.username === currentUser.username
            )
            : null;
        const currentUserRank = currentUserEntry
            ? currentUserEntry.rank || filtered.indexOf(currentUserEntry) + 1
            : null;
        const showPinnedSelf = currentUserEntry && currentUserRank != null && currentUserRank > 3;

        const UserRow = ({ item, i, pinned }: { item: any; i: number; pinned?: boolean }) => {
            const isCurrent =
                item.id === currentUser?.id ||
                item.username === currentUser?.username;
            return (
                <Link
                    href={`/profile/${item.username}`}
                    className={cn(
                        "grid grid-cols-[24px_1fr_72px_72px_56px] sm:grid-cols-[24px_1fr_88px_88px_72px] gap-2 sm:gap-4 items-center px-2 py-3 rounded-lg transition-colors",
                        pinned
                            ? "bg-primary/[0.07] border border-primary/[0.15]"
                            : isCurrent
                                ? "bg-primary/[0.06]"
                                : "hover:bg-white/[0.025]"
                    )}
                >
                    <RankBadge rank={item.rank || i + 1} />

                    <div className="flex items-center gap-2.5 min-w-0">
                        {item.avatarUrl ? (
                            <img
                                src={item.avatarUrl}
                                className="w-[26px] h-[26px] rounded-full object-cover flex-shrink-0"
                                alt={item.displayName}
                            />
                        ) : (
                            <div className="w-[26px] h-[26px] rounded-full bg-white/[0.06] flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p
                                className={cn(
                                    "text-[13px] font-semibold truncate leading-tight",
                                    isCurrent ? "text-primary" : "text-white/85"
                                )}
                            >
                                {item.displayName || item.username}
                            </p>
                            <p className="text-[10px] text-white/25 truncate leading-tight">
                                @{item.username}
                            </p>
                        </div>
                        {isCurrent && (
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0 ml-1">
                                you
                            </span>
                        )}
                    </div>

                    <span className="text-[12px] font-black text-primary text-right tabular-nums">
                        {(item.xp || 0).toLocaleString()}
                    </span>
                    <span className="text-[12px] text-white/35 text-right tabular-nums">
                        {(item.votesCast || 0).toLocaleString()}
                    </span>
                    <span className="text-[12px] font-bold text-white/40 text-right">
                        Lv.{item.level || 1}
                    </span>
                </Link>
            );
        };

        return (
            <div>
                <div className="grid grid-cols-[24px_1fr_72px_72px_56px] sm:grid-cols-[24px_1fr_88px_88px_72px] gap-2 sm:gap-4 px-2 pb-2.5 border-b border-white/[0.05]">
                    <ColHead>#</ColHead>
                    <ColHead>User</ColHead>
                    <ColHead className="text-right">XP</ColHead>
                    <ColHead className="text-right">Votes</ColHead>
                    <ColHead className="text-right">Level</ColHead>
                </div>

                {/* Pinned self row when not in top 3 */}
                {showPinnedSelf && (
                    <>
                        <div className="py-1.5">
                            <UserRow
                                item={currentUserEntry}
                                i={filtered.indexOf(currentUserEntry)}
                                pinned
                            />
                        </div>
                        <div className="flex items-center gap-3 py-1 px-2">
                            <div className="flex-1 border-t border-white/[0.05]" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/15">rankings</span>
                            <div className="flex-1 border-t border-white/[0.05]" />
                        </div>
                    </>
                )}

                <div className="divide-y divide-white/[0.03]">
                    {filtered.map((item: any, i: number) => (
                        <UserRow key={item.id || i} item={item} i={i} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── BRANDS ── */
    if (activeTab === "brands") {
        return (
            <div>
                <div className="grid grid-cols-[24px_1fr_80px_88px] gap-3 sm:gap-5 px-2 pb-2.5 border-b border-white/[0.05]">
                    <ColHead>#</ColHead>
                    <ColHead>Brand</ColHead>
                    <ColHead className="text-right">Events</ColHead>
                    <ColHead className="text-right">Participants</ColHead>
                </div>
                <div className="divide-y divide-white/[0.03]">
                    {filtered.map((item: any, i: number) => {
                        const logoSrc = item.avatar
                            ? item.avatar.startsWith("http")
                                ? item.avatar
                                : `${PINATA_GW}/${item.avatar}`
                            : null;
                        return (
                            <Link
                                key={item.id || i}
                                href={`/brand/${item.id}`}
                                className="grid grid-cols-[24px_1fr_80px_88px] gap-3 sm:gap-5 items-center px-2 py-3 rounded-lg hover:bg-white/[0.025] transition-colors"
                            >
                                <RankBadge rank={item.rank || i + 1} />

                                <div className="flex items-center gap-2.5 min-w-0">
                                    {logoSrc ? (
                                        <img
                                            src={logoSrc}
                                            className="w-[26px] h-[26px] rounded-md object-cover flex-shrink-0"
                                            alt={item.name}
                                        />
                                    ) : (
                                        <div className="w-[26px] h-[26px] rounded-md bg-white/[0.06] flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-white/85 truncate leading-tight">
                                            {item.name}
                                        </p>
                                        {item.categories?.length > 0 ? (
                                            <p className="text-[10px] text-white/25 truncate leading-tight">
                                                {item.categories.slice(0, 2).join(" · ")}
                                            </p>
                                        ) : item.bio ? (
                                            <p className="text-[10px] text-white/25 truncate leading-tight">
                                                {item.bio}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <span className="text-[12px] font-black text-white/55 text-right tabular-nums">
                                    {(item.artMinted || 0).toLocaleString()}
                                </span>
                                <span className="text-[12px] text-white/35 text-right tabular-nums">
                                    {(item.participants || 0).toLocaleString()}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    /* ── EVENTS ── */
    const statusCfg = (s: string) => {
        if (s === "posting") return { dot: "bg-blue-400", label: "Posting" };
        if (s === "voting") return { dot: "bg-emerald-400", label: "Voting" };
        if (s === "completed") return { dot: "bg-white/20", label: "Done" };
        if (s === "scheduled") return { dot: "bg-yellow-400", label: "Scheduled" };
        return { dot: "bg-white/15", label: s || "—" };
    };

    return (
        <div>
            <div className="grid grid-cols-[24px_1fr_80px_100px] sm:grid-cols-[24px_1fr_80px_80px_100px] gap-3 sm:gap-5 px-2 pb-2.5 border-b border-white/[0.05]">
                <ColHead>#</ColHead>
                <ColHead>Event</ColHead>
                <ColHead className="text-right">Prize</ColHead>
                <ColHead className="text-right hidden sm:block">Participants</ColHead>
                <ColHead className="text-right">Status</ColHead>
            </div>
            <div className="divide-y divide-white/[0.03]">
                {filtered.map((item: any, i: number) => {
                    const sc = statusCfg(item.status);
                    const thumb = item.imageUrl
                        || (item.imageCid ? `${PINATA_GW}/${item.imageCid}` : null)
                        || item.coverImage
                        || item.avatar
                        || null;
                    return (
                        <Link
                            key={item.id || i}
                            href={`/events/${item.id}`}
                            className="grid grid-cols-[24px_1fr_80px_100px] sm:grid-cols-[24px_1fr_80px_80px_100px] gap-3 sm:gap-5 items-center px-2 py-3 rounded-lg hover:bg-white/[0.025] transition-colors"
                        >
                            <RankBadge rank={item.rank || i + 1} />

                            <div className="flex items-center gap-2.5 min-w-0">
                                {thumb ? (
                                    <img
                                        src={thumb}
                                        className="w-[26px] h-[26px] rounded object-cover flex-shrink-0"
                                        alt={item.title}
                                    />
                                ) : (
                                    <div className="w-[26px] h-[26px] rounded bg-white/[0.06] flex-shrink-0 flex items-center justify-center">
                                        <Calendar className="w-3 h-3 text-white/20" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-white/85 truncate leading-tight">
                                        {item.title}
                                    </p>
                                    {item.brand?.name && (
                                        <p className="text-[10px] text-white/25 truncate leading-tight">
                                            {item.brand.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <span className="text-[12px] font-black text-lime-400 text-right tabular-nums">
                                {item.prizePool || item.leaderboardPool
                                    ? `$${(item.prizePool || item.leaderboardPool).toLocaleString()}`
                                    : "—"}
                            </span>

                            <span className="text-[12px] text-white/35 text-right tabular-nums hidden sm:block">
                                {(item.participants || item._count?.submissions || 0).toLocaleString()}
                            </span>

                            <div className="flex items-center justify-end gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                                    {sc.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
