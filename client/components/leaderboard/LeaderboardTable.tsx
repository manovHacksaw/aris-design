"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Calendar, Trophy, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { getUserLeaderboard, getBrandLeaderboard, getEventLeaderboard } from "@/services/leaderboard.service";

type TabType = "users" | "brands" | "events";

interface LeaderboardTableProps {
    activeTab: TabType;
    domain?: string;
    timeline?: string;
}

const PAGE_SIZE = 15;
const FETCH_LIMIT = 500; // fetch all, paginate client-side (backend ignores limit param)
const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-[11px] font-black text-amber-400 tabular-nums w-6 text-center">01</span>;
    if (rank === 2) return <span className="text-[11px] font-black text-zinc-400 tabular-nums w-6 text-center">02</span>;
    if (rank === 3) return <span className="text-[11px] font-black text-orange-400 tabular-nums w-6 text-center">03</span>;
    return <span className="text-[11px] font-black text-foreground/20 tabular-nums w-6 text-center">{String(rank).padStart(2, "0")}</span>;
}

function SkeletonRows() {
    return (
        <div className="divide-y divide-border">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-2 animate-pulse">
                    <div className="w-6 h-3 bg-foreground/[0.04] rounded" />
                    <div className="w-[26px] h-[26px] rounded-full bg-foreground/[0.04]" />
                    <div className="flex-1 h-3 bg-foreground/[0.04] rounded max-w-[160px]" />
                    <div className="ml-auto w-12 h-3 bg-foreground/[0.04] rounded" />
                    <div className="w-10 h-3 bg-foreground/[0.04] rounded" />
                </div>
            ))}
        </div>
    );
}

function ColHead({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30", className)}>
            {children}
        </span>
    );
}

function Pagination({
    page,
    totalPages,
    loading,
    onPrev,
    onNext,
}: {
    page: number;
    totalPages: number;
    loading: boolean;
    onPrev: () => void;
    onNext: () => void;
}) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-3 pt-5 pb-2">
            <button
                onClick={onPrev}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.07] border border-border text-[11px] font-black uppercase tracking-widest text-foreground/50 hover:text-foreground transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                Prev
            </button>

            <span className="text-[11px] font-black tabular-nums text-foreground/30">
                {page} / {totalPages}
            </span>

            <button
                onClick={onNext}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.07] border border-border text-[11px] font-black uppercase tracking-widest text-foreground/50 hover:text-foreground transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
                Next
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}

