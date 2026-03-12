"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    ChevronLeft, Users, Trophy, Clock, BarChart2, ImageIcon, Vote,
    Loader2, AlertTriangle, ExternalLink, Hash, Globe, Target,
    CheckCircle2, XCircle, StopCircle, Trash2, RefreshCw,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getEventById, cancelEvent, stopEvent, publishEvent, deleteEvent,
    getDetailedEventAnalytics,
} from "@/services/event.service";
import type { Event, EventStatus } from "@/services/event.service";
import { getEventSubmissions } from "@/services/submission.service";
import type { Submission } from "@/services/submission.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    posting: "bg-green-500/10 text-green-500 border-green-500/20",
    voting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
    posting: "Posting", voting: "Voting", scheduled: "Scheduled",
    draft: "Draft", completed: "Completed", cancelled: "Cancelled",
};

function resolveImg(imageUrl?: string | null, cid?: string | null): string | null {
    if (imageUrl) return imageUrl;
    if (cid) return `https://gateway.pinata.cloud/ipfs/${cid}`;
    return null;
}

function fmt(iso?: string, opts?: Intl.DateTimeFormatOptions) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", opts ?? {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
    });
}

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeLeft(endTime: string): string {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const d = Math.floor(h / 24);
    const rem = h % 24;
    if (d > 0) return `${d}d ${rem}h left`;
    return `${h}h left`;
}

