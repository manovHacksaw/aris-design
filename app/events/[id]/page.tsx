"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    Trophy,
    Users,
    ChevronLeft,
    Share2,
    PenTool,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EventMode, EventStatus, VoteSubmission, PostSubmission } from "@/types/events";
import { getStatusStyles, formatCount } from "@/lib/eventUtils";
import ModeBadge from "@/components/events/ModeBadge";
import StatusBadge from "@/components/events/StatusBadge";
import RewardBlock from "@/components/events/RewardBlock";
import VoteSubmissionCard from "@/components/events/VoteSubmissionCard";
import PostSubmissionCard from "@/components/events/PostSubmissionCard";
import XPFeedback from "@/components/events/XPFeedback";
import AICreateModal from "@/components/events/AICreateModal";

// ─── Mock Data ─────────────────────────────────────────────

const voteEvent = {
    id: "nike-air-vote",
    mode: "vote" as EventMode,
    status: "live" as EventStatus,
    brand: "Nike Originals",
    title: "Air Max: Vote for the Best Design",
    description: "Vote for your favorite Air Max redesign from our community creators. Every vote earns you rewards.",
    rewardPool: "$5,000",
    baseReward: "$0.05",
    daysLeft: "4d 12h",
    enrolled: 4230,
    image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop",
    brandLogo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop",
};

const postEvent = {
    id: "spotify-art-post",
    mode: "post" as EventMode,
    status: "live" as EventStatus,
    brand: "Spotify",
    title: "Playlist Cover Art Challenge",
    description: "Create original playlist cover art that captures the energy of summer 2026. Show us your vision through bold colors, unique typography, and creative composition.",
    rewardPool: "$3,000",
    baseReward: "$0.10",
    topReward: "$1,500",
    participationReward: "$0.05",
    daysLeft: "6d 08h",
    enrolled: 2180,
    image: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop",
    brandLogo: "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?q=80&w=200&auto=format&fit=crop",
};

