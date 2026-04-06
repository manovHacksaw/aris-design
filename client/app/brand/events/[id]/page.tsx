"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Trophy, Users, ImageIcon, AlertCircle, Crown, Medal,
    ChevronRight, Twitter, Instagram, Globe, LayoutGrid, List,
    Tag, UserCircle2, BarChart2, Target, Shuffle, Scale, Vote, PieChart as PieChartIcon,
    MousePointerClick, Timer, Activity
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    LineChart, Line, TooltipProps, PieChart, Pie, Cell
} from "recharts";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/eventUtils";
import { getEventById, Event, getEventParticipants } from "@/services/event.service";
import {
    getEventSubmissions,
    Submission,
} from "@/services/submission.service";
import { useSocket } from "@/context/SocketContext";
import Countdown from "@/components/events/Countdown";
import VoteSubmissionCard from "@/components/events/VoteSubmissionCard";
import { VoteSubmission } from "@/types/events";
import { use } from "react";
import { apiRequest } from "@/services/api";

const CHART_COLORS = {
    lime: "#B6FF60",
    lavender: "#9D9DFF",
    orange: "#FF7A1A",
    yellow: "#FFC700",
    pink: "#FF60B6",
    blue: "#60B6FF",
    gray: "#6B7280",
};
const TICK_STYLE = { fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700 };
const GRID_STYLE = { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "0" };

function ChartTooltip({ active, payload, label }: TooltipProps<any, any> & { payload?: any[]; label?: any }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs backdrop-blur-xl">
            <p className="font-black text-white/60 uppercase tracking-wider mb-2 text-[10px]">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.payload.fill }} />
                    <span className="font-bold text-white/50 capitalize">{p.name}</span>
                    <span className="font-black text-white ml-2">{p.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function imgUrl(imageUrl?: string | null, cid?: string | null): string | undefined {
    if (imageUrl) return imageUrl;
    if (cid) return `${PINATA_GW}/${cid}`;
    return undefined;
}

function ParticipantAvatars({ event, totalCount }: { event: Event; totalCount: number }) {
    const avatars = (event as any).participantAvatars ?? [];
    const brandLogo = event.brand?.logoUrl || (event.brand?.logoCid ? `${PINATA_GW}/${event.brand.logoCid}` : null);
    const MAX = 5;
    const shown = avatars.slice(0, MAX);
    const overflow = totalCount > shown.length ? totalCount - shown.length : 0;

    if (totalCount === 0) return null;

    return (
        <div className="flex -space-x-2">
            {brandLogo && (
                <div className="relative w-6 h-6 rounded-full border-2 border-background ring-1 ring-white/10 overflow-hidden shrink-0 z-10">
                    <img src={brandLogo} alt="brand" className="w-full h-full object-cover" />
                </div>
            )}
            {shown.map((p: any, i: number) => (
                <div
                    key={p.id}
                    className="relative w-6 h-6 rounded-full border-2 border-background ring-1 ring-white/10 overflow-hidden shrink-0"
                    style={{ zIndex: MAX - i }}
                >
                    {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="participant" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center text-[8px] font-black text-white/50">?</div>
                    )}
                </div>
            ))}
            {overflow > 0 && (
                <div className="w-6 h-6 rounded-full border-2 border-background bg-white/10 flex items-center justify-center text-[8px] font-black text-white/60 shrink-0" style={{ zIndex: 0 }}>
                    +{overflow}
                </div>
            )}
        </div>
    );
}

function avatarUrl(_: unknown, name?: string | null): string {
    const n = encodeURIComponent(name || "User");
    return `https://ui-avatars.com/api/?name=${n}&background=2F6AFF&color=fff`;
}

function toVoteSubmission(sub: Submission): VoteSubmission {
    const displayName = sub.user?.displayName || sub.user?.username || "Creator";
    return {
        id: sub.id,
        creator: {
            name: displayName,
            avatar: sub.user?.avatarUrl || avatarUrl(undefined, displayName),
            handle: sub.user?.username || "user",
        },
        media: sub.imageUrl || (sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : ""),
        mediaType: (!sub.imageUrl && !sub.imageCid) ? "text" : "image",
        textContent: sub.content,
        voteCount: sub._count?.votes ?? 0,
        rank: sub.rank,
        isOwn: false,
    };
}

// ─── Social link helpers ──────────────────────────────────────────────────────

const SOCIAL_SLOTS = [
    { key: "twitter", label: "Twitter", icon: <Twitter className="w-3.5 h-3.5" /> },
    { key: "instagram", label: "Instagram", icon: <Instagram className="w-3.5 h-3.5" /> },
    { key: "website", label: "Website", icon: <Globe className="w-3.5 h-3.5" /> },
];