function formatMoney(n?: number) {
    if (!n) return "$0";
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Timeline bar for post_and_vote ───────────────────────────────────────────

function PhaseTimeline({ event }: { event: Event }) {
    if (event.eventType !== "post_and_vote" || !event.postingStart || !event.postingEnd) return null;
    const start = new Date(event.postingStart).getTime();
    const postEnd = new Date(event.postingEnd).getTime();
    const end = new Date(event.endTime).getTime();
    const now = Date.now();
    const total = end - start;
    const postPct = Math.round(((postEnd - start) / total) * 100);
    const nowPct = Math.round(Math.max(0, Math.min(100, ((now - start) / total) * 100)));

    return (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phase Timeline</p>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-blue-500/40 rounded-full" style={{ width: `${postPct}%` }} />
                <div className="absolute inset-y-0 left-0 right-0 bg-transparent"
                    style={{ background: `linear-gradient(to right, transparent ${postPct}%, rgba(168,85,247,0.3) ${postPct}%)` }}
                />
                {nowPct > 0 && nowPct < 100 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: `${nowPct}%` }} />
                )}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500/60 mr-1.5" />
                    Posting: {fmt(event.postingStart, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} →{" "}
                    {fmt(event.postingEnd, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-500/60 mr-1.5" />
                    Voting → {fmt(event.endTime, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
            </div>
        </div>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div className="bg-card border border-border rounded-[20px] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{label}</span>
            </div>
            <div className="text-2xl font-black">{value}</div>
            {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
    );
}

// ── Submission card ───────────────────────────────────────────────────────────

function SubmissionCard({ sub }: { sub: Submission }) {
    const imgUrl = resolveImg(sub.imageUrl, sub.imageCid);
    const username = sub.user?.username || sub.user?.displayName || sub.userId.slice(0, 8);
    const votes = sub._count?.votes ?? 0;
    const rank = sub.rank;

    return (
        <div className="bg-card border border-border rounded-[20px] overflow-hidden group">
            <div className="relative h-44 bg-secondary/40">
                {imgUrl ? (
                    <img src={imgUrl} className="w-full h-full object-cover" alt="Submission" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                )}
                {rank && (
                    <div className="absolute top-2 left-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-black text-primary-foreground">
                        #{rank}
                    </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full backdrop-blur-sm">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    <span className="text-[11px] font-bold text-white">{votes}</span>
                </div>
            </div>
            <div className="p-3">
                <p className="font-bold text-sm text-foreground">@{username}</p>
                {sub.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub.content}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}

// ── Proposal row (vote_only) ──────────────────────────────────────────────────

function ProposalRow({ proposal, maxVotes }: {
    proposal: NonNullable<Event["proposals"]>[number];
    maxVotes: number;
}) {
    const pct = maxVotes > 0 ? Math.round((proposal.voteCount / maxVotes) * 100) : 0;
    const imgUrl = resolveImg(proposal.imageUrl, proposal.imageCid);

    return (
        <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl border border-border/50">
            {imgUrl && (
                <img src={imgUrl} className="w-12 h-12 rounded-lg object-cover shrink-0" alt={proposal.title} />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1.5">
                    <p className="font-bold text-sm text-foreground truncate">{proposal.title}</p>
                    <span className="text-xs font-mono text-muted-foreground shrink-0 ml-2">
                        {proposal.voteCount} votes · {pct}%
                    </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
            </div>
            {proposal.finalRank && (
                <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-black shrink-0">
                    #{proposal.finalRank}
                </div>
            )}
        </div>
    );
}

// ── Confirm action dialog ─────────────────────────────────────────────────────

function ConfirmDialog({
    open, title, message, confirmLabel, danger, onConfirm, onCancel, loading,
}: {
    open: boolean; title: string; message: string; confirmLabel: string;
    danger?: boolean; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-card border border-border rounded-[24px] p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-full shrink-0", danger ? "bg-red-500/10" : "bg-yellow-500/10")}>
                        <AlertTriangle className={cn("w-5 h-5", danger ? "text-red-400" : "text-yellow-400")} />
                    </div>
                    <div>
                        <h3 className="font-black text-base">{title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-secondary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                            danger
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-foreground text-background hover:opacity-90"
                        )}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "submissions" | "proposals" | "manage";

export default function BrandEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [event, setEvent] = useState<Event | null>(null);
    const [eventAnalyticsData, setEventAnalyticsData] = useState<any>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [subLoading, setSubLoading] = useState(false);
    const [tab, setTab] = useState<Tab>("overview");
    const [actionLoading, setActionLoading] = useState(false);
    const [confirm, setConfirm] = useState<null | "cancel" | "stop" | "delete">(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            getEventById(id),
            getDetailedEventAnalytics(id).catch(() => null)
        ])
            .then(([evt, analyticData]) => {
                setEvent(evt);
                setEventAnalyticsData(analyticData);
            })
            .catch(() => toast.error("Failed to load event"))
            .finally(() => setLoading(false));
    }, [id]);

    // Load submissions when tab becomes active
    useEffect(() => {
        if (!id || !event) return;
        if (tab === "submissions" && event.eventType === "post_and_vote") {
            setSubLoading(true);
            getEventSubmissions(id, { sortBy: "votes", limit: 50 })
                .then(r => setSubmissions(r.submissions))
                .catch(() => setSubmissions([]))
                .finally(() => setSubLoading(false));
        }
    }, [tab, id, event]);

    // ── Actions ────────────────────────────────────────────────────────────

    const doPublish = async () => {
        if (!event) return;
        setActionLoading(true);
        try {
            const updated = await publishEvent(event.id);
            setEvent(updated);
            toast.success("Campaign published!");
        } catch (e: any) {
            toast.error(e.message ?? "Failed to publish");
        } finally {
            setActionLoading(false);
        }
    };

    const doCancel = async () => {
        if (!event) return;
        setActionLoading(true);
        try {
            const updated = await cancelEvent(event.id);
            setEvent(updated);
            toast.success("Campaign cancelled.");
        } catch (e: any) {
            toast.error(e.message ?? "Failed to cancel");
        } finally {
            setActionLoading(false);
            setConfirm(null);
        }
    };

    const doStop = async () => {
        if (!event) return;
        setActionLoading(true);
        try {
            const updated = await stopEvent(event.id);
            setEvent(updated);
            toast.success("Voting stopped and event concluded.");
        } catch (e: any) {
            toast.error(e.message ?? "Failed to stop event");
        } finally {
            setActionLoading(false);
            setConfirm(null);
        }
    };

    const doDelete = async () => {
        if (!event) return;
        setActionLoading(true);
        try {
            await deleteEvent(event.id);
            toast.success("Campaign deleted.");
            router.push("/brand/events");
        } catch (e: any) {
            toast.error(e.message ?? "Failed to delete");
        } finally {
            setActionLoading(false);
            setConfirm(null);
        }
    };

    // ── Loading / error states ─────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-64 bg-secondary/60 rounded-xl" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-28 bg-secondary/60 rounded-[20px]" />)}
                </div>
                <div className="h-64 bg-secondary/60 rounded-[24px]" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-24">
                <p className="text-muted-foreground">Event not found.</p>
                <Link href="/brand/events" className="mt-4 inline-flex items-center gap-2 text-sm text-primary font-bold hover:underline">
                    <ChevronLeft className="w-4 h-4" /> Back to Campaigns
                </Link>
            </div>
        );
    }

    // ── Derived data ───────────────────────────────────────────────────────

    const isPost = event.eventType === "post_and_vote";
    const eventStats = event.eventAnalytics;
    const totalSubs = eventStats?.totalSubmissions ?? event._count?.submissions ?? 0;
    const totalVotes = eventStats?.totalVotes ?? event._count?.votes ?? 0;
    const totalViews = eventStats?.totalViews ?? 0;
    const participants = eventStats?.uniqueParticipants ?? 0;
    const totalPool = (event.baseReward ?? 0) + (event.topReward ?? 0) + (event.leaderboardPool ?? 0);
    const maxProposalVotes = event.proposals?.reduce((m, p) => Math.max(m, p.voteCount), 0) ?? 0;
    const coverUrl = resolveImg(event.imageUrl, event.imageCid);

    // Which tabs to show
    const tabs: { key: Tab; label: string }[] = [
        { key: "overview", label: "Overview" },
        ...(isPost ? [{ key: "submissions" as Tab, label: `Submissions (${totalSubs})` }] : []),
        ...(!isPost && event.proposals?.length ? [{ key: "proposals" as Tab, label: `Proposals (${event.proposals.length})` }] : []),
        { key: "manage", label: "Manage" },
    ];

    // Which action buttons to show
    const canPublish = event.status === "draft";
    const canCancel = ["draft", "scheduled", "posting"].includes(event.status);
    const canStop = event.status === "voting" && !isPost; // vote_only stop
    const canDelete = event.status === "draft";
    const isTerminal = event.status === "completed" || event.status === "cancelled";

    return (
        <>
            <div className="space-y-6 pb-20 md:pb-0">
                {/* Cancellation banner */}
                {event.status === "cancelled" && (
                    <div className="flex items-start gap-3 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20">
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black text-red-400">Campaign Cancelled</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {event.cancelReason
                                    ? event.cancelReason
                                    : event.cancelledAt
                                        ? `Cancelled on ${new Date(event.cancelledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                                        : "This campaign was cancelled and is no longer active."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Link href="/brand/events" className="p-2 rounded-full hover:bg-secondary transition-colors mt-0.5 shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        {coverUrl && (
                            <img src={coverUrl} className="w-14 h-14 rounded-2xl object-cover border border-border shrink-0 hidden sm:block" alt="" />
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                    STATUS_STYLES[event.status] ?? STATUS_STYLES.draft
                                )}>
                                    {STATUS_LABELS[event.status] ?? event.status}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium capitalize">
                                    {isPost ? "Post & Vote" : "Vote Only"}
                                </span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight leading-tight">
                                {event.title}
                            </h1>
                            {event.tagline && (
                                <p className="text-sm text-muted-foreground mt-0.5">{event.tagline}</p>
                            )}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-11 md:ml-0">
                        {event.onChainEventId && (
                            <a
                                href={`https://amoy.polygonscan.com/tx/${event.poolTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors"
                                title="View on PolygonScan"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                        {canPublish && (
                            <button
                                onClick={doPublish}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-all text-sm"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Publish
                            </button>
                        )}
                        {canStop && (
                            <button
                                onClick={() => setConfirm("stop")}
                                className="flex items-center gap-2 px-4 py-2 bg-card border border-border font-bold rounded-full hover:bg-secondary transition-all text-sm"
                            >
                                <StopCircle className="w-4 h-4" /> Stop Voting
                            </button>
                        )}
                        {canCancel && (
                            <button
                                onClick={() => setConfirm("cancel")}
                                className="flex items-center gap-2 px-4 py-2 bg-card border border-red-500/30 text-red-400 font-bold rounded-full hover:bg-red-500/10 transition-all text-sm"
                            >
                                <XCircle className="w-4 h-4" /> Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={Users} label="Participants" value={participants || totalSubs || "—"} sub="Unique users" />
                    <StatCard icon={isPost ? ImageIcon : Vote} label={isPost ? "Submissions" : "Votes"} value={isPost ? totalSubs : totalVotes} />
                    <StatCard icon={BarChart2} label="Views" value={totalViews || "—"} />
                    <StatCard
                        icon={Clock}
                        label={isTerminal ? "Ended" : "Time Left"}
                        value={isTerminal ? fmtDate(event.endTime) : timeLeft(event.endTime)}
                        color={isTerminal ? "text-muted-foreground" : "text-primary"}
                    />
                </div>

                {/* Phase timeline */}
                {isPost && <PhaseTimeline event={event} />}

                {/* Tabs */}
                <div className="flex border-b border-border overflow-x-auto scrollbar-none">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap",
                                tab === t.key
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Overview tab ─────────────────────────────────────────── */}
                {tab === "overview" && (
                    <div className="space-y-5">
                        {/* Description */}
                        {event.description && (
                            <div className="bg-card border border-border rounded-2xl p-5">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                                <p className="text-sm text-foreground leading-relaxed">{event.description}</p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-5">
                            {/* Reward breakdown */}
                            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reward Pool</p>
                                <div className="space-y-2">
                                    {event.baseReward != null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Base Reward</span>
                                            <span className="font-bold font-mono">{formatMoney(event.baseReward)}</span>
                                        </div>
                                    )}
                                    {event.topReward != null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Top Reward</span>
                                            <span className="font-bold font-mono">{formatMoney(event.topReward)}</span>
                                        </div>
                                    )}
                                    {event.leaderboardPool != null && event.leaderboardPool > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Leaderboard Pool</span>
                                            <span className="font-bold font-mono">{formatMoney(event.leaderboardPool)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-border/50 pt-2 flex justify-between text-sm font-black">
                                        <span>Total</span>
                                        <span className="text-primary">{formatMoney(totalPool)}</span>
                                    </div>
                                </div>
                                {event.capacity && (
                                    <p className="text-[11px] text-muted-foreground">Max {event.capacity.toLocaleString()} participants</p>
                                )}
                            </div>

                            {/* Schedule */}
                            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Schedule</p>
                                <div className="space-y-2 text-sm">
                                    {isPost ? (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Posting Opens</span>
                                                <span className="font-medium text-right text-xs">{fmt(event.postingStart, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Posting Closes</span>
                                                <span className="font-medium text-right text-xs">{fmt(event.postingEnd, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Voting Closes</span>
                                                <span className="font-medium text-right text-xs">{fmt(event.endTime, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Voting Opens</span>
                                                <span className="font-medium text-right text-xs">{fmt(event.startTime, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Voting Closes</span>
                                                <span className="font-medium text-right text-xs">{fmt(event.endTime, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Metrics (Entropy, Margin, etc) */}
                        {eventAnalyticsData && (
                            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        Advanced Insights
                                    </h3>
                                    <div className="px-2.5 py-1 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase">
                                        Computed Live
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Entropy</span>
                                            <span className="text-xs font-black text-foreground">{eventAnalyticsData.entropy?.toFixed(2) || "0.00"}</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (eventAnalyticsData.entropy || 0) * 20)}%` }} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            Measures vote distribution diversity. Higher values indicate more competition.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Winning Margin</span>
                                            <span className="text-xs font-black text-foreground">{eventAnalyticsData.winningMargin?.toFixed(1) || "0.0"}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${eventAnalyticsData.winningMargin || 0}%` }} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            Distance between the winner and runner-up.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Historical Alignment</span>
                                            <span className="text-xs font-black text-foreground">{eventAnalyticsData.historicalAlignment?.toFixed(1) || "0.0"}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${eventAnalyticsData.historicalAlignment || 0}%` }} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            How well this result aligns with previous community preference.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Targeting */}
                        <div className="grid md:grid-cols-2 gap-5">
                            {(event.hashtags?.length || event.regions?.length) && (
                                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                                    {event.hashtags?.length ? (
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <Hash className="w-3 h-3" /> Hashtags
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {event.hashtags.map(h => (
                                                    <span key={h} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">#{h}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    {event.regions?.length ? (
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <Globe className="w-3 h-3" /> Regions
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {event.regions.map(r => (
                                                    <span key={r} className="px-2.5 py-1 bg-secondary rounded-full text-xs font-medium">{r}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {(event.preferredGender || event.ageGroup) && (
                                <div className="bg-card border border-border rounded-2xl p-5">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                                        <Target className="w-3 h-3" /> Target Audience
                                    </p>
                                    <div className="space-y-2 text-sm">
                                        {event.preferredGender && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Gender</span>
                                                <span className="font-medium">{event.preferredGender}</span>
                                            </div>
                                        )}
                                        {event.ageGroup && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Age Group</span>
                                                <span className="font-medium">{event.ageGroup}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Blockchain info */}
                        {event.onChainEventId && (
                            <div className="bg-card border border-border rounded-2xl p-5">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">On-chain</p>
                                <div className="space-y-2 text-xs font-mono">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground shrink-0">Event ID</span>
                                        <span className="text-foreground truncate">{event.onChainEventId}</span>
                                    </div>
                                    {event.poolTxHash && (
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground shrink-0">Tx Hash</span>
                                            <a
                                                href={`https://amoy.polygonscan.com/tx/${event.poolTxHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary truncate hover:underline"
                                            >
                                                {event.poolTxHash.slice(0, 20)}…{event.poolTxHash.slice(-8)}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Submissions tab ──────────────────────────────────────── */}
                {tab === "submissions" && isPost && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold">{totalSubs} Total Submissions</h3>
                            <span className="text-xs text-muted-foreground">Sorted by votes</span>
                        </div>
                        {subLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-64 bg-secondary/60 rounded-[20px] animate-pulse" />
                                ))}
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No submissions yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {submissions.map(sub => <SubmissionCard key={sub.id} sub={sub} />)}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Proposals tab (vote_only) ────────────────────────────── */}
                {tab === "proposals" && !isPost && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold">{event.proposals?.length ?? 0} Options</h3>
                            <span className="text-xs text-muted-foreground">{totalVotes} total votes</span>
                        </div>
                        {(event.proposals ?? []).map(p => (
                            <ProposalRow key={p.id} proposal={p} maxVotes={maxProposalVotes} />
                        ))}
                    </div>
                )}

                {/* ── Manage tab ───────────────────────────────────────────── */}
                {tab === "manage" && (
                    <div className="space-y-4 max-w-lg">
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Campaign Actions</p>

                            {isTerminal && (
                                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl text-sm text-muted-foreground">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    This campaign is {event.status} — no further actions available.
                                </div>
                            )}

                            {canPublish && (
                                <button
                                    onClick={doPublish}
                                    disabled={actionLoading}
                                    className="w-full flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/20 transition-colors text-left"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm">Publish Campaign</p>
                                        <p className="text-xs text-muted-foreground">Move from Draft → Scheduled</p>
                                    </div>
                                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto text-primary" />}
                                </button>
                            )}

                            {canStop && (
                                <button
                                    onClick={() => setConfirm("stop")}
                                    className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-secondary transition-colors text-left"
                                >
                                    <StopCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm">Stop Voting Early</p>
                                        <p className="text-xs text-muted-foreground">End this vote_only event now and compute results</p>
                                    </div>
                                </button>
                            )}

                            {canCancel && (
                                <button
                                    onClick={() => setConfirm("cancel")}
                                    className="w-full flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors text-left"
                                >
                                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm text-red-400">Cancel Campaign</p>
                                        <p className="text-xs text-muted-foreground">Stop the campaign and refund the pool</p>
                                    </div>
                                </button>
                            )}

                            {canDelete && (
                                <button
                                    onClick={() => setConfirm("delete")}
                                    className="w-full flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors text-left"
                                >
                                    <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm text-red-400">Delete Campaign</p>
                                        <p className="text-xs text-muted-foreground">Permanently delete this draft</p>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={() => {
                                setLoading(true);
                                getEventById(id).then(setEvent).finally(() => setLoading(false));
                            }}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh data
                        </button>
                    </div>
                )}
            </div>

            {/* ── Confirm dialogs ────────────────────────────────────────── */}
            <ConfirmDialog
                open={confirm === "cancel"}
                title="Cancel Campaign?"
                message="This will immediately stop the campaign. Participants will be notified and the reward pool may be refunded."
                confirmLabel="Yes, Cancel"
                danger
                onConfirm={doCancel}
                onCancel={() => setConfirm(null)}
                loading={actionLoading}
            />
            <ConfirmDialog
                open={confirm === "stop"}
                title="Stop Voting Now?"
                message="This will end the voting phase immediately and finalize results. This cannot be undone."
                confirmLabel="Stop Voting"
                onConfirm={doStop}
                onCancel={() => setConfirm(null)}
                loading={actionLoading}
            />
            <ConfirmDialog
                open={confirm === "delete"}
                title="Delete Campaign?"
                message="This permanently deletes the draft. This action cannot be undone."
                confirmLabel="Delete"
                danger
                onConfirm={doDelete}
                onCancel={() => setConfirm(null)}
                loading={actionLoading}
            />
        </>
    );
}