const mockVoteSubmissions: VoteSubmission[] = [
    { id: "v1", creator: { name: "David Art", avatar: "https://ui-avatars.com/api/?name=David+Art&background=2F6AFF&color=fff", handle: "david_art" }, media: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=800&auto=format&fit=crop", mediaType: "image", voteCount: 1240, rank: 1 },
    { id: "v2", creator: { name: "NeonVibe", avatar: "https://ui-avatars.com/api/?name=Neon+Vibe&background=FF7AA2&color=fff", handle: "neonvibe" }, media: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop", mediaType: "image", voteCount: 980, rank: 2 },
    { id: "v3", creator: { name: "RetroStyle", avatar: "https://ui-avatars.com/api/?name=Retro+Style&background=10B981&color=fff", handle: "retrostyle" }, media: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?q=80&w=800&auto=format&fit=crop", mediaType: "image", voteCount: 756, rank: 3 },
    { id: "v4", creator: { name: "PixelArt", avatar: "https://ui-avatars.com/api/?name=Pixel+Art&background=F59E0B&color=fff", handle: "pixelart" }, media: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=800&auto=format&fit=crop", mediaType: "image", voteCount: 543 },
    { id: "v5", creator: { name: "Chef Jen", avatar: "https://ui-avatars.com/api/?name=Chef+Jen&background=8B5CF6&color=fff", handle: "chef_jen" }, media: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop", mediaType: "image", voteCount: 321 },
    { id: "v6", creator: { name: "ArtisticJ", avatar: "https://ui-avatars.com/api/?name=Artistic+J&background=EF4444&color=fff", handle: "artisticj" }, media: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=800&auto=format&fit=crop", mediaType: "image", voteCount: 198 },
];

const mockPostSubmissions: PostSubmission[] = [
    { id: "p1", creator: { name: "Moto Mike", avatar: "https://ui-avatars.com/api/?name=Moto+Mike&background=2F6AFF&color=fff", handle: "moto_mike" }, media: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop", textContent: "Summer frequencies — a visual journey through sound and color.", voteCount: 890, status: "winning", engagementStats: { views: 4200, shares: 120 } },
    { id: "p2", creator: { name: "NeonVibe", avatar: "https://ui-avatars.com/api/?name=Neon+Vibe&background=FF7AA2&color=fff", handle: "neonvibe" }, media: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800&auto=format&fit=crop", textContent: "Bass drops and sunset skies.", voteCount: 654, status: "ranked", isAiAssisted: true, engagementStats: { views: 2800, shares: 85 } },
    { id: "p3", creator: { name: "You", avatar: "https://ui-avatars.com/api/?name=You&background=10B981&color=fff", handle: "your_handle" }, media: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop", textContent: "My take on the perfect summer playlist cover.", voteCount: 234, status: "eligible", isOwn: true, engagementStats: { views: 980, shares: 32 } },
    { id: "p4", creator: { name: "PixelArt", avatar: "https://ui-avatars.com/api/?name=Pixel+Art&background=F59E0B&color=fff", handle: "pixelart" }, media: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop", voteCount: 187, status: "eligible", engagementStats: { views: 1200, shares: 45 } },
    { id: "p5", creator: { name: "RetroStyle", avatar: "https://ui-avatars.com/api/?name=Retro+Style&background=8B5CF6&color=fff", handle: "retrostyle" }, media: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop", textContent: "Vinyl vibes for the digital age.", voteCount: 142, status: "eligible", isAiAssisted: true, engagementStats: { views: 890, shares: 28 } },
    { id: "p6", creator: { name: "ArtisticJ", avatar: "https://ui-avatars.com/api/?name=Artistic+J&background=EF4444&color=fff", handle: "artisticj" }, media: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop", voteCount: 98, status: "eligible", engagementStats: { views: 560, shares: 15 } },
];

// ─── Main Page ─────────────────────────────────────────────

export default function EventDetailPage() {
    // Toggle between vote and post mode for demo (in real app, determined by event data)
    const [demoMode, setDemoMode] = useState<EventMode>("vote");
    const eventData = demoMode === "vote" ? voteEvent : postEvent;

    return (
        <SidebarLayout>
            <main className="max-w-[1200px] mx-auto pb-24">
                {/* Immersive Hero Section */}
                <div className="relative w-full h-[85vh] md:h-[500px] mb-8 md:rounded-[32px] overflow-hidden group shadow-2xl -mx-4 md:mx-0 w-[calc(100%+32px)] md:w-full">
                    <img
                        src={eventData.image}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        alt="Event Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Floating Nav & Actions */}
                    <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-20">
                        <Link
                            href="/home"
                            className="bg-background/20 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-background/40 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </Link>

                        <div className="flex items-center gap-3">
                            {/* Demo Mode Toggle */}
                            <div className="flex bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10">
                                <button
                                    onClick={() => setDemoMode("vote")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        demoMode === "vote" ? "bg-primary text-white" : "text-white/60 hover:text-white"
                                    )}
                                >
                                    Vote
                                </button>
                                <button
                                    onClick={() => setDemoMode("post")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        demoMode === "post" ? "bg-accent text-white" : "text-white/60 hover:text-white"
                                    )}
                                >
                                    Post
                                </button>
                            </div>

                            <button className="p-2.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Hero Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20 flex flex-col justify-end h-full pointer-events-none">
                        <div className="pointer-events-auto">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-xl overflow-hidden shrink-0">
                                    <img src={eventData.brandLogo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.15em] shadow-black drop-shadow-md">{eventData.brand}</p>
                                        <ModeBadge mode={eventData.mode} />
                                        <StatusBadge status={eventData.status} />
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-lg mb-2">{eventData.title}</h1>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2">
                                    <Trophy className="text-primary w-3.5 h-3.5" />
                                    <span className="text-xs font-black text-white">{eventData.rewardPool}</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2">
                                    <Clock className="text-white/70 w-3.5 h-3.5" />
                                    <span className="text-xs font-black text-white">{eventData.daysLeft}</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-xl flex items-center gap-2">
                                    <Users className="text-white/70 w-3.5 h-3.5" />
                                    <span className="text-xs font-black text-white">{formatCount(eventData.enrolled)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mode-specific content */}
                <AnimatePresence mode="wait">
                    {demoMode === "vote" ? (
                        <motion.div
                            key="vote"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <VoteModeView event={voteEvent} submissions={mockVoteSubmissions} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="post"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <PostModeView event={postEvent} submissions={mockPostSubmissions} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </SidebarLayout>
    );
}

// ─── Vote Mode View ────────────────────────────────────────

function VoteModeView({ event, submissions }: { event: typeof voteEvent; submissions: VoteSubmission[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [showXP, setShowXP] = useState(false);

    const handleSelect = useCallback((id: string) => {
        if (!isLocked) {
            setSelectedId(id);
        }
    }, [isLocked]);

    const handleConfirm = () => {
        if (selectedId && !isLocked) {
            setIsLocked(true);
            setShowXP(true);
        }
    };

    const selectedSubmission = submissions.find(s => s.id === selectedId);

    return (
        <div className="px-4 md:px-0 space-y-8">
            {/* Reward + Instructions */}
            <div className="grid md:grid-cols-[1fr_340px] gap-6">
                <RewardBlock
                    rewardPool={event.rewardPool}
                    baseReward={event.baseReward}
                    mode="vote"
                    variant="full"
                />

                <div className="bg-card border border-border/40 rounded-[28px] p-6 flex flex-col justify-center">
                    <p className="text-xs font-bold text-foreground/50 leading-relaxed mb-4">
                        {event.description}
                    </p>
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-primary/80 uppercase tracking-widest">
                            Select one submission to cast your vote
                        </p>
                    </div>
                </div>
            </div>

            {/* Confirm bar (when selected but not locked) */}
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
                                src={selectedSubmission?.creator.avatar}
                                className="w-8 h-8 rounded-full border border-primary/30"
                                alt=""
                            />
                            <div>
                                <p className="text-xs font-black text-foreground">
                                    Vote for @{selectedSubmission?.creator.handle}?
                                </p>
                                <p className="text-[10px] text-foreground/40 font-bold">
                                    You&apos;ll earn {event.baseReward} for this vote
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleConfirm}
                            className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark active:scale-[0.98] transition-all"
                        >
                            Confirm Vote
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Post-vote confirmation */}
            <AnimatePresence>
                {isLocked && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/5 border border-primary/20 rounded-[20px] p-5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={selectedSubmission?.creator.avatar}
                                className="w-8 h-8 rounded-full border border-primary/30"
                                alt=""
                            />
                            <div>
                                <p className="text-xs font-black text-foreground">
                                    You voted for @{selectedSubmission?.creator.handle}
                                </p>
                                <p className="text-[10px] text-primary font-bold">
                                    +{event.baseReward} earned
                                </p>
                            </div>
                        </div>
                        <XPFeedback xp={25} reward={event.baseReward} streak={12} show={showXP} onComplete={() => setShowXP(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submissions Grid */}
            <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-6">
                    Submissions ({submissions.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {submissions.map((sub) => (
                        <VoteSubmissionCard
                            key={sub.id}
                            submission={sub}
                            isSelected={selectedId === sub.id}
                            isLocked={isLocked}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Post Mode View ────────────────────────────────────────

function PostModeView({ event, submissions }: { event: typeof postEvent; submissions: PostSubmission[] }) {
    const [showAIModal, setShowAIModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"latest" | "top" | "yours">("latest");

    const handleAISubmit = (content: { text: string; isAiAssisted: boolean }) => {
        // In production, this would submit to the backend
        console.log("AI submission:", content);
    };

    const sortedSubmissions = [...submissions].sort((a, b) => {
        if (activeTab === "top") return b.voteCount - a.voteCount;
        return 0; // latest = default order
    });

    const filteredSubmissions = activeTab === "yours"
        ? sortedSubmissions.filter(s => s.isOwn)
        : sortedSubmissions;

    return (
        <div className="px-4 md:px-0 space-y-8">
            {/* Description + Reward */}
            <div className="grid md:grid-cols-[1fr_340px] gap-6">
                <div className="bg-card border border-border/40 rounded-[28px] p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-4">Challenge Brief</h3>
                    <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                        {event.description}
                    </p>
                </div>

                <RewardBlock
                    rewardPool={event.rewardPool}
                    baseReward={event.baseReward}
                    topReward={event.topReward}
                    participationReward={event.participationReward}
                    mode="post"
                    variant="full"
                />
            </div>

            {/* CTA Section */}
            <div className="flex gap-4">
                <button className="flex-1 bg-foreground text-background py-4 rounded-[18px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-foreground/90 active:scale-[0.98] transition-all">
                    <PenTool className="w-4 h-4" />
                    Create Post
                </button>
                <button
                    onClick={() => setShowAIModal(true)}
                    className="flex-1 bg-card border border-border/60 text-foreground py-4 rounded-[18px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-secondary active:scale-[0.98] transition-all"
                >
                    <Sparkles className="w-4 h-4 text-primary" />
                    Generate with AI
                </button>
            </div>

            {/* Submissions Feed */}
            <div>
                {/* Tabs */}
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
                                    activeTab === tab
                                        ? "bg-foreground text-background"
                                        : "text-foreground/40 hover:text-foreground"
                                )}
                            >
                                {tab === "yours" ? "Your Post" : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredSubmissions.map((sub) => (
                        <PostSubmissionCard key={sub.id} submission={sub} />
                    ))}
                </div>

                {activeTab === "yours" && filteredSubmissions.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-sm text-foreground/30 font-bold mb-4">You haven&apos;t submitted yet</p>
                        <button className="bg-primary text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-colors">
                            Create Your Submission
                        </button>
                    </div>
                )}
            </div>

            {/* AI Modal */}
            <AICreateModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                onSubmit={handleAISubmit}
                eventTitle={event.title}
            />
        </div>
    );
}