function SocialLinks({ links }: { links?: Record<string, string> }) {
    return (
        <div className="pt-3 border-t border-white/[0.06] mt-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30 mb-2.5">Brand Links</p>
            <div className="flex gap-2">
                {SOCIAL_SLOTS.map(({ key, label, icon }) => {
                    const url = links?.[key];
                    return url ? (
                        <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={label}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-foreground/60 hover:text-foreground hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                        >
                            {icon}
                            <span className="text-[9px] font-black uppercase tracking-wider hidden sm:block">{label}</span>
                        </a>
                    ) : (
                        <div
                            key={key}
                            title={`${label} not linked`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-foreground/20 cursor-not-allowed"
                        >
                            {icon}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Participants Panel ────────────────────────────────────────────────────────

type Participant = { id: string; displayName?: string | null; username?: string | null; avatarUrl?: string | null; profilePicCid?: string | null };

function ParticipantsPanel({ participants, totalCount }: { participants: Participant[]; totalCount: number }) {
    const shown = participants.slice(0, 8);

    if (participants.length === 0) {
        return (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-foreground/40" />
                    <span className="text-sm font-black text-foreground">Participants</span>
                    <span className="ml-auto text-[9px] bg-foreground/5 text-foreground/40 font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-border/40">{totalCount}</span>
                </div>
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                    <UserCircle2 className="w-8 h-8 text-foreground/10" />
                    <p className="text-xs font-bold text-foreground/30">No participants yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-sm font-black text-foreground">Participants</span>
                <span className="ml-auto text-[9px] bg-[#A78BFA]/10 text-[#A78BFA] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#A78BFA]/20">
                    {formatCount(totalCount)}
                </span>
            </div>

            <div className="space-y-2.5">
                {shown.map((p, idx) => {
                    const name = p.displayName || p.username || "User";
                    const handle = p.username || "user";
                    const avatar = p.avatarUrl || avatarUrl(undefined, name);
                    return (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.2 }}
                            className="flex items-center gap-3 p-2.5 rounded-[14px] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all"
                        >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black bg-foreground/5 text-foreground/30">
                                {idx + 1}
                            </div>
                            <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover border border-border/30 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-foreground truncate">{name}</p>
                                <p className="text-[10px] text-foreground/40 font-medium truncate">@{handle}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {totalCount > 8 && (
                <p className="text-[10px] font-black text-foreground/30 text-center mt-3 uppercase tracking-widest">
                    +{totalCount - 8} more
                </p>
            )}
        </div>
    );
}

// ─── Right Sidebar ─────────────────────────────────────────────────────────────

function EventSidebar({
    event,
    participants,
    totalParticipants,
}: {
    event: Event;
    participants: Participant[];
    totalParticipants: number;
}) {
    const targetDate = event.status === "posting" ? event.postingEnd! : event.endTime;
    const socialLinks = (event.brand as any)?.socialLinks as Record<string, string> | undefined;
    const topReward = event.topReward ?? event.leaderboardPool ?? 0;
    const leaderboardPool = event.leaderboardPool ?? 0;

    return (
        <div className="space-y-4">
            {/* ── Event info card ── */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                {/* Brand */}
                <div className="flex items-center gap-3 mb-4">
                    {event.brand?.logoCid ? (
                        <img
                            src={`${PINATA_GW}/${event.brand.logoCid}`}
                            className="w-10 h-10 rounded-xl object-cover border border-border/40"
                        />
                    ) : event.brand?.logoUrl ? (
                        <img
                            src={event.brand.logoUrl}
                            className="w-10 h-10 rounded-xl object-cover border border-border/40"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center">
                            <span className="text-xs font-black text-[#A78BFA]">{event.brand?.name?.[0] ?? "B"}</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground truncate">{event.brand?.name}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">Your Campaign</p>
                    </div>
                    {event.category && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20 shrink-0">
                            <Tag className="w-2.5 h-2.5 text-[#A78BFA]/70" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]/80">
                                {event.category}
                            </span>
                        </div>
                    )}
                </div>

                {/* Time remaining */}
                {event.status !== "completed" && targetDate && (
                    <div className={cn(
                        "flex items-center justify-between py-3 px-3 rounded-[12px] border mt-1",
                        event.status === "posting"
                            ? "bg-orange-500/8 border-orange-500/20"
                            : "bg-lime-400/5 border-lime-400/20"
                    )}>
                        <div className="flex items-center gap-1.5">
                            <Clock className={cn("w-3 h-3", event.status === "posting" ? "text-orange-400" : "text-lime-400")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest",
                                event.status === "posting" ? "text-orange-400/80" : "text-lime-400/80"
                            )}>
                                {event.status === "posting" ? "Posting Ends In" : "Voting Ends In"}
                            </span>
                        </div>
                        <Countdown targetDate={targetDate} label="" />
                    </div>
                )}

                {/* Participants */}
                <div className="py-3 border-t border-border/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Participating</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-foreground">
                                {formatCount(event.eventType === 'vote_only' ? (event._count?.votes ?? 0) : (event._count?.submissions ?? 0))}
                            </span>
                            {event.capacity && (
                                <span className="text-[10px] text-foreground/35 font-medium">
                                    / {formatCount(event.capacity)}
                                </span>
                            )}
                        </div>
                    </div>
                    <ParticipantAvatars event={event} totalCount={totalParticipants} />
                    {event.capacity && (
                        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(((event.eventType === 'vote_only' ? (event._count?.votes ?? 0) : (event._count?.submissions ?? 0)) / event.capacity) * 100, 100)}%` }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full rounded-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]"
                            />
                        </div>
                    )}
                </div>


                <SocialLinks links={socialLinks} />
            </div>

            {/* ── Rewards card ── */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#A78BFA]" />
                        <span className="text-sm font-black text-foreground">Rewards Pool</span>
                    </div>
                    <span className="text-[9px] bg-[#A78BFA]/10 text-[#A78BFA] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#A78BFA]/20">
                        Guaranteed
                    </span>
                </div>

                {topReward > 0 && (
                    <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[14px] p-4 mb-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Grand-Prize Winner</p>
                        <p className="text-2xl font-black text-foreground">${topReward.toLocaleString()}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">USDC</p>
                    </div>
                )}

                {leaderboardPool > 0 && (
                    <div className="mb-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Leaderboard Pool</p>
                        <p className="text-xl font-black text-foreground">${leaderboardPool.toLocaleString()}</p>
                        <p className="text-[10px] text-foreground/40 font-medium">USDC</p>
                    </div>
                )}

                {event.baseReward != null && event.baseReward > 0 && (
                    <div className="mb-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Per Submission</p>
                        <p className="text-lg font-black text-foreground">${event.baseReward.toLocaleString()}</p>
                    </div>
                )}

                {event.submissionGuidelines && (
                    <div className="pt-4 border-t border-border/40">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-3">Submission Guidelines</p>
                        <ol className="space-y-2.5">
                            {event.submissionGuidelines.split("\n").filter(Boolean).map((rule, i) => (
                                <li key={i} className="flex gap-2.5 text-xs text-foreground/60">
                                    <span className="w-4 h-4 rounded-full bg-orange-500/10 text-orange-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                        {i + 1}
                                    </span>
                                    {rule}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>

            {/* ── Participants panel ── */}
            <ParticipantsPanel participants={participants} totalCount={totalParticipants} />
        </div>
    );
}

// ─── Participant Card ──────────────────────────────────────────────────────────

function ParticipantCard({ sub, rank, showVotes, showThumb, isList = false }: {
    sub: Submission;
    rank?: number;
    showVotes: boolean;
    showThumb: boolean;
    isList?: boolean;
}) {
    const name = sub.user?.displayName || sub.user?.username || "Creator";
    const handle = sub.user?.username || "user";
    const avatar = sub.user?.avatarUrl || avatarUrl(undefined, name);
    const thumb = sub.imageUrl || (sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : null);
    const votes = sub._count?.votes ?? 0;
    const isWinner = rank === 1;
    const isPodium = rank && rank <= 3;
    const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-500"];
    const medalBgs = ["bg-yellow-500/15 border-yellow-500/25", "bg-slate-500/15 border-slate-500/25", "bg-amber-700/15 border-amber-700/25"];

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative rounded-[20px] border overflow-hidden transition-all hover:shadow-lg",
                isList ? "flex items-center gap-4 py-2 px-3" : "flex flex-col",
                isWinner
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05]"
            )}
        >
            {/* Rank badge — only on completed */}
            {isPodium && rank && showThumb && (
                <div className={cn(
                    "z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0",
                    isList ? "" : "absolute top-3 left-3",
                    medalBgs[rank - 1]
                )}>
                    {rank === 1 ? <Crown className={cn("w-2.5 h-2.5", medalColors[0])} /> : <Medal className={cn("w-2.5 h-2.5", medalColors[rank - 1])} />}
                    <span className={medalColors[rank - 1]}>{rank === 1 ? "Winner" : `#${rank}`}</span>
                </div>
            )}

            {/* Submission thumbnail — only shown when completed */}
            {showThumb && (
                <div className={cn(
                    "bg-white/4 overflow-hidden shrink-0",
                    isList ? "w-16 h-12 rounded-lg" : "aspect-4/3 w-full"
                )}>
                    {thumb ? (
                        <img src={thumb} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-foreground/10" />
                        </div>
                    )}
                </div>
            )}

            {/* Profile info */}
            <div className="p-3 flex items-center gap-2.5">
                <img
                    src={avatar}
                    alt={name}
                    className="w-9 h-9 rounded-full object-cover border border-border/30 shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-foreground/40 font-medium truncate">@{handle}</p>
                </div>
                {showVotes && (
                    <div className="text-right shrink-0">
                        <p className="text-sm font-black text-foreground">{votes}</p>
                        <p className="text-[9px] text-foreground/30 uppercase tracking-widest font-bold">votes</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Participants Grid ────────────────────────────────────────────────────────

function ParticipantsGrid({ submissions, event, gridView }: {
    submissions: Submission[];
    event: Event;
    gridView: boolean;
}) {
    const showVotes = event.status === "completed";
    const showThumb = event.status === "completed";
    const sorted = [...submissions].sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        if (a.rank) return -1;
        if (b.rank) return 1;
        return (b._count?.votes || 0) - (a._count?.votes || 0);
    });

    if (submissions.length === 0) {
        return (
            <div className="text-center py-20">
                <UserCircle2 className="w-10 h-10 text-foreground/10 mx-auto mb-3" />
                <p className="text-sm text-foreground/30 font-bold">No participants yet</p>
                <p className="text-xs text-foreground/20 font-medium mt-1">Participants will appear here once the event goes live</p>
            </div>
        );
    }

    // For completed, show podium winners separately
    const winners = sorted.filter((s) => s.rank && s.rank <= 3);
    const others = sorted.filter((s) => !s.rank || s.rank > 3);

    return (
        <div className="space-y-8">
            {event.status === "completed" && winners.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <h2 className="text-sm font-black text-foreground tracking-tighter uppercase">Winners</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {winners.map((sub) => (
                            <ParticipantCard key={sub.id} sub={sub} rank={sub.rank ?? undefined} showVotes={showVotes} showThumb={showThumb} />
                        ))}
                    </div>
                </div>
            )}

            {others.length > 0 && (
                <div>
                    {event.status === "completed" && winners.length > 0 && (
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4">
                            All Participants ({others.length})
                        </p>
                    )}
                    <div className={gridView ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "flex flex-col gap-2.5 max-w-2xl"}>
                        {(event.status === "completed" ? others : sorted).map((sub, idx) => (
                            <motion.div
                                key={sub.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <ParticipantCard sub={sub} showVotes={showVotes} showThumb={showThumb} isList={!gridView} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BrandEventDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
    const resolvedParams = use(params as any);
    const id = (resolvedParams as { id: string }).id;
    const { socket } = useSocket();

    const [event, setEvent] = useState<Event | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [gridView, setGridView] = useState(true);
    const [activeTab, setActiveTab] = useState<"participants" | "results">("participants");
    const [eventSummary, setEventSummary] = useState<any>(null);
    const [extraAnalytics, setExtraAnalytics] = useState<any>(null);

    useEffect(() => {
        if (!socket || !id) return;
        socket.emit("join-event", id);
        const handleVoteUpdate = ({ submissionId, delta }: { submissionId: string; delta: number }) => {
            setSubmissions((subs) => subs.map((s) => s.id === submissionId ? { ...s, _count: { votes: (s._count?.votes ?? 0) + delta } } : s));
        };
        const handleParticipantUpdate = () => {
            getEventParticipants(id).then(setParticipants).catch(() => { });
        };
        socket.on("vote-update", handleVoteUpdate);
        socket.on("participant-update", handleParticipantUpdate);
        return () => {
            socket.emit("leave-event", id);
            socket.off("vote-update", handleVoteUpdate);
            socket.off("participant-update", handleParticipantUpdate);
        };
    }, [socket, id]);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const ev = await getEventById(id, true);
                setEvent(ev);
                // Fetch real participants (voters) for the sidebar
                // Always fetch for vote_only; for post_and_vote fetch once active
                if (ev.eventType === "vote_only" || ev.status === "posting" || ev.status === "voting" || ev.status === "completed") {
                    try {
                        const p = await getEventParticipants(id);
                        setParticipants(p);
                    } catch (e) { console.warn("Failed to fetch participants", e); }
                }

                if (ev.status === "completed") {
                    try {
                        const { getDetailedEventAnalytics } = await import("@/services/event.service");
                        const detailed = await getDetailedEventAnalytics(id);
                        setEventSummary(detailed);

                        const [engRes, clickRes] = await Promise.all([
                            apiRequest<any>(`/analytics/events/${id}/engagement`).catch(() => ({ averageViewTime: 0 })),
                            apiRequest<any>(`/analytics/events/${id}/clicks-breakdown`).catch(() => ({ vote: 0, event: 0, website: 0, social: 0, other: 0 }))
                        ]);
                        setExtraAnalytics({ engagement: engRes, clicks: clickRes });
                    } catch (err) {
                        console.error(err);
                    }
                }

                if (ev.eventType === "post_and_vote" && (ev.status === "posting" || ev.status === "voting" || ev.status === "completed")) {
                    const res = await getEventSubmissions(id, { sortBy: "recent", limit: 100 });
                    setSubmissions(res.submissions);
                } else if (ev.eventType === "vote_only" && ev.proposals) {
                    const proposalsAsSubs = ev.proposals.map((p) => ({
                        id: p.id,
                        userId: ev.brandId,
                        eventId: ev.id,
                        imageCid: p.imageCid,
                        imageUrl: p.imageUrl,
                        content: p.title + (p.content ? `\n${p.content}` : ""),
                        user: { name: ev.brand?.name || "Brand", username: ev.brand?.name || "brand", profilePicCid: ev.brand?.logoCid },
                        _count: { votes: p.voteCount || 0 },
                        rank: p.finalRank,
                        createdAt: ev.createdAt,
                        updatedAt: ev.createdAt,
                    }));
                    setSubmissions(proposalsAsSubs as any[]);
                }
            } catch (err: any) {
                setFetchError(err?.message ?? "Failed to load event");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const coverUrl = imgUrl(event?.imageUrl, event?.imageCid) ?? "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop";

    const enrichedSubmissions = submissions;

    // For post_and_vote events, derive participants from submitters (not voters)
    // For vote_only events, use fetched voters; fall back to participantAvatars from event object
    const displayParticipants: Participant[] = event?.eventType === "post_and_vote"
        ? submissions
            .filter((s) => s.user)
            .map((s) => ({
                id: s.userId,
                displayName: s.user?.displayName,
                username: s.user?.username,
                avatarUrl: s.user?.avatarUrl,
                profilePicCid: undefined,
            }))
        : participants.length > 0
            ? participants
            : ((event as any)?.participantAvatars ?? []).map((p: any) => ({
                id: p.id,
                displayName: null,
                username: null,
                avatarUrl: p.avatarUrl,
                profilePicCid: null,
            }));

    const displayParticipantCount = event?.eventType === "post_and_vote"
        ? submissions.length
        : (event?.totalParticipants ?? participants.length);

    const displayMode: "post" | "vote" | "completed" | "upcoming" =
        event?.status === "completed" ? "completed"
            : event?.status === "posting" ? "post"
                : event?.status === "voting" || event?.eventType === "vote_only" ? "vote"
                    : "upcoming";


    return (
        <main className="w-full pb-24 pt-2 font-sans">
            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-1.5 mb-4 px-0">
                <Link href="/brand/events" className="text-xs text-foreground/40 hover:text-foreground transition-colors">Campaigns</Link>
                <ChevronRight className="w-3 h-3 text-foreground/20" />
                <span className="text-xs text-foreground/60 font-medium truncate max-w-[260px]">
                    {loading ? "Loading…" : event?.title ?? "Event"}
                </span>
            </div>

            {loading ? (
                <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
                    <div className="flex-1 min-w-0">
                        <div className="rounded-[24px] bg-white/[0.05] h-[220px] md:h-[260px] mb-5" />
                        <div className="flex items-center gap-6 border-b border-border/40 pb-3 mb-5">
                            <div className="h-3 w-20 bg-white/[0.06] rounded-full" />
                            <div className="h-3 w-14 bg-white/[0.04] rounded-full" />
                            <div className="h-3 w-10 bg-white/[0.04] rounded-full" />
                            <div className="ml-auto h-3 w-28 bg-white/[0.04] rounded-full" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="rounded-[20px] bg-white/[0.05] aspect-[3/4]" />
                            ))}
                        </div>
                    </div>
                    <div className="lg:w-[300px] shrink-0 space-y-4">
                        <div className="rounded-[20px] bg-white/[0.05] h-[180px]" />
                        <div className="rounded-[20px] bg-white/[0.05] h-[320px]" />
                    </div>
                </div>
            ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-sm font-bold text-foreground/60">{fetchError}</p>
                    <Link href="/brand/events" className="text-xs font-black text-primary hover:underline">Back to campaigns</Link>
                </div>
            ) : event ? (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* ── Left column ── */}
                    <div className="flex-1 min-w-0">
                        {/* Banner card */}
                        <div className="relative rounded-[24px] overflow-hidden h-[220px] md:h-[260px] mb-5">
                            <img src={coverUrl} className="w-full h-full object-cover" alt="Event" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
                            <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                {/* Top badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {event.status !== "completed" && (
                                        <div className="bg-black/30 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-white/60" />
                                            <span className="text-[10px] font-black text-white">
                                                {event.status === "posting" ? "Posting" : "Voting"} phase
                                            </span>
                                        </div>
                                    )}
                                    {event.status === "completed" && (
                                        <div className="bg-black/40 backdrop-blur-md border border-yellow-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                            <Trophy className="w-3 h-3 text-yellow-400" />
                                            <span className="text-[10px] font-black text-yellow-300">Completed</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom: title, description */}
                                <div>
                                    <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-white uppercase leading-[0.92] tracking-tight mb-1">
                                        {event.title}
                                    </h1>
                                    {event.description && (
                                        <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2 max-w-[420px]">
                                            {event.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tab bar */}
                        {displayMode !== "upcoming" && (
                            <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-0">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => setActiveTab("participants")}
                                        className={cn("flex items-center gap-2 pb-3 border-b-2 transition-colors", activeTab === "participants" ? "border-primary text-foreground" : "border-transparent text-foreground/40 hover:text-foreground/70")}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="text-xs font-black uppercase tracking-[0.15em]">Participants</span>
                                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", activeTab === "participants" ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.05] text-foreground/30 border-border/40")}>
                                            {displayParticipantCount}
                                        </span>
                                    </button>

                                    {displayMode === "completed" && eventSummary && (
                                        <button
                                            onClick={() => setActiveTab("results")}
                                            className={cn("flex items-center gap-2 pb-3 border-b-2 transition-colors", activeTab === "results" ? "border-primary text-foreground" : "border-transparent text-foreground/40 hover:text-foreground/70")}
                                        >
                                            <BarChart2 className="w-3.5 h-3.5" />
                                            <span className="text-xs font-black uppercase tracking-[0.15em]">Analytics & Results</span>
                                        </button>
                                    )}
                                </div>
                                {activeTab === "participants" && (
                                    <div className="flex border border-border/40 rounded-lg overflow-hidden mb-3">
                                        <button onClick={() => setGridView(true)} className={cn("p-1.5 transition-colors", gridView ? "bg-white/10 text-foreground" : "text-foreground/30 hover:text-foreground/60")}>
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setGridView(false)} className={cn("p-1.5 transition-colors", !gridView ? "bg-white/10 text-foreground" : "text-foreground/30 hover:text-foreground/60")}>
                                            <List className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "results" && eventSummary && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Top KPI Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="relative overflow-hidden bg-white/[0.03] border border-[#B6FF60]/20 rounded-2xl p-4 text-center group">
                                        <div className="absolute inset-0 bg-[#B6FF60]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Target className="w-4 h-4 text-[#B6FF60] mx-auto mb-2" />
                                        <p className="text-2xl font-black text-[#B6FF60] mb-0.5 leading-none">{eventSummary.winningMargin.toFixed(1)}%</p>
                                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.15em] mt-1">Winning Margin</p>
                                    </div>
                                    <div className="relative overflow-hidden bg-white/[0.03] border border-[#60B6FF]/20 rounded-2xl p-4 text-center group">
                                        <div className="absolute inset-0 bg-[#60B6FF]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Vote className="w-4 h-4 text-[#60B6FF] mx-auto mb-2" />
                                        <p className="text-2xl font-black text-[#60B6FF] mb-0.5 leading-none">{eventSummary.voteCompletionPct.toFixed(1)}%</p>
                                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.15em] mt-1">Voter Capacity</p>
                                    </div>
                                    <div className="relative overflow-hidden bg-white/[0.03] border border-[#FFC700]/20 rounded-2xl p-4 text-center group">
                                        <div className="absolute inset-0 bg-[#FFC700]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Shuffle className="w-4 h-4 text-[#FFC700] mx-auto mb-2" />
                                        <p className="text-2xl font-black text-[#FFC700] mb-0.5 leading-none">{eventSummary.entropy.toFixed(2)}</p>
                                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.15em] mt-1">Entropy</p>
                                    </div>
                                    <div className="relative overflow-hidden bg-white/[0.03] border border-[#9D9DFF]/20 rounded-2xl p-4 text-center group">
                                        <div className="absolute inset-0 bg-[#9D9DFF]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Activity className="w-4 h-4 text-[#9D9DFF] mx-auto mb-2" />
                                        <p className="text-2xl font-black text-[#9D9DFF] mb-0.5 leading-none">{(((1 - eventSummary.normalizedEntropy) * 0.6 + eventSummary.avgParticipantTrustScore * 0.4) * 100).toFixed(0)}%</p>
                                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.15em] mt-1">Decision Confidence</p>
                                    </div>
                                </div>

                                {/* Outcome Summary + Stat Pills */}
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MousePointerClick className="w-4 h-4 text-[#B6FF60]" />
                                        <h3 className="font-display uppercase tracking-widest text-foreground text-sm">Outcome Insights</h3>
                                    </div>
                                    <p className="text-sm font-medium text-foreground/60 leading-relaxed mb-5">
                                        {`Entropy of ${eventSummary.entropy.toFixed(2)} (normalized ${eventSummary.normalizedEntropy.toFixed(2)}) indicates ${eventSummary.normalizedEntropy < 0.5 ? "a clear winner with focused audience preference" : "a spread vote suggesting mixed audience preference"}. Historical alignment stands at ${(eventSummary.historicalAlignment * 100).toFixed(1)}%, with a winning margin of ${eventSummary.winningMargin.toFixed(1)}%.`}
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-white/[0.03] border border-white/[0.05] px-4 py-3 rounded-xl">
                                            <span className="text-foreground/40 block text-[10px] font-black uppercase tracking-[0.18em] mb-1">Posts</span>
                                            <strong className="text-xl font-black text-foreground">{eventSummary.totalSubmissions}</strong>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/[0.05] px-4 py-3 rounded-xl">
                                            <span className="text-foreground/40 block text-[10px] font-black uppercase tracking-[0.18em] mb-1">Votes</span>
                                            <strong className="text-xl font-black text-foreground">{eventSummary.totalVotes}</strong>
                                        </div>
                                        <div className="bg-[#B6FF60]/[0.06] border border-[#B6FF60]/20 px-4 py-3 rounded-xl">
                                            <span className="text-[#B6FF60] block text-[10px] font-black uppercase tracking-[0.18em] mb-1">Cost</span>
                                            <strong className="text-xl font-black text-[#B6FF60]">
                                                ${(eventSummary.cost || (event.topReward || 0) + (event.leaderboardPool || event.baseReward || 0)).toFixed(2)}
                                            </strong>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/[0.05] px-4 py-3 rounded-xl">
                                            <span className="text-foreground/40 block text-[10px] font-black uppercase tracking-[0.18em] mb-1">Views</span>
                                            <strong className="text-xl font-black text-foreground">{eventSummary.totalViews}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Graphs Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Vote Split Chart */}
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <PieChartIcon className="w-3.5 h-3.5 text-[#B6FF60]" />
                                            <h3 className="font-display uppercase tracking-widest text-foreground text-sm">Vote Split</h3>
                                        </div>
                                        {eventSummary.contentMetrics && eventSummary.contentMetrics.length > 0 ? (
                                            <div className="h-[200px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart layout="vertical" data={eventSummary.contentMetrics.slice(0, 5)} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="title" type="category" width={80} tick={TICK_STYLE} axisLine={false} tickLine={false}
                                                            tickFormatter={(val) => val.length > 10 ? val.substring(0, 8) + '...' : val} />
                                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(182,255,96,0.05)" }} />
                                                        <Bar dataKey="votePercentage" name="% of Votes" fill={CHART_COLORS.lime} radius={[0, 4, 4, 0]} maxBarSize={18} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-[200px] flex items-center justify-center text-xs text-foreground/20 font-black uppercase tracking-wider">No content data</div>
                                        )}
                                    </div>

                                    {/* Demographics Double Bar Chart */}
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5 text-[#9D9DFF]" />
                                                <h3 className="font-display uppercase tracking-widest text-foreground text-sm">Demographics</h3>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex gap-1.5 items-center"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHART_COLORS.blue }} /><span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider">Male</span></div>
                                                <div className="flex gap-1.5 items-center"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHART_COLORS.pink }} /><span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider">Female</span></div>
                                            </div>
                                        </div>
                                        {eventSummary.votesByAgeGroup ? (() => {
                                            const total = eventSummary.totalVotes || 1;
                                            const malePct = eventSummary.votesByGender?.male / total;
                                            const femalePct = eventSummary.votesByGender?.female / total;
                                            const ageKeys = ['24_under', '25_34', '35_44', '45_54', '55_64', '65_plus'];
                                            const labels: Record<string, string> = { '24_under': '<24', '25_34': '25-34', '35_44': '35-44', '45_54': '45-54', '55_64': '55-64', '65_plus': '65+' };
                                            const demoData = ageKeys.map(k => {
                                                const raw = eventSummary.votesByAgeGroup[k] || 0;
                                                return { age: labels[k], male: Math.round(raw * malePct), female: Math.round(raw * femalePct) };
                                            });
                                            return (
                                                <div className="h-[200px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={demoData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                            <CartesianGrid {...GRID_STYLE} vertical={false} />
                                                            <XAxis dataKey="age" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                                                            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                                                            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                                                            <Bar dataKey="male" name="Male" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} maxBarSize={14} />
                                                            <Bar dataKey="female" name="Female" fill={CHART_COLORS.pink} radius={[3, 3, 0, 0]} maxBarSize={14} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )
                                        })() : (
                                            <div className="h-[200px] flex items-center justify-center text-xs text-foreground/20 font-black uppercase tracking-wider">No demographic data</div>
                                        )}
                                    </div>

                                    {/* Views & Votes Timeline */}
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 md:col-span-2">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Timer className="w-3.5 h-3.5 text-[#FF7A1A]" />
                                                <h3 className="font-display uppercase tracking-widest text-foreground text-sm">Views & Votes Timeline</h3>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex gap-1.5 items-center"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHART_COLORS.orange }} /><span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider">Views</span></div>
                                                <div className="flex gap-1.5 items-center"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CHART_COLORS.lime }} /><span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider">Votes</span></div>
                                            </div>
                                        </div>
                                        {eventSummary.viewsOverTime && eventSummary.viewsOverTime.length > 0 ? (() => {
                                            const timeMap = new Map();
                                            eventSummary.viewsOverTime.forEach((v: any) => timeMap.set(v.timestamp, { time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), views: v.count, votes: 0 }));
                                            if (eventSummary.votesOverTime) {
                                                eventSummary.votesOverTime.forEach((v: any) => {
                                                    if (timeMap.has(v.timestamp)) { timeMap.get(v.timestamp).votes = v.count; }
                                                    else { timeMap.set(v.timestamp, { time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), views: 0, votes: v.count }); }
                                                });
                                            }
                                            const timeData = Array.from(timeMap.values());
                                            return (
                                                <div className="h-[200px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={timeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.orange} stopOpacity={0.25} /><stop offset="95%" stopColor={CHART_COLORS.orange} stopOpacity={0} /></linearGradient>
                                                                <linearGradient id="gradLime" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.lime} stopOpacity={0.25} /><stop offset="95%" stopColor={CHART_COLORS.lime} stopOpacity={0} /></linearGradient>
                                                            </defs>
                                                            <CartesianGrid {...GRID_STYLE} vertical={false} />
                                                            <XAxis dataKey="time" tick={{ ...TICK_STYLE, fontSize: 8 }} axisLine={false} tickLine={false} />
                                                            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                                                            <Tooltip content={<ChartTooltip />} />
                                                            <Area type="monotone" dataKey="views" name="Views" stroke={CHART_COLORS.orange} fill="url(#gradOrange)" strokeWidth={1.5} dot={false} />
                                                            <Area type="monotone" dataKey="votes" name="Votes" stroke={CHART_COLORS.lime} fill="url(#gradLime)" strokeWidth={1.5} dot={false} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )
                                        })() : (
                                            <div className="h-[200px] flex items-center justify-center text-xs text-foreground/20 font-black uppercase tracking-wider">No timeline data recorded</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "participants" && (
                            <>
                                {/* Participants grid */}
                                {displayMode === "upcoming" ? (
                                    <div className="py-16 flex flex-col items-center text-center gap-4">
                                        <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center">
                                            <Clock className="w-7 h-7 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="font-display text-[2rem] md:text-[3rem] text-foreground uppercase leading-[0.92] tracking-tight mb-1">Coming Soon</h2>
                                            <p className="text-sm text-foreground/50 font-medium">
                                                Goes live on <strong>{new Date(event.startTime).toLocaleString()}</strong>
                                            </p>
                                        </div>
                                    </div>
                                ) : event.eventType === "vote_only" && displayMode !== "completed" ? (
                                    /* ── Vote-only: show proposal cards (read-only for brand) ── */
                                    <AnimatePresence>
                                        {enrichedSubmissions.length === 0 ? (
                                            <div className="text-center py-20">
                                                <p className="text-sm text-foreground/30 font-bold">No voting options yet</p>
                                            </div>
                                        ) : (
                                            <div className={gridView ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                                                {enrichedSubmissions.map((sub, idx) => (
                                                    <motion.div key={sub.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: idx * 0.03 }}>
                                                        <VoteSubmissionCard
                                                            submission={toVoteSubmission(sub)}
                                                            isVoted={false}
                                                            isPending={false}
                                                            onVote={() => { }}
                                                            disabled={true}
                                                            optionIndex={idx}
                                                            showVoteCount={true}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </AnimatePresence>
                                ) : (
                                    <ParticipantsGrid submissions={enrichedSubmissions} event={event} gridView={gridView} />
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Right: Sticky sidebar ── */}
                    <div className="lg:w-[300px] shrink-0">
                        <div className="sticky top-6">
                            <EventSidebar
                                event={event}
                                participants={displayParticipants}
                                totalParticipants={displayParticipantCount}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
