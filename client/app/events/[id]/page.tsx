"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Trophy, Users, ChevronLeft, Share2, ImageIcon, CheckCircle2, Loader2, AlertCircle,
    Trash2, Crown, Medal, ExternalLink, Calendar, DollarSign, Info, Layers
} from "lucide-react";
import { calculateTotalPool } from "@/lib/eventUtils";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { VoteSubmission, PostSubmission, SubmissionStatus } from "@/types/events";
import { formatCount } from "@/lib/eventUtils";
import ModeBadge from "@/components/events/ModeBadge";
import StatusBadge from "@/components/events/StatusBadge";
import RewardBlock from "@/components/events/RewardBlock";
import VoteSubmissionCard from "@/components/events/VoteSubmissionCard";
import PostSubmissionCard from "@/components/events/PostSubmissionCard";
import { getEventById, Event, voteForProposals } from "@/services/event.service";
import {
    getEventSubmissions,
    voteOnSubmission,
    createSubmission,
    Submission,
} from "@/services/submission.service";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function imgUrl(cid?: string | null): string | undefined {
    return cid ? `${PINATA_GW}/${cid}` : undefined;
}

function avatarUrl(profilePicCid?: string | null, name?: string | null): string {
    if (profilePicCid) return `${PINATA_GW}/${profilePicCid}`;
    const n = encodeURIComponent(name || "User");
    return `https://ui-avatars.com/api/?name=${n}&background=2F6AFF&color=fff`;
}

function toVoteSubmission(sub: Submission): VoteSubmission {
    return {
        id: sub.id,
        creator: {
            name: sub.user?.name || sub.user?.username || "Creator",
            avatar: avatarUrl(sub.user?.profilePicCid, sub.user?.name || sub.user?.username),
            handle: sub.user?.username || "user",
        },
        media: sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : "",
        mediaType: "image",
        textContent: sub.content,
        voteCount: sub._count?.votes ?? 0,
        rank: sub.rank,
    };
}

function toPostSubmission(sub: Submission, currentUserId?: string | null): PostSubmission {
    const votes = sub._count?.votes ?? 0;
    const status: SubmissionStatus =
        sub.rank === 1 ? "winning" : sub.rank && sub.rank <= 3 ? "ranked" : "eligible";
    return {
        id: sub.id,
        creator: {
            name: sub.user?.name || sub.user?.username || "Creator",
            avatar: avatarUrl(sub.user?.profilePicCid, sub.user?.name || sub.user?.username),
            handle: sub.user?.username || "user",
        },
        media: sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : "",
        textContent: sub.content,
        voteCount: votes,
        status,
        isOwn: sub.userId === currentUserId,
        engagementStats: { views: 0, shares: 0 },
    };
}

// ─── Main Page ─────────────────────────────────────────────

