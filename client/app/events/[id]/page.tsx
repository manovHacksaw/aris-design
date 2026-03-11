"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Trophy, Users, ChevronLeft, Share2, ImageIcon, CheckCircle2, Loader2,
    AlertCircle, Crown, Medal, Info, Eye, Pencil,
    ChevronDown, ChevronUp, Vote, Upload, PlusCircle
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
import { PinturaImageEditor } from "@/components/create/PinturaImageEditor";
import { useUser } from "@/context/UserContext";
import { useSocket } from "@/context/SocketContext";
import { toast } from "sonner";
import Countdown from "@/components/events/Countdown";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function imgUrl(imageUrl?: string | null, cid?: string | null): string | undefined {
    if (imageUrl) return imageUrl;
    if (cid) return `${PINATA_GW}/${cid}`;
    return undefined;
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
    const displayName = sub.user?.displayName || sub.user?.username || "Creator";
    return {
        id: sub.id,
        creator: {
            name: displayName,
            avatar: sub.user?.avatarUrl || avatarUrl(undefined, displayName),
            handle: sub.user?.username || "user",
        },
        media: sub.imageUrl || (sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : ""),
        textContent: sub.content,
        voteCount: votes,
        status,
        isOwn: sub.userId === currentUserId,
        engagementStats: { views: 0, shares: 0 },
    };
}