export default function LeaderboardTable({ activeTab, domain = "ALL", timeline = "A" }: LeaderboardTableProps) {
    const { user: currentUser } = useUser();

    // All three tabs use the same pattern: fetch full list once, paginate client-side.
    // (Backend does not honor the limit param reliably.)
    const [allData, setAllData] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPage(1);
        setLoading(true);
        const fetch = async () => {
            try {
                let rows: any[] = [];
                if (activeTab === "users") {
                    const res = await getUserLeaderboard(1, FETCH_LIMIT, timeline);
                    rows = res.data || [];
                } else if (activeTab === "brands") {
                    const res = await getBrandLeaderboard(timeline);
                    rows = res.data || [];
                } else {
                    const res = await getEventLeaderboard(timeline);
                    rows = Array.isArray(res?.data) ? res.data : [];
                }
                setAllData(rows);
            } catch {
                setAllData([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [activeTab, timeline]);

    // Reset page when domain filter changes
    useEffect(() => { setPage(1); }, [domain]);

    if (loading) return <SkeletonRows />;

    const filtered =
        domain === "ALL"
            ? allData
            : allData.filter((item: any) => {
                if (Array.isArray(item.categories)) return item.categories.some((c: string) => c.toUpperCase() === domain);
                return item.category?.toUpperCase() === domain || item.domain?.toUpperCase() === domain;
            });

    if (!filtered.length) {
        return (
            <div className="py-24 text-center">
                <Trophy className="w-8 h-8 text-foreground/10 mx-auto mb-3" />
                <p className="text-xs text-foreground/25 font-black uppercase tracking-widest">No data available</p>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* ── USERS ── */
    if (activeTab === "users") {
        const currentUserEntry = currentUser
            ? filtered.find((item: any) => item.id === currentUser.id || item.username === currentUser.username)
            : null;
        const currentUserRank = currentUserEntry
            ? currentUserEntry.rank || filtered.indexOf(currentUserEntry) + 1
            : null;
        const showPinnedSelf = currentUserEntry && currentUserRank != null && currentUserRank > 3;

        const UserRow = ({ item, globalIndex, pinned }: { item: any; globalIndex: number; pinned?: boolean }) => {
            const isCurrent = item.id === currentUser?.id || item.username === currentUser?.username;
            return (
                <Link
                    href={`/profile/${item.username}`}
                    className={cn(
                        "grid grid-cols-[24px_1fr_72px_72px_56px] sm:grid-cols-[24px_1fr_88px_88px_72px] gap-2 sm:gap-4 items-center px-2 py-3 rounded-lg transition-colors",
                        pinned
                            ? "bg-primary/[0.07] border border-primary/[0.15]"
                            : isCurrent
                                ? "bg-primary/[0.06]"
                                : "hover:bg-foreground/[0.025]"
                    )}
                >
                    <RankBadge rank={item.rank || globalIndex + 1} />
                    <div className="flex items-center gap-2.5 min-w-0">
                        {item.avatarUrl ? (
                            <img src={item.avatarUrl} className="w-[26px] h-[26px] rounded-full object-cover flex-shrink-0" alt={item.displayName} />
                        ) : (
                            <div className="w-[26px] h-[26px] rounded-full bg-foreground/[0.06] flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className={cn("text-[13px] font-semibold truncate leading-tight", isCurrent ? "text-primary" : "text-foreground/85")}>
                                {item.displayName || item.username}
                            </p>
                            <p className="text-[10px] text-foreground/40 truncate leading-tight">@{item.username}</p>
                        </div>
                        {isCurrent && (
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0 ml-1">
                                you
                            </span>
                        )}
                    </div>
                    <span className="text-[12px] font-black text-primary text-right tabular-nums">{(item.xp || 0).toLocaleString()}</span>
                    <span className="text-[12px] text-foreground/40 text-right tabular-nums">{(item.votesCast || 0).toLocaleString()}</span>
                    <span className="text-[12px] font-bold text-foreground/40 text-right">Lv.{item.level || 1}</span>
                </Link>
            );
        };

        return (
            <div>
                <div className="grid grid-cols-[24px_1fr_72px_72px_56px] sm:grid-cols-[24px_1fr_88px_88px_72px] gap-2 sm:gap-4 px-2 pb-2.5 border-b border-border">
                    <ColHead>#</ColHead>
                    <ColHead>User</ColHead>
                    <ColHead className="text-right">XP</ColHead>
                    <ColHead className="text-right">Votes</ColHead>
                    <ColHead className="text-right">Level</ColHead>
                </div>

                {showPinnedSelf && (
                    <>
                        <div className="py-1.5">
                            <UserRow item={currentUserEntry} globalIndex={filtered.indexOf(currentUserEntry)} pinned />
                        </div>
                        <div className="flex items-center gap-3 py-1 px-2">
                            <div className="flex-1 border-t border-border" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/20">rankings</span>
                            <div className="flex-1 border-t border-border" />
                        </div>
                    </>
                )}

                <div className="divide-y divide-border">
                    {pageItems.map((item: any, i: number) => (
                        <UserRow key={item.id || i} item={item} globalIndex={(page - 1) * PAGE_SIZE + i} />
                    ))}
                </div>

                <Pagination page={page} totalPages={totalPages} loading={loading} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
            </div>
        );
    }

    /* ── BRANDS ── */
    if (activeTab === "brands") {
        return (
            <div>
                <div className="grid grid-cols-[24px_1fr_80px_88px] gap-3 sm:gap-5 px-2 pb-2.5 border-b border-border">
                    <ColHead>#</ColHead>
                    <ColHead>Brand</ColHead>
                    <ColHead className="text-right">Events</ColHead>
                    <ColHead className="text-right">Participants</ColHead>
                </div>
                <div className="divide-y divide-border">
                    {pageItems.map((item: any, i: number) => {
                        const logoSrc = item.avatar
                            ? item.avatar.startsWith("http") ? item.avatar : `${PINATA_GW}/${item.avatar}`
                            : null;
                        const globalIndex = (page - 1) * PAGE_SIZE + i;
                        return (
                            <Link
                                key={item.id || i}
                                href={`/brand/${(item.name || item.id || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                                className="grid grid-cols-[24px_1fr_80px_88px] gap-3 sm:gap-5 items-center px-2 py-3 rounded-lg hover:bg-foreground/[0.025] transition-colors"
                            >
                                <RankBadge rank={item.rank || globalIndex + 1} />
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {logoSrc ? (
                                        <img src={logoSrc} className="w-[26px] h-[26px] rounded-md object-cover flex-shrink-0" alt={item.name} />
                                    ) : (
                                        <div className="w-[26px] h-[26px] rounded-md bg-foreground/[0.06] flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-foreground/85 truncate leading-tight">{item.name}</p>
                                        {item.categories?.length > 0 ? (
                                            <p className="text-[10px] text-foreground/40 truncate leading-tight">{item.categories.slice(0, 2).join(" · ")}</p>
                                        ) : item.bio ? (
                                            <p className="text-[10px] text-foreground/40 truncate leading-tight">{item.bio}</p>
                                        ) : null}
                                    </div>
                                </div>
                                <span className="text-[12px] font-black text-foreground/55 text-right tabular-nums">{(item.artMinted || 0).toLocaleString()}</span>
                                <span className="text-[12px] text-foreground/40 text-right tabular-nums">{(item.participants || 0).toLocaleString()}</span>
                            </Link>
                        );
                    })}
                </div>
                <Pagination page={page} totalPages={totalPages} loading={loading} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
            </div>
        );
    }

    /* ── EVENTS ── */
    const statusCfg = (s: string) => {
        if (s === "posting") return { dot: "bg-blue-400", label: "Posting" };
        if (s === "voting") return { dot: "bg-emerald-400", label: "Voting" };
        if (s === "completed") return { dot: "bg-foreground/20", label: "Done" };
        if (s === "scheduled") return { dot: "bg-yellow-400", label: "Scheduled" };
        return { dot: "bg-foreground/15", label: s || "—" };
    };

    return (
        <div>
            <div className="grid grid-cols-[24px_1fr_80px_100px] sm:grid-cols-[24px_1fr_80px_80px_100px] gap-3 sm:gap-5 px-2 pb-2.5 border-b border-border">
                <ColHead>#</ColHead>
                <ColHead>Event</ColHead>
                <ColHead className="text-right">Prize</ColHead>
                <ColHead className="text-right hidden sm:block">Participants</ColHead>
                <ColHead className="text-right">Status</ColHead>
            </div>
            <div className="divide-y divide-border">
                {pageItems.map((item: any, i: number) => {
                    const sc = statusCfg(item.status);
                    const thumb = item.imageUrl || (item.imageCid ? `${PINATA_GW}/${item.imageCid}` : null) || item.coverImage || item.avatar || null;
                    const globalIndex = (page - 1) * PAGE_SIZE + i;
                    return (
                        <Link
                            key={item.id || i}
                            href={`/events/${item.id}`}
                            className="grid grid-cols-[24px_1fr_80px_100px] sm:grid-cols-[24px_1fr_80px_80px_100px] gap-3 sm:gap-5 items-center px-2 py-3 rounded-lg hover:bg-foreground/[0.025] transition-colors"
                        >
                            <RankBadge rank={item.rank || globalIndex + 1} />
                            <div className="flex items-center gap-2.5 min-w-0">
                                {thumb ? (
                                    <img src={thumb} className="w-[26px] h-[26px] rounded object-cover flex-shrink-0" alt={item.title} />
                                ) : (
                                    <div className="w-[26px] h-[26px] rounded bg-foreground/[0.06] flex-shrink-0 flex items-center justify-center">
                                        <Calendar className="w-3 h-3 text-foreground/20" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-foreground/85 truncate leading-tight">{item.title}</p>
                                    {item.brand?.name && (
                                        <p className="text-[10px] text-foreground/40 truncate leading-tight">{item.brand.name}</p>
                                    )}
                                </div>
                            </div>
                            <span className="text-[12px] font-black text-lime-500 text-right tabular-nums">
                                {item.prizePool || item.leaderboardPool
                                    ? `$${(item.prizePool || item.leaderboardPool).toLocaleString()}`
                                    : "—"}
                            </span>
                            <span className="text-[12px] text-foreground/40 text-right tabular-nums hidden sm:block">
                                {(item.participants || item._count?.submissions || 0).toLocaleString()}
                            </span>
                            <div className="flex items-center justify-end gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">{sc.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
            <Pagination page={page} totalPages={totalPages} loading={loading} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
        </div>
    );
}