import { use } from "react";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
    const resolvedParams = use(params as any);
    const id = (resolvedParams as { id: string }).id;
    const { user } = useUser();

    const [event, setEvent] = useState<Event | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Voting state
    const [votedSubmissionId, setVotedSubmissionId] = useState<string | null>(null);
    const [optimisticVoteDelta, setOptimisticVoteDelta] = useState<string | null>(null); // submissionId with +1

    // Submission state
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                // When user is authenticated, force-refresh to bypass cached guest responses
                const ev = await getEventById(id, !!user?.id);
                setEvent(ev);

                // Seed voted state from backend
                if (ev.hasVoted && ev.userVotes && ev.userVotes.length > 0) {
                    const vote = ev.userVotes[0];
                    setVotedSubmissionId(vote.submissionId || vote.proposalId || null);
                } else {
                    setVotedSubmissionId(null);
                }

                // Seed submission state from backend
                if (ev.hasSubmitted) {
                    setHasSubmitted(true);
                    if (ev.userSubmission) setMySubmission(ev.userSubmission as Submission);
                } else {
                    setHasSubmitted(false);
                    setMySubmission(null);
                }

                // Fetch submissions for posting or voting phases
                if (ev.status === "posting" || ev.status === "voting" || ev.status === "completed") {
                    if (ev.eventType === "post_and_vote") {
                        const res = await getEventSubmissions(id, { sortBy: "votes", limit: 50 });
                        setSubmissions(res.submissions);
                    } else if (ev.eventType === "vote_only" && ev.proposals) {
                        const proposalsAsSubs = ev.proposals.map((p) => ({
                            id: p.id,
                            userId: ev.brandId,
                            eventId: ev.id,
                            imageCid: p.imageCid,
                            content: p.title + (p.content ? `\n${p.content}` : ""),
                            user: {
                                name: ev.brand?.name || "Brand",
                                username: ev.brand?.name || "brand",
                                profilePicCid: ev.brand?.logoCid,
                            },
                            _count: { votes: p.voteCount || 0 },
                            rank: p.finalRank,
                            createdAt: ev.createdAt,
                            updatedAt: ev.createdAt,
                        }));
                        setSubmissions(proposalsAsSubs as any[]);
                    }
                }
            } catch (err: any) {
                setFetchError(err?.message ?? "Failed to load event");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id, user?.id]);

    // ── Voting handler ─────────────────────────────────────
    const handleVote = useCallback(
        async (submissionId: string) => {
            if (!event) return;
            if (votedSubmissionId) return; // already voted
            const sub = submissions.find((s) => s.id === submissionId);
            if (!sub) return;
            if (sub.userId === user?.id && event.eventType !== "vote_only") {
                toast.error("You can't vote for your own submission.");
                return;
            }

            // Optimistic update
            setOptimisticVoteDelta(submissionId);
            setVotedSubmissionId(submissionId);

            try {
                if (event.eventType === "vote_only") {
                    await voteForProposals(event.id, [submissionId]);
                } else {
                    await voteOnSubmission(event.id, submissionId);
                }
            } catch (err: any) {
                // Revert
                setOptimisticVoteDelta(null);
                setVotedSubmissionId(null);
                toast.error(err?.message ?? "Failed to record vote. Please try again.");
            }
        },
        [event, submissions, user?.id, votedSubmissionId]
    );

    // ── Submission handler ─────────────────────────────────
    const handleNewSubmission = useCallback((sub: Submission) => {
        setHasSubmitted(true);
        setMySubmission(sub);
        setSubmissions((prev) => [sub, ...prev]);
    }, []);

    // ─── Render ────────────────────────────────────────────

    const coverUrl =
        imgUrl(event?.imageCid) ??
        "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop";

    const brandLogoUrl = event?.brand?.logoCid
        ? imgUrl(event.brand.logoCid)
        : undefined;

    // Compute enriched submissions with optimistic vote delta
    const enrichedSubmissions = submissions.map((sub) => ({
        ...sub,
        _count: {
            votes:
                (sub._count?.votes ?? 0) +
                (optimisticVoteDelta === sub.id ? 1 : 0),
        },
    }));

    // Derive display mode from real event status
    const displayMode =
        event?.eventType === "vote_only"
            ? "vote"
            : event?.status === "posting"
                ? "post"
                : "vote";

    return (
        <SidebarLayout>
            <main className="max-w-[1200px] mx-auto pb-24">
                {/* Hero */}
                <div className="relative w-full h-[85vh] md:h-[500px] mb-8 md:rounded-[32px] overflow-hidden group shadow-2xl -mx-4 md:mx-0 w-[calc(100%+32px)] md:w-full">
                    <img
                        src={coverUrl}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        alt="Event Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Nav */}
                    <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-20">
                        <Link
                            href="/home"
                            className="bg-background/20 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-background/40 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </Link>
                        <button className="p-2.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Hero overlay */}
                    {!loading && event && (
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-xl overflow-hidden shrink-0">
                                    {brandLogoUrl ? (
                                        <img src={brandLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 rounded-lg flex items-center justify-center">
                                            <span className="text-[10px] font-black text-primary">
                                                {event.brand?.name?.[0] ?? "B"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.15em] drop-shadow-md">
                                            {event.brand?.name}
                                        </p>
                                        <ModeBadge mode={displayMode} />
                                        <StatusBadge status={
                                            event.status === "posting" ? "live"
                                                : event.status === "voting" ? "live"
                                                    : event.status === "completed" ? "ended"
                                                        : event.status === "scheduled" ? "upcoming"
                                                            : "upcoming"
                                        } />
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-lg mb-2">
                                        {event.title}
                                    </h1>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {(event.leaderboardPool || event.topReward) && (
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2">
                                        <Trophy className="text-primary w-3.5 h-3.5" />
                                        <span className="text-xs font-black text-white">
                                            ${(event.leaderboardPool || event.topReward || 0).toLocaleString()} pool
                                        </span>
                                    </div>
                                )}
                                <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2">
                                    <Clock className="text-white/70 w-3.5 h-3.5" />
                                    <span className="text-xs font-black text-white">
                                        {new Date(event.endTime) > new Date()
                                            ? `Ends ${new Date(event.endTime).toLocaleDateString()}`
                                            : "Ended"}
                                    </span>
                                </div>
                                {event._count && (
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2">
                                        <Users className="text-white/70 w-3.5 h-3.5" />
                                        <span className="text-xs font-black text-white">
                                            {formatCount(event._count.submissions)} submissions
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Body */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm font-bold text-foreground/60">{fetchError}</p>
                        <Link href="/home" className="text-xs font-black text-primary hover:underline">
                            Back to home
                        </Link>
                    </div>
                ) : event ? (
                    <AnimatePresence mode="wait">
                        {event.status === "posting" && event.eventType === "post_and_vote" ? (
                            <motion.div key="posting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <PostingView
                                    event={event}
                                    submissions={enrichedSubmissions}
                                    hasSubmitted={hasSubmitted}
                                    mySubmission={mySubmission}
                                    currentUserId={user?.id}
                                    onSubmitted={handleNewSubmission}
                                />
                            </motion.div>
                        ) : event.status === "voting" || (event.eventType === "vote_only" && event.status !== "completed") ? (
                            <motion.div key="voting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <VotingView
                                    event={event}
                                    submissions={enrichedSubmissions}
                                    votedSubmissionId={votedSubmissionId}
                                    currentUserId={user?.id}
                                    onVote={handleVote}
                                />
                            </motion.div>
                        ) : event.status === "completed" ? (
                            <motion.div key="completed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <CompletedView event={event} submissions={enrichedSubmissions} currentUserId={user?.id} />
                            </motion.div>
                        ) : (
                            <motion.div key="upcoming" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <UpcomingView event={event} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                ) : null}
            </main>
        </SidebarLayout>
    );
}

// ─── Posting View ──────────────────────────────────────────

function PostingView({
    event,
    submissions,
    hasSubmitted,
    mySubmission,
    currentUserId,
    onSubmitted,
}: {
    event: Event;
    submissions: Submission[];
    hasSubmitted: boolean;
    mySubmission: Submission | null;
    currentUserId?: string | null;
    onSubmitted: (sub: Submission) => void;
}) {
    const [activeTab, setActiveTab] = useState<"latest" | "top" | "yours">("latest");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const validation = validateImageFile(f);
        if (!validation.valid) { toast.error(validation.error); return; }
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handleSubmit = async () => {
        if (!file) { toast.error("Please select an image."); return; }
        setSubmitting(true);
        try {
            const { cid } = await uploadToPinata(file);
            const sub = await createSubmission({
                eventId: event.id,
                imageCid: cid,
                caption: caption.trim() || undefined,
            });
            toast.success("Submission uploaded!");
            onSubmitted(sub);
        } catch (err: any) {
            toast.error(err?.message ?? "Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const sortedSubmissions = [...submissions].sort((a, b) =>
        activeTab === "top" ? (b._count?.votes ?? 0) - (a._count?.votes ?? 0) : 0
    );
    const filteredSubmissions =
        activeTab === "yours"
            ? sortedSubmissions.filter((s) => s.userId === currentUserId)
            : sortedSubmissions;

    return (
        <div className="px-4 md:px-0 space-y-8">
            {/* Brief + Reward */}
            <div className="grid md:grid-cols-[1fr_340px] gap-6">
                <div className="bg-card border border-border/40 rounded-[28px] p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-4">Challenge Brief</h3>
                    <p className="text-sm font-medium text-foreground/70 leading-relaxed">{event.description}</p>
                </div>
                <RewardBlock
                    rewardPool={`$${((event.leaderboardPool ?? 0) + (event.baseReward ?? 0)).toLocaleString()}`}
                    baseReward={event.baseReward ? `$${event.baseReward}` : "$0"}
                    topReward={event.topReward ? `$${event.topReward}` : undefined}
                    mode="post"
                    variant="full"
                />
            </div>

            {/* Submission form or already-submitted state */}
            {hasSubmitted ? (
                <div className="bg-primary/5 border border-primary/20 rounded-[24px] p-6 flex items-center gap-4">
                    <CheckCircle2 className="w-8 h-8 text-primary shrink-0" />
                    <div>
                        <p className="text-sm font-black text-foreground">Submission uploaded</p>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            Your entry is live. Voting starts when the posting phase ends.
                        </p>
                    </div>
                    {mySubmission?.imageCid && (
                        <img
                            src={`${PINATA_GW}/${mySubmission.imageCid}`}
                            alt="Your submission"
                            className="ml-auto w-16 h-16 rounded-xl object-cover shrink-0"
                        />
                    )}
                </div>
            ) : (
                <div className="bg-card border border-border/40 rounded-[28px] p-6 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">Your Submission</h3>

                    {/* Image pick */}
                    <div
                        onClick={() => fileRef.current?.click()}
                        className={cn(
                            "relative border-2 border-dashed rounded-[20px] flex flex-col items-center justify-center cursor-pointer transition-colors",
                            preview ? "border-primary/30 h-56" : "border-border/40 hover:border-primary/40 h-40"
                        )}
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-[18px]" />
                        ) : (
                            <>
                                <ImageIcon className="w-8 h-8 text-foreground/20 mb-2" />
                                <p className="text-xs text-foreground/40 font-bold">Click to upload image</p>
                                <p className="text-[10px] text-foreground/25 mt-1">JPEG, PNG, GIF or WebP · max 5 MB</p>
                            </>
                        )}
                    </div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Caption */}
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption (optional)"
                        rows={2}
                        maxLength={280}
                        className="w-full bg-secondary/40 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={!file || submitting}
                        className="w-full py-3.5 bg-foreground text-background rounded-[18px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        ) : (
                            "Submit Entry"
                        )}
                    </button>
                </div>
            )}

            {/* Submissions feed */}
            {submissions.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">
                            Submissions ({submissions.length})
                        </h3>
                        <div className="flex bg-secondary rounded-xl p-1 border border-border/40">
                            {(["latest", "top", "yours"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab ? "bg-foreground text-background" : "text-foreground/40 hover:text-foreground"
                                    )}
                                >
                                    {tab === "yours" ? "Your Post" : tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredSubmissions.map((sub) => (
                            <PostSubmissionCard key={sub.id} submission={toPostSubmission(sub, currentUserId)} />
                        ))}
                    </div>
                    {activeTab === "yours" && filteredSubmissions.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-sm text-foreground/30 font-bold">You haven&apos;t submitted yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Voting View ───────────────────────────────────────────

function VotingView({
    event,
    submissions,
    votedSubmissionId,
    currentUserId,
    onVote,
}: {
    event: Event;
    submissions: Submission[];
    votedSubmissionId: string | null;
    currentUserId?: string | null;
    onVote: (submissionId: string) => void;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const isLocked = !!votedSubmissionId;
    const confirmedSub = submissions.find((s) => s.id === votedSubmissionId);
    const selectedSub = submissions.find((s) => s.id === selectedId);

    const handleSelect = (id: string) => {
        if (isLocked) return;
        setSelectedId(id);
    };

    const handleConfirm = async () => {
        if (!selectedId || isLocked || isConfirming) return;
        setIsConfirming(true);
        await onVote(selectedId);
        setIsConfirming(false);
    };

    const voteSubmissions = submissions.map(toVoteSubmission);

    return (
        <div className="px-4 md:px-0 space-y-8">
            {/* Reward + description */}
            <div className="grid md:grid-cols-[1fr_340px] gap-6">
                <RewardBlock
                    rewardPool={`$${calculateTotalPool(event).toLocaleString()}`}
                    baseReward={event.baseReward ? `$${event.baseReward}` : "$0"}
                    mode="vote"
                    variant="full"
                />
                <div className="bg-card border border-border/40 rounded-[28px] p-6 flex flex-col justify-center">
                    <p className="text-xs font-bold text-foreground/50 leading-relaxed mb-4">{event.description}</p>
                    {!isLocked && (
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-primary/80 uppercase tracking-widest">
                                Select one submission to cast your vote
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm bar */}
            <AnimatePresence>
                {selectedId && !isLocked && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-card border border-primary/30 rounded-[20px] p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={selectedSub ? avatarUrl(selectedSub.user?.profilePicCid, selectedSub.user?.name) : ""}
                                className="w-8 h-8 rounded-full border border-primary/30"
                                alt=""
                            />
                            <div>
                                <p className="text-xs font-black text-foreground">
                                    Vote for @{selectedSub?.user?.username ?? "user"}?
                                </p>
                                {event.baseReward && (
                                    <p className="text-[10px] text-foreground/40 font-bold">
                                        You&apos;ll earn ${event.baseReward} for this vote
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2"
                        >
                            {isConfirming && <Loader2 className="w-3 h-3 animate-spin" />}
                            Confirm Vote
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voted confirmation */}
            <AnimatePresence>
                {isLocked && confirmedSub && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/5 border border-primary/20 rounded-[20px] p-5 flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        <div>
                            <p className="text-xs font-black text-foreground">
                                You voted for @{confirmedSub.user?.username ?? "user"}
                            </p>
                            {event.baseReward && (
                                <p className="text-[10px] text-primary font-bold">+${event.baseReward} earned</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submissions grid */}
            <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-6">
                    Submissions ({submissions.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {voteSubmissions.map((sub) => (
                        <VoteSubmissionCard
                            key={sub.id}
                            submission={sub}
                            isSelected={selectedId === sub.id || votedSubmissionId === sub.id}
                            isLocked={isLocked}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Completed View ────────────────────────────────────────

function CompletedView({
    event,
    submissions,
    currentUserId,
}: {
    event: Event;
    submissions: Submission[];
    currentUserId?: string | null;
}) {
    const sorted = [...submissions].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

    return (
        <div className="px-4 md:px-0 space-y-8">
            <div className="bg-card border border-border/40 rounded-[28px] p-6 flex items-center gap-4">
                <Trophy className="w-8 h-8 text-primary shrink-0" />
                <div>
                    <p className="text-sm font-black text-foreground">Event Completed</p>
                    <p className="text-xs text-foreground/50 mt-0.5">Final rankings below. Rewards will be distributed on-chain.</p>
                </div>
            </div>
            {sorted.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-6">
                        Final Leaderboard
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {sorted.map((sub) => (
                            <PostSubmissionCard key={sub.id} submission={toPostSubmission(sub, currentUserId)} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Upcoming View ─────────────────────────────────────────

function UpcomingView({ event }: { event: Event }) {
    return (
        <div className="px-4 md:px-0">
            <div className="bg-card border border-border/40 rounded-[28px] p-8 flex flex-col items-center text-center gap-4">
                <Clock className="w-10 h-10 text-foreground/20" />
                <div>
                    <p className="text-base font-black text-foreground">Coming Soon</p>
                    <p className="text-xs text-foreground/50 mt-1">
                        This event starts on {new Date(event.startTime).toLocaleDateString(undefined, {
                            month: "long", day: "numeric", year: "numeric"
                        })}.
                    </p>
                </div>
                {event.description && (
                    <p className="text-sm text-foreground/50 leading-relaxed max-w-md">{event.description}</p>
                )}
            </div>
        </div>
    );
}