import { use } from "react";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
    const resolvedParams = use(params as any);
    const id = (resolvedParams as { id: string }).id;
    const { user } = useUser();
    const { socket } = useSocket();

    const [event, setEvent] = useState<Event | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [votedSubmissionId, setVotedSubmissionId] = useState<string | null>(null);
    const [optimisticVoteDelta, setOptimisticVoteDelta] = useState<string | null>(null);

    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [activeViewers, setActiveViewers] = useState<number>(0);

    useEffect(() => {
        if (!socket || !id) return;
        socket.emit("join-event", id);

        const handleVoteUpdate = ({ submissionId, delta }: { submissionId: string; delta: number }) => {
            setSubmissions((prev) =>
                prev.map((s) =>
                    s.id === submissionId
                        ? { ...s, _count: { votes: (s._count?.votes ?? 0) + delta } }
                        : s
                )
            );
            setOptimisticVoteDelta((prev) => (prev === submissionId ? null : prev));
        };

        const handlePresenceUpdate = ({ activeCount }: { activeCount: number }) => {
            setActiveViewers(activeCount);
        };

        socket.on("vote-update", handleVoteUpdate);
        socket.on("presence-update", handlePresenceUpdate);

        return () => {
            socket.emit("leave-event", id);
            socket.off("vote-update", handleVoteUpdate);
            socket.off("presence-update", handlePresenceUpdate);
        };
    }, [socket, id]);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const ev = await getEventById(id, !!user?.id);
                setEvent(ev);

                if (ev.hasVoted && ev.userVotes && ev.userVotes.length > 0) {
                    const vote = ev.userVotes[0];
                    setVotedSubmissionId(vote.submissionId || vote.proposalId || null);
                } else {
                    setVotedSubmissionId(null);
                }

                if (ev.hasSubmitted) {
                    setHasSubmitted(true);
                    if (ev.userSubmission) setMySubmission(ev.userSubmission as Submission);
                } else {
                    setHasSubmitted(false);
                    setMySubmission(null);
                }

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

    const handleVote = useCallback(
        async (submissionId: string) => {
            if (!event) return;
            if (votedSubmissionId) return;
            const sub = submissions.find((s) => s.id === submissionId);
            if (!sub) return;
            if (sub.userId === user?.id && event.eventType !== "vote_only") {
                toast.error("You can't vote for your own submission.");
                return;
            }
            setOptimisticVoteDelta(submissionId);
            setVotedSubmissionId(submissionId);
            try {
                if (event.eventType === "vote_only") {
                    await voteForProposals(event.id, [submissionId]);
                } else {
                    await voteOnSubmission(event.id, submissionId);
                }
            } catch (err: any) {
                setOptimisticVoteDelta(null);
                setVotedSubmissionId(null);
                toast.error(err?.message ?? "Failed to record vote. Please try again.");
            }
        },
        [event, submissions, user?.id, votedSubmissionId]
    );

    const handleNewSubmission = useCallback((sub: Submission) => {
        setHasSubmitted(true);
        setMySubmission(sub);
        setSubmissions((prev) => [sub, ...prev]);
    }, []);

    const coverUrl =
        imgUrl(event?.imageUrl, event?.imageCid) ??
        "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop";

    const brandLogoUrl = event?.brand?.logoCid
        ? imgUrl(undefined, event.brand.logoCid)
        : undefined;

    const enrichedSubmissions = submissions.map((sub) => ({
        ...sub,
        _count: {
            votes: (sub._count?.votes ?? 0) + (optimisticVoteDelta === sub.id ? 1 : 0),
        },
    }));

    const displayMode =
        event?.eventType === "vote_only"
            ? "vote"
            : event?.status === "posting"
                ? "post"
                : "vote";

    return (
        <SidebarLayout>
            <main className="max-w-[1200px] mx-auto pb-24">
                {/* ── Hero ── */}
                <div className="relative w-full h-[280px] md:h-[360px] mb-0 md:rounded-[32px] overflow-hidden -mx-4 md:mx-0 w-[calc(100%+32px)] md:w-full">
                    <img
                        src={coverUrl}
                        className="w-full h-full object-cover"
                        alt="Event Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Nav */}
                    <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-20">
                        <Link
                            href="/home"
                            className="bg-black/30 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-black/50 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </Link>
                        <button className="p-2.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Hero content */}
                    {!loading && event && (
                        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-20">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-xl overflow-hidden shrink-0">
                                    {brandLogoUrl ? (
                                        <img src={brandLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 rounded-lg flex items-center justify-center">
                                            <span className="text-[9px] font-black text-primary">{event.brand?.name?.[0] ?? "B"}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.15em]">
                                            {event.brand?.name}
                                        </p>
                                        <ModeBadge mode={displayMode} />
                                        <StatusBadge status={
                                            event.status === "posting" ? "live"
                                                : event.status === "voting" ? "live"
                                                    : event.status === "completed" ? "ended"
                                                        : "upcoming"
                                        } />
                                    </div>
                                    <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter leading-tight">
                                        {event.title}
                                    </h1>
                                </div>
                            </div>

                            {/* Meta chips */}
                            <div className="flex flex-wrap gap-2">
                                {event.status !== "completed" && (
                                    <Countdown
                                        targetDate={event.status === "posting" ? event.postingEnd! : event.endTime}
                                        label={event.status === "posting" ? "Posting Ends" : "Voting Ends"}
                                    />
                                )}
                                {event._count && (
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <Users className="text-white/60 w-3 h-3" />
                                        <span className="text-[10px] font-black text-white">
                                            {formatCount(event._count.submissions)}
                                        </span>
                                    </div>
                                )}
                                {activeViewers > 0 && (
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                                        </span>
                                        <span className="text-[10px] font-black text-white">{activeViewers} watching</span>
                                    </div>
                                )}
                                {(event.leaderboardPool || event.topReward) && (
                                    <div className="bg-yellow-500/15 backdrop-blur-xl border border-yellow-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <Trophy className="text-yellow-400 w-3 h-3" />
                                        <span className="text-[10px] font-black text-yellow-300">
                                            ${(event.leaderboardPool || event.topReward || 0).toLocaleString()} Pool
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-24 px-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm font-bold text-foreground/60">{fetchError}</p>
                        <Link href="/home" className="text-xs font-black text-primary hover:underline">Back to home</Link>
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

// ─── Posting View ───────────────────────────────────────────────────────────

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
    const [pinturaOpen, setPinturaOpen] = useState(false);
    const [briefOpen, setBriefOpen] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const validation = validateImageFile(f);
        if (!validation.valid) { toast.error(validation.error); return; }
        if (preview) URL.revokeObjectURL(preview);
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handlePinturaDone = (editedFile: File, editedPreview: string) => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(editedFile);
        setPreview(editedPreview);
        setPinturaOpen(false);
    };

    const handleDiscard = () => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        // Reset file input so same file can be re-selected
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!file) { toast.error("Please select an image."); return; }
        setSubmitting(true);
        try {
            const { imageUrl } = await uploadToPinata(file);
            const sub = await createSubmission({
                eventId: event.id,
                imageUrl,
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
        <div className="px-4 md:px-0">
            {/* ── Main CTA: Post / Already submitted ── */}
            <div className="mt-5 mb-5">
                {hasSubmitted ? (
                    /* Already submitted state */
                    <div className="bg-primary/8 border border-primary/25 rounded-[28px] p-6 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-foreground">Entry submitted!</p>
                            <p className="text-xs text-foreground/50 mt-0.5">
                                Your post is live. Voting starts when the posting phase ends.
                            </p>
                        </div>
                        {(mySubmission?.imageUrl || mySubmission?.imageCid) && (
                            <img
                                src={mySubmission.imageUrl || `${PINATA_GW}/${mySubmission.imageCid}`}
                                alt="Your submission"
                                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-primary/30"
                            />
                        )}
                    </div>
                ) : (
                    /* Submission form */
                    <div className="bg-card border border-border/40 rounded-[28px] overflow-hidden">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-border/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                <PlusCircle className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground">Post Your Entry</h3>
                                <p className="text-[11px] text-foreground/40 font-medium">Upload your image to enter the challenge</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Image drop zone */}
                            <div
                                onClick={() => fileRef.current?.click()}
                                className={cn(
                                    "relative border-2 border-dashed rounded-[20px] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                                    preview
                                        ? "border-primary/30 h-[320px]"
                                        : "border-border/40 hover:border-primary/40 hover:bg-primary/3 h-[200px]"
                                )}
                            >
                                {preview ? (
                                    <>
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full">
                                                <span className="text-xs font-black text-white">Change Image</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 p-8">
                                        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-foreground/30" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-foreground/60">Drop your image here</p>
                                            <p className="text-xs text-foreground/30 mt-1">or click to browse</p>
                                        </div>
                                        <p className="text-[10px] text-foreground/20 uppercase tracking-widest font-bold">
                                            JPEG · PNG · GIF · WebP · max 5 MB
                                        </p>
                                    </div>
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
                                placeholder="Write a caption… (optional)"
                                rows={2}
                                maxLength={280}
                                className="w-full bg-secondary/40 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                            />

                            <button
                                onClick={handleSubmit}
                                disabled={!file || submitting}
                                className="w-full py-4 bg-foreground text-background rounded-[18px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-30"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                                ) : (
                                    <><Upload className="w-4 h-4" /> Submit Entry</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Collapsible Brief + Rewards ── */}
            <div className="mb-6">
                <button
                    onClick={() => setBriefOpen((v) => !v)}
                    className="w-full flex items-center justify-between bg-card border border-border/40 rounded-[20px] px-5 py-4 hover:border-border/60 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Info className="w-4 h-4 text-foreground/40" />
                        <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground/50">Challenge Brief & Rewards</span>
                    </div>
                    {(mySubmission?.imageUrl || mySubmission?.imageCid) && (
                        <img
                            src={mySubmission.imageUrl || `${PINATA_GW}/${mySubmission.imageCid}`}
                            alt="Your submission"
                            className="ml-auto w-16 h-16 rounded-xl object-cover shrink-0"
                        />
__SWITCH__
                    {briefOpen ? <ChevronUp className="w-4 h-4 text-foreground/30" /> : <ChevronDown className="w-4 h-4 text-foreground/30" />}
                </button>

                <AnimatePresence>
                    {briefOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid md:grid-cols-[1fr_300px] gap-4 pt-3">
                                <div className="bg-card border border-border/40 rounded-[20px] p-5">
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

                    {/* Image pick / preview */}
                    {preview ? (
                        <div className="relative rounded-[20px] overflow-hidden h-56 border border-primary/20">
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            {/* Action overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleDiscard}
                                    className="px-4 py-2 rounded-xl bg-black/70 border border-white/20 text-[11px] font-black text-white/70 uppercase tracking-widest hover:text-white transition-colors backdrop-blur-md"
                                >
                                    Discard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPinturaOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/70 border border-white/20 text-[11px] font-black text-white uppercase tracking-widest hover:bg-primary/20 hover:border-primary/50 transition-all backdrop-blur-md"
                                >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileRef.current?.click()}
                            className="relative border-2 border-dashed border-border/40 hover:border-primary/40 rounded-[20px] h-40 flex flex-col items-center justify-center cursor-pointer transition-colors"
                        >
                            <ImageIcon className="w-8 h-8 text-foreground/20 mb-2" />
                            <p className="text-xs text-foreground/40 font-bold">Click to upload image</p>
                            <p className="text-[10px] text-foreground/25 mt-1">JPEG, PNG, GIF or WebP · max 5 MB</p>
                        </div>
                    )}
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
__SWITCH__
            {/* ── Submissions Feed ── */}
            {submissions.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">
                            Community Posts ({submissions.length})
                        </h3>
                        <div className="flex bg-secondary rounded-xl p-1 border border-border/40">
                            {(["latest", "top", "yours"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab ? "bg-foreground text-background" : "text-foreground/40 hover:text-foreground"
                                    )}
                                >
                                    {tab === "yours" ? "Mine" : tab}
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

            {/* Pintura editor — opened when user clicks Edit on uploaded image */}
            {preview && (
                <PinturaImageEditor
                    isOpen={pinturaOpen}
                    imageSrc={preview}
                    onDone={handlePinturaDone}
                    onClose={() => setPinturaOpen(false)}
                />
            )}
        </div>
    );
}

// ─── Voting View ────────────────────────────────────────────────────────────

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
    onVote: (id: string) => void;
}) {
    const [activeTab, setActiveTab] = useState<"top" | "latest">("top");
    const [briefOpen, setBriefOpen] = useState(false);

    const sortedSubmissions = [...submissions].sort((a, b) => {
        if (activeTab === "top") return (b._count?.votes || 0) - (a._count?.votes || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const votedSub = votedSubmissionId
        ? submissions.find((s) => s.id === votedSubmissionId)
        : null;

    return (
        <div className="px-4 md:px-0">
            {/* ── Vote status banner ── */}
            <div className="mt-5 mb-5">
                {votedSubmissionId ? (
                    <div className="bg-primary/8 border border-primary/25 rounded-[24px] p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-foreground">Vote cast!</p>
                            <p className="text-xs text-foreground/40 mt-0.5">
                                You voted for <span className="text-foreground/70 font-bold">
                                    @{votedSub?.user?.username || "this entry"}
                                </span>
                            </p>
                        </div>
                        {(votedSub?.imageUrl || votedSub?.imageCid) && (
                            <img
                                src={votedSub.imageUrl || `${PINATA_GW}/${votedSub.imageCid}`}
                                alt="Voted for"
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border-2 border-primary/40"
                            />
                        )}
                    </div>
                ) : (
                    <div className="bg-card border border-border/40 rounded-[24px] p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <Vote className="w-5 h-5 text-foreground/30" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground">Cast your vote</p>
                            <p className="text-xs text-foreground/40 mt-0.5">
                                Pick your favorite entry below — you get one vote
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Collapsible Brief + Rewards ── */}
            <div className="mb-6">
                <button
                    onClick={() => setBriefOpen((v) => !v)}
                    className="w-full flex items-center justify-between bg-card border border-border/40 rounded-[20px] px-5 py-4 hover:border-border/60 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Info className="w-4 h-4 text-foreground/40" />
                        <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground/50">About this challenge</span>
                    </div>
                    {briefOpen ? <ChevronUp className="w-4 h-4 text-foreground/30" /> : <ChevronDown className="w-4 h-4 text-foreground/30" />}
                </button>

                <AnimatePresence>
                    {briefOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid md:grid-cols-[1fr_300px] gap-4 pt-3">
                                <div className="bg-card border border-border/40 rounded-[20px] p-5">
                                    <p className="text-sm font-medium text-foreground/70 leading-relaxed">{event.description}</p>
                                </div>
                                <RewardBlock
                                    rewardPool={`$${calculateTotalPool(event).toLocaleString()}`}
                                    baseReward={event.baseReward ? `$${event.baseReward}` : "$0"}
                                    topReward={event.topReward ? `$${event.topReward}` : undefined}
                                    mode="vote"
                                    variant="full"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Sort tabs + count ── */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">
                    {submissions.length} {submissions.length === 1 ? "Entry" : "Entries"}
                </h3>
                <div className="flex bg-secondary rounded-xl p-1 border border-border/40">
                    {(["top", "latest"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab ? "bg-foreground text-background" : "text-foreground/40 hover:text-foreground"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Voting Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                    {sortedSubmissions.map((sub, idx) => (
                        <motion.div
                            key={sub.id}
                            layout
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                        >
                            <VoteSubmissionCard
                                submission={toVoteSubmission(sub)}
                                isVoted={votedSubmissionId === sub.id}
                                onVote={() => onVote(sub.id)}
                                disabled={!!votedSubmissionId || (event.eventType !== "vote_only" && sub.userId === currentUserId)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {submissions.length === 0 && (
                <div className="text-center py-24">
                    <p className="text-sm text-foreground/30 font-bold">No entries yet</p>
                </div>
            )}
        </div>
    );
}

// ─── Completed View ─────────────────────────────────────────────────────────

function CompletedView({
    event,
    submissions,
    currentUserId,
}: {
    event: Event;
    submissions: Submission[];
    currentUserId?: string | null;
}) {
    const winners = submissions.filter((s) => s.rank && s.rank <= 3).sort((a, b) => (a.rank || 0) - (b.rank || 0));
    const others = submissions.filter((s) => !s.rank || s.rank > 3).sort((a, b) => (b._count?.votes || 0) - (a._count?.votes || 0));

    const medalColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
    const medalIcons = [Crown, Medal, Medal];

    return (
        <div className="px-4 md:px-0 space-y-12 mt-6">
            {/* Winners podium */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-black text-foreground tracking-tighter">Hall of Fame</h2>
                    <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Final results</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {winners.map((sub, i) => {
                        const Icon = medalIcons[i] || Medal;
                        return (
                            <div key={sub.id} className="relative">
                                <div className={cn(
                                    "absolute -top-3 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                    i === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                                        i === 1 ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" :
                                            "bg-amber-700/20 text-amber-500 border border-amber-700/30"
                                )}>
                                    <Icon className={cn("w-3 h-3", medalColors[i])} />
                                    {i === 0 ? "Winner" : `#${i + 1}`}
                                </div>
                                <PostSubmissionCard
                                    submission={toPostSubmission(sub, currentUserId)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Other participants */}
            {others.length > 0 && (
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-5">
                        All Participants ({others.length})
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {others.map((sub) => (
                            <PostSubmissionCard key={sub.id} submission={toPostSubmission(sub, currentUserId)} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Upcoming View ──────────────────────────────────────────────────────────

function UpcomingView({ event }: { event: Event }) {
    return (
        <div className="px-4 md:px-0 py-24 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-foreground tracking-tighter mb-2">Coming Soon</h2>
                <p className="text-sm text-foreground/50 font-medium max-w-[400px]">
                    This campaign hasn&apos;t started yet. It will go live on{" "}
                    <strong>{new Date(event.startTime).toLocaleString()}</strong>.
                </p>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl p-4 flex items-start gap-3 max-w-[480px] text-left">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-foreground/60 leading-relaxed">{event.description}</p>
            </div>
        </div>
    );
}
