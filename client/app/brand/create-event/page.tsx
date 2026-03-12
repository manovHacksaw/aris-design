"use client";

import { useState, useRef, useCallback } from "react";
import {
    ChevronLeft, ChevronRight, Sparkles, Loader2, X, Plus, Minus,
    Upload, Users, DollarSign, Globe, FileText, Shield, Hash,
    CheckCircle2, ImageIcon, RefreshCw, Zap, Copy, Check, Pencil,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LaunchStepModal, { type LaunchFormData } from "@/components/brand/LaunchStepModal";
import { generateTagline, generateAiProposals } from "@/services/ai.service";
import { readBrandRefundBalance } from "@/lib/blockchain/contracts";
import { useWallet } from "@/context/WalletContext";
import { useEffect } from "react";
import { BrandImageGeneratorModal } from "@/components/create/BrandImageGeneratorModal";
import { PinturaImageEditor } from "@/components/create/PinturaImageEditor";
import { uploadToPinata } from "@/lib/pinata-upload";
import { useUser } from "@/context/UserContext";

// ── Constants (mirror contracts.ts) ──────────────────────────────────────────
const BASE_RATE = 0.030;   // $0.030/participant — base voter reward
const CREATOR_RATE = 0.050;   // $0.050/participant — creator reward (post only)
const FEE_VOTE = 0.015;   // $0.015/participant — platform fee (vote_only)
const FEE_POST = 0.020;   // $0.020/participant — platform fee (post_and_vote)

const STEPS = [
    { id: "basics", label: "Basics", icon: FileText },
    { id: "rewards", label: "Rewards", icon: DollarSign },
    { id: "audience", label: "Audience", icon: Users },
    { id: "instructions", label: "Instructions", icon: FileText },
    { id: "content", label: "Content", icon: ImageIcon },
    { id: "moderation", label: "Moderation", icon: Shield },
    { id: "hashtags", label: "Hashtags", icon: Hash },
    { id: "review", label: "Review", icon: CheckCircle2 },
] as const;

type StepId = typeof STEPS[number]["id"];

const GENDERS = ["All", "Male", "Female", "Non-binary"];
const AGE_GROUPS = ["All Ages", "18-24", "25-34", "35-44", "45+"];
const CONTENT_TYPES = ["Photo", "Video", "Reel", "Story", "Text Post"];
const TIMEZONES = ["UTC", "EST (UTC-5)", "PST (UTC-8)", "IST (UTC+5:30)", "CET (UTC+1)"];
const MODERATION_CHIPS = [
    "No copyrighted material",
    "Original content only",
    "No offensive content",
    "Brand-safe content required",
    "One submission per user",
];

interface Proposal { title: string; imageUrl?: string; order: number; media?: File; mediaPreview?: string; }

interface FormData extends Omit<LaunchFormData, "type"> {
    type: "post" | "vote";
    tagline: string;
    preferredGender: string;
    ageGroup: string;
    regions: string[];
    regionInput: string;
    participantInstructions: string;
    submissionGuidelines: string;
    contentType: string[];
    sampleImages: { file: File; preview: string }[];
    proposals: Proposal[];
    moderationRules: string;
    hashtagInput: string;
    // scheduling
    startImmediately: boolean;
    postingEndDate: string;  // post_and_vote only — when posting phase ends / voting begins
    useRefundCredit: boolean;
    refundCreditAmount: number;
}

// ── Small utility components ──────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
    return (
        <label className="block text-sm font-semibold text-foreground mb-1.5">
            {children}
            {optional && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>}
        </label>
    );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground",
                "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all",
                className
            )}
            {...props}
        />
    );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                "w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground",
                "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none",
                className
            )}
            {...props}
        />
    );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cn(
                "w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all",
                className
            )}
            {...props}
        />
    );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function RewardRow({ label, rate, count, note, highlight }: { label: string; rate?: number; count: number; note?: string; highlight?: boolean }) {
    const amount = rate !== undefined ? rate * count : undefined;
    return (
        <div className={cn("flex items-center justify-between gap-3 py-2", highlight && "text-primary font-bold")}>
            <div className="min-w-0">
                <span className="text-sm">{label}</span>
                {note && <span className="block text-xs text-muted-foreground">{note}</span>}
            </div>
            <div className="text-right shrink-0">
                {rate !== undefined && <span className="block text-xs text-muted-foreground font-mono">${rate.toFixed(3)} × {count}</span>}
                <span className={cn("text-sm font-mono font-bold", highlight ? "text-primary" : "text-foreground")}>
                    {amount !== undefined ? `$${amount.toFixed(2)}` : "—"}
                </span>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateEventPage() {
    const router = useRouter();
    const { address, balance, refreshBalance } = useWallet();
    const { user } = useUser();
    const [currentStep, setCurrentStep] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [taglineLoading, setTaglineLoading] = useState(false);
    const [proposalAiLoading, setProposalAiLoading] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    // AI image generator for voting options
    const [aiGeneratorProposalIdx, setAiGeneratorProposalIdx] = useState<number | null>(null);
    // AI image generator for sample images
    const [aiGeneratorSampleOpen, setAiGeneratorSampleOpen] = useState(false);
    // Track which "Add Sample" slot is in two-button mode (null = none expanded)
    const [sampleAddMode, setSampleAddMode] = useState(false);
    // Pintura editor state
    const [pinturaOpen, setPinturaOpen] = useState(false);
    const [pinturaImageSrc, setPinturaImageSrc] = useState<string | null>(null);
    const [pinturaEditTarget, setPinturaEditTarget] = useState<{ type: 'proposal' | 'sample'; idx: number } | null>(null);

    const [form, setForm] = useState<FormData>({
        title: "",
        tagline: "",
        type: "post",
        description: "",
        startImmediately: false,
        startDate: "",
        postingEndDate: "",
        endDate: "",
        timezone: "UTC",
        rules: "",
        hashtags: [],
        hashtagInput: "",
        regions: [],
        regionInput: "",
        contentType: ["Photo"],
        maxParticipants: "",
        baseReward: "0.03",
        leaderboardPool: "",
        topPrize: "",
        coverImage: null,
        preferredGender: "All",
        ageGroup: "All Ages",
        participantInstructions: "",
        submissionGuidelines: "",
        sampleImages: [],
        proposals: [{ title: "", order: 0 }, { title: "", order: 1 }],
        moderationRules: "",
        useRefundCredit: false,
        refundCreditAmount: 0,
    });

    const [availableCredit, setAvailableCredit] = useState<number>(0);
    const [addressCopied, setAddressCopied] = useState(false);

    const copyAddress = useCallback(() => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
    }, [address]);

    useEffect(() => {
        if (!address) return;
        readBrandRefundBalance(address)
            .then((raw) => {
                const amount = Number(raw) / 1e6;
                setAvailableCredit(amount);
                if (amount > 0) set({ refundCreditAmount: amount, useRefundCredit: true });
            })
            .catch(() => {});
    }, [address]);

    const set = useCallback((patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch })), []);

    // ── Derived reward values ──────────────────────────────────────────────
    const isPost = form.type === "post";
    const pCount = Math.max(parseInt(form.maxParticipants) || 0, 0);
    const topNum = parseFloat(form.topPrize) || 0;
    const ldrNum = isPost ? (parseFloat(form.leaderboardPool) || 0) : 0;
    const basePool = BASE_RATE * pCount;
    const minTop = BASE_RATE * pCount;
    const effectiveTop = Math.max(topNum, minTop);
    const creatorPool = isPost ? CREATOR_RATE * pCount : 0;
    const platformFee = (isPost ? FEE_POST : FEE_VOTE) * pCount;
    const totalLocked = basePool + effectiveTop + creatorPool + platformFee + ldrNum;

    const resolvedStartMs = form.startImmediately ? Date.now() : (form.startDate ? new Date(form.startDate).getTime() : 0);
    const durationMs = resolvedStartMs && form.endDate
        ? new Date(form.endDate).getTime() - resolvedStartMs
        : 0;

    const fmtDuration = (ms: number) => {
        if (ms <= 0) return "—";
        const totalMinutes = Math.floor(ms / (1000 * 60));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
        return `${m}m`;
    };

    const postingDurationMs = isPost && resolvedStartMs && form.postingEndDate
        ? new Date(form.postingEndDate).getTime() - resolvedStartMs : 0;
    const votingDurationMs = isPost && form.postingEndDate && form.endDate
        ? new Date(form.endDate).getTime() - new Date(form.postingEndDate).getTime() : 0;

    // ── AI helpers ─────────────────────────────────────────────────────────
    const handleGenerateTagline = async () => {
        if (!form.title.trim()) { toast.error("Enter a title first"); return; }
        setTaglineLoading(true);
        try {
            const res = await generateTagline(form.title, form.description);
            if (res.success && res.tagline) set({ tagline: res.tagline });
            else toast.error(res.error || "Could not generate tagline");
        } finally {
            setTaglineLoading(false);
        }
    };

    const handleAiProposals = async () => {
        if (!form.title.trim()) { toast.error("Enter a title first"); return; }
        setProposalAiLoading(true);
        try {
            const res = await generateAiProposals({ title: form.title, description: form.description, category: "" });
            if (res.success && res.proposals) {
                set({
                    proposals: res.proposals.slice(0, 6).map((p, i) => ({
                        title: p.title,
                        order: i,
                    })),
                });
            } else {
                toast.error("Could not generate suggestions");
            }
        } finally {
            setProposalAiLoading(false);
        }
    };

    // ── Proposal helpers ──────────────────────────────────────────────────
    const addProposal = () => {
        if (form.proposals.length >= 10) return;
        set({ proposals: [...form.proposals, { title: "", order: form.proposals.length }] });
    };
    const removeProposal = (idx: number) => {
        if (form.proposals.length <= 2) return;
        set({ proposals: form.proposals.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i })) });
    };
    const updateProposal = (idx: number, title: string) => {
        set({ proposals: form.proposals.map((p, i) => i === idx ? { ...p, title } : p) });
    };
    const updateProposalMedia = (idx: number, file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const mediaPreview = e.target?.result as string;
            set({ proposals: form.proposals.map((p, i) => i === idx ? { ...p, media: file, mediaPreview } : p) });
        };
        reader.readAsDataURL(file);
    };
    const removeProposalMedia = (idx: number) => {
        set({ proposals: form.proposals.map((p, i) => i === idx ? { ...p, media: undefined, mediaPreview: undefined } : p) });
    };

    // ── Pintura handlers ───────────────────────────────────────────────────
    const handleEditSample = (idx: number) => {
        const sample = form.sampleImages[idx];
        if (!sample) return;
        setPinturaImageSrc(sample.preview);
        setPinturaEditTarget({ type: 'sample', idx });
        setPinturaOpen(true);
    };

    const handleEditProposal = (idx: number) => {
        const proposal = form.proposals[idx];
        if (!proposal?.mediaPreview || proposal.media?.type.startsWith('video/')) return;
        setPinturaImageSrc(proposal.mediaPreview);
        setPinturaEditTarget({ type: 'proposal', idx });
        setPinturaOpen(true);
    };

    const handlePinturaDone = async (editedFile: File, editedPreview: string) => {
        setPinturaOpen(false);
        if (!pinturaEditTarget) return;
        const { type, idx } = pinturaEditTarget;
        setPinturaImageSrc(null);
        setPinturaEditTarget(null);

        if (type === 'sample') {
            // Immediately update preview; re-upload in background
            set({ sampleImages: form.sampleImages.map((s, i) => i === idx ? { file: editedFile, preview: editedPreview } : s) });
            try {
                const { imageUrl: editedUrl } = await uploadToPinata(editedFile);
                void editedUrl; // captured for future use
                toast.success('Sample image updated');
            } catch (err: any) {
                toast.error(err?.message || 'Failed to upload edited sample');
            }
        } else {
            // Update proposal mediaPreview + media immediately
            set({ proposals: form.proposals.map((p, i) => i === idx ? { ...p, media: editedFile, mediaPreview: editedPreview } : p) });
            toast.success('Option image updated');
        }
    };

    const handlePinturaClose = () => {
        setPinturaOpen(false);
        setPinturaImageSrc(null);
        setPinturaEditTarget(null);
    };

    // ── Tag helpers ────────────────────────────────────────────────────────
    const addHashtag = () => {
        const tag = form.hashtagInput.replace(/^#/, "").trim();
        if (tag && form.hashtags.length < 10 && !form.hashtags.includes(tag)) {
            set({ hashtags: [...form.hashtags, tag], hashtagInput: "" });
        }
    };
    const addRegion = () => {
        const r = form.regionInput.trim();
        if (r && !form.regions.includes(r)) {
            set({ regions: [...form.regions, r], regionInput: "" });
        }
    };

    // ── Cover image ────────────────────────────────────────────────────────
    const handleCoverFile = (file: File) => {
        set({ coverImage: file });
        const reader = new FileReader();
        reader.onload = (e) => setCoverPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Validation per step ────────────────────────────────────────────────
    const validateStep = (idx: number): string | null => {
        switch (idx) {
            case 0:
                if (!form.title.trim()) return "Event title is required.";
                if (form.description.trim().length < 20) return "Description must be at least 20 characters.";
                if (!form.startImmediately && !form.startDate) return "Start date is required (or enable Start Immediately).";
                if (!form.endDate) return "End date is required.";
                if (isPost && !form.postingEndDate) return "Posting end / voting start date is required.";
                if (durationMs < 10 * 60 * 1000) return "Event must run for at least 10 minutes total.";
                if (isPost && form.postingEndDate) {
                    const pEndMs = new Date(form.postingEndDate).getTime();
                    if (pEndMs <= resolvedStartMs) return "Posting end must be after start.";
                    if (pEndMs >= new Date(form.endDate).getTime()) return "Voting end must be after posting end.";
                }
                return null;
            case 1:
                if (!form.maxParticipants || parseInt(form.maxParticipants) < 10) return "Minimum 10 participants required.";
                if (parseInt(form.maxParticipants) > 100_000) return "Maximum 100,000 participants allowed.";
                if (!form.topPrize || parseFloat(form.topPrize) < minTop) return `Top prize must be at least $${minTop.toFixed(2)} (= base pool).`;
                if (isPost && (!form.leaderboardPool || parseFloat(form.leaderboardPool) <= 0)) return "Leaderboard pool is required for post & vote events.";
                return null;
            case 4:
                if (isPost && form.sampleImages.length === 0) return "At least one sample image is required.";
                if (!isPost && form.proposals.filter(p => p.title.trim()).length < 2) return "At least 2 voting options are required.";
                return null;
            default:
                return null;
        }
    };

    const goNext = () => {
        const err = validateStep(currentStep);
        if (err) { toast.error(err); return; }
        setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

    // ── Render step content ────────────────────────────────────────────────
    const renderStep = () => {
        switch (currentStep) {
            // ─ Step 0: Basics ───────────────────────────────────────────────
            case 0: return (
                <div className="space-y-5">
                    <SectionCard title="Campaign Basics" subtitle="Tell us what your campaign is about">
                        {/* Event Type */}
                        <div>
                            <Label>Event Type</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {(["post", "vote"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => set({ type: t })}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-all",
                                            form.type === t
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/30"
                                        )}
                                    >
                                        <p className="font-bold text-sm text-foreground capitalize">
                                            {t === "post" ? "Social Post Campaign" : "Vote Campaign"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t === "post"
                                                ? "Creators submit content · Audience votes for best"
                                                : "Audience votes between fixed options you define"}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <Label>Campaign Title</Label>
                            <Input
                                placeholder="e.g. Summer Noodle Challenge"
                                value={form.title}
                                onChange={(e) => set({ title: e.target.value })}
                                maxLength={120}
                            />
                            <p className="text-xs text-muted-foreground mt-1">{form.title.length}/120</p>
                        </div>

                        {/* AI Tagline */}
                        <div>
                            <Label optional>Tagline</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="AI-generated tagline will appear here"
                                    value={form.tagline}
                                    onChange={(e) => set({ tagline: e.target.value })}
                                    className="flex-1"
                                />
                                <button
                                    onClick={handleGenerateTagline}
                                    disabled={taglineLoading || !form.title.trim()}
                                    className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                                >
                                    {taglineLoading
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Sparkles className="w-3.5 h-3.5" />}
                                    {form.tagline ? "Regenerate" : "Generate"}
                                </button>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Describe your campaign — what it's about, why creators should participate..."
                                value={form.description}
                                onChange={(e) => set({ description: e.target.value })}
                                rows={4}
                                maxLength={2000}
                            />
                            <p className="text-xs text-muted-foreground mt-1">{form.description.length}/2000</p>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Schedule"
                        subtitle={isPost
                            ? "Set distinct posting and voting phases for your campaign"
                            : "When does voting open and close?"}
                    >
                        {/* Start Immediately toggle */}
                        <button
                            type="button"
                            onClick={() => set({ startImmediately: !form.startImmediately })}
                            className={cn(
                                "flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all",
                                form.startImmediately
                                    ? "border-primary/50 bg-primary/10 text-primary"
                                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30"
                            )}
                        >
                            <Zap className={cn("w-4 h-4 shrink-0", form.startImmediately ? "text-primary" : "")} />
                            Start Event Immediately
                            <span className={cn(
                                "ml-auto w-4 h-4 rounded border-2 flex items-center justify-center",
                                form.startImmediately ? "border-primary bg-primary" : "border-muted-foreground"
                            )}>
                                {form.startImmediately && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground" />}
                            </span>
                        </button>

                        {isPost ? (
                            /* POST & VOTE: posting phase + voting phase */
                            <div className="space-y-5">
                                {/* Posting phase */}
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Posting Phase</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <Label>Submissions Open</Label>
                                            <Input
                                                type="datetime-local"
                                                value={form.startDate}
                                                disabled={form.startImmediately}
                                                className={form.startImmediately ? "opacity-40 cursor-not-allowed" : ""}
                                                onChange={(e) => set({ startDate: e.target.value })}
                                            />
                                            {form.startImmediately && <p className="text-xs text-primary mt-1">Starts now</p>}
                                        </div>
                                        <div>
                                            <Label>Submissions Close</Label>
                                            <Input
                                                type="datetime-local"
                                                value={form.postingEndDate}
                                                min={form.startImmediately ? undefined : form.startDate}
                                                onChange={(e) => set({ postingEndDate: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Voting begins here</p>
                                        </div>
                                        <div>
                                            <Label>Post Duration</Label>
                                            <div className={cn(
                                                "flex items-center h-[46px] px-4 rounded-xl border text-sm font-mono",
                                                postingDurationMs > 0 ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-secondary/20 text-muted-foreground"
                                            )}>
                                                {fmtDuration(postingDurationMs)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Voting phase */}
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Voting Phase</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <Label>Voting Opens</Label>
                                            <div className="flex items-center h-[46px] px-4 rounded-xl border border-border bg-secondary/20 text-sm text-muted-foreground">
                                                {form.postingEndDate
                                                    ? new Date(form.postingEndDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                                                    : "Set submissions close ↑"}
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Voting Closes</Label>
                                            <Input
                                                type="datetime-local"
                                                value={form.endDate}
                                                min={form.postingEndDate}
                                                onChange={(e) => set({ endDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Vote Duration</Label>
                                            <div className={cn(
                                                "flex items-center h-[46px] px-4 rounded-xl border text-sm font-mono",
                                                votingDurationMs > 0 ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-secondary/20 text-muted-foreground"
                                            )}>
                                                {fmtDuration(votingDurationMs)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {durationMs >= 10 * 60 * 1000 && (
                                    <p className="text-xs text-primary font-medium">Total campaign: {fmtDuration(durationMs)}</p>
                                )}
                            </div>
                        ) : (
                            /* VOTE ONLY: single start + end */
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label>Voting Start</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.startDate}
                                        disabled={form.startImmediately}
                                        className={form.startImmediately ? "opacity-40 cursor-not-allowed" : ""}
                                        onChange={(e) => set({ startDate: e.target.value })}
                                    />
                                    {form.startImmediately && <p className="text-xs text-primary mt-1">Starts now</p>}
                                </div>
                                <div>
                                    <Label>Voting End</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.endDate}
                                        min={form.startImmediately ? undefined : form.startDate}
                                        onChange={(e) => set({ endDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Duration</Label>
                                    <div className={cn(
                                        "flex items-center h-[46px] px-4 rounded-xl border text-sm font-mono",
                                        durationMs > 0 ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-secondary/20 text-muted-foreground"
                                    )}>
                                        {fmtDuration(durationMs)}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <Label optional>Timezone</Label>
                            <Select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })}>
                                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                            </Select>
                        </div>
                    </SectionCard>

                    <SectionCard title="Cover Image" subtitle="Visual identity for your campaign">
                        <div
                            onClick={() => coverInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f); }}
                            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                        >
                            {coverPreview ? (
                                <img src={coverPreview} alt="cover" className="w-full max-h-48 object-cover rounded-lg" />
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground text-center">Click or drag to upload cover image</p>
                                </>
                            )}
                        </div>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }} />
                    </SectionCard>
                </div>
            );

            // ─ Step 1: Rewards ──────────────────────────────────────────────
            case 1: return (
                <div className="space-y-5">
                    <SectionCard title="Participants & Budget" subtitle="Define capacity and reward pools">
                        <div>
                            <Label>Max Participants (Voters)</Label>
                            <Input
                                type="number"
                                min={10}
                                max={100000}
                                placeholder="e.g. 100"
                                value={form.maxParticipants}
                                onChange={(e) => set({ maxParticipants: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Minimum 10 · Maximum 100,000</p>
                        </div>

                        <div>
                            <Label>Top Prize Pool (USDC)</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                    type="number"
                                    min={minTop}
                                    step={0.01}
                                    placeholder={minTop > 0 ? minTop.toFixed(2) : "0.00"}
                                    value={form.topPrize}
                                    onChange={(e) => set({ topPrize: e.target.value })}
                                    className="pl-8"
                                />
                            </div>
                            {pCount > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Minimum: ${minTop.toFixed(2)} (= base pool)
                                </p>
                            )}
                        </div>

                        {isPost && (
                            <div>
                                <Label optional>Leaderboard Pool (USDC)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                        value={form.leaderboardPool}
                                        onChange={(e) => set({ leaderboardPool: e.target.value })}
                                        className="pl-8"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Distributed 50/35/15% to top 3 creators</p>
                            </div>
                        )}

                        {/* Refund Credit Integration */}
                        {availableCredit > 0 && (
                            <div className={cn(
                                "p-4 rounded-xl border transition-all",
                                form.useRefundCredit ? "bg-primary/5 border-primary/30" : "bg-secondary/20 border-border"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <RefreshCw className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Event Credit Available</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">From previously ended campaigns</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => set({ useRefundCredit: !form.useRefundCredit })}
                                        className={cn(
                                            "relative w-10 h-5 rounded-full transition-colors duration-200",
                                            form.useRefundCredit ? "bg-primary" : "bg-foreground/20"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200",
                                            form.useRefundCredit ? "translate-x-5.5" : "translate-x-0.5"
                                        )} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground font-medium">Current Balance</span>
                                    <span className="text-sm font-black text-primary font-mono">${availableCredit.toFixed(2)}</span>
                                </div>
                                {form.useRefundCredit && (
                                    <p className="text-[10px] text-primary/70 font-medium mt-2 leading-tight italic">
                                        This credit will be applied directly from the Rewards Vault. You only need to fund the remaining amount.
                                    </p>
                                )}
                            </div>
                        )}
                    </SectionCard>

                    {/* Reward Breakdown */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-sm font-bold mb-4 text-foreground">Reward Breakdown</h3>
                        <div className="divide-y divide-border">
                            <RewardRow label="Base Pool" rate={BASE_RATE} count={pCount} note="$0.030 per voter" />
                            <RewardRow label="Top Prize" count={pCount} note="Distributed to top voters" />
                            {isPost && <RewardRow label="Creator Reward" rate={CREATOR_RATE} count={pCount} note="$0.050 per creator" />}
                            {isPost && ldrNum > 0 && (
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm">Leaderboard Pool</span>
                                    <span className="text-sm font-mono font-bold">${ldrNum.toFixed(2)}</span>
                                </div>
                            )}
                            <RewardRow label="Platform Fee" rate={isPost ? FEE_POST : FEE_VOTE} count={pCount} note={isPost ? "$0.020/participant" : "$0.015/participant"} />
                        </div>
                        <div className="pt-3 mt-1 border-t border-border flex justify-between items-center text-xs text-muted-foreground mb-1">
                            <span>Total Rewards Budget</span>
                            <span className="font-mono font-medium">${totalLocked.toFixed(2)}</span>
                        </div>
                        {form.useRefundCredit && (
                            <div className="flex justify-between items-center text-xs text-primary mb-2">
                                <span>Applied Credit</span>
                                <span className="font-mono font-bold">-${form.refundCreditAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pt-1 flex justify-between items-center">
                            <span className="text-sm font-bold">Net Deposit Required</span>
                            <span className="text-lg font-black font-mono text-primary">
                                {pCount > 0 ? `$${Math.max(0, totalLocked - (form.useRefundCredit ? form.refundCreditAmount : 0)).toFixed(2)}` : "$—"}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Locked in RewardsVaultV3 on Polygon Amoy</p>
                    </div>

                    {/* Top prize distribution info */}
                    <div className="bg-secondary/30 border border-border rounded-2xl p-5 space-y-2">
                        <p className="text-xs font-semibold text-foreground mb-2">Top Prize Distribution</p>
                        {[["🥇 1st Place", "50%"], ["🥈 2nd Place", "35%"], ["🥉 3rd Place", "15%"]].map(([place, pct]) => (
                            <div key={place} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{place}</span>
                                <span className="font-mono font-bold">{pct}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

            // ─ Step 2: Audience ─────────────────────────────────────────────
            case 2: return (
                <SectionCard title="Target Audience" subtitle="Optional — helps match your campaign to the right participants">
                    <div>
                        <Label optional>Preferred Gender</Label>
                        <div className="flex flex-wrap gap-2">
                            {GENDERS.map((g) => (
                                <button key={g} onClick={() => set({ preferredGender: g })}
                                    className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                                        form.preferredGender === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                    )}>
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label optional>Age Group</Label>
                        <div className="flex flex-wrap gap-2">
                            {AGE_GROUPS.map((a) => (
                                <button key={a} onClick={() => set({ ageGroup: a })}
                                    className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                                        form.ageGroup === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                    )}>
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label optional>Regions</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. South Asia, Nigeria, Brazil…"
                                value={form.regionInput}
                                onChange={(e) => set({ regionInput: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }}
                                className="flex-1"
                            />
                            <button onClick={addRegion}
                                className="shrink-0 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-semibold hover:bg-secondary/70 transition-all">
                                Add
                            </button>
                        </div>
                        {form.regions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {form.regions.map((r) => (
                                    <span key={r} className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-xs font-medium">
                                        <Globe className="w-3 h-3 text-muted-foreground" />{r}
                                        <button onClick={() => set({ regions: form.regions.filter((x) => x !== r) })}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </SectionCard>
            );

            // ─ Step 3: Instructions ─────────────────────────────────────────
            case 3: return (
                <SectionCard title="Participation Instructions" subtitle="How should participants engage with your campaign?">
                    <Textarea
                        placeholder={`e.g.\n• Vote for the design that best represents summer.\n• Only one vote per account is allowed.\n• Voting closes when capacity is reached.`}
                        value={form.participantInstructions}
                        onChange={(e) => set({ participantInstructions: e.target.value })}
                        rows={8}
                        maxLength={1000}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Be clear and concise — participants will read this before engaging.</span>
                        <span>{form.participantInstructions.length}/1000</span>
                    </div>
                </SectionCard>
            );

            // ─ Step 4: Content Setup ────────────────────────────────────────
            case 4: return isPost ? (
                <div className="space-y-5">
                    <SectionCard title="Submission Guidelines" subtitle="Tell creators exactly what to submit">
                        <Textarea
                            placeholder={`e.g.\n• Upload a photo of your best recipe using our product.\n• Include a caption describing the dish.\n• Must be original content.`}
                            value={form.submissionGuidelines}
                            onChange={(e) => set({ submissionGuidelines: e.target.value })}
                            rows={6}
                            maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground text-right">{form.submissionGuidelines.length}/1000</p>
                    </SectionCard>

                    <SectionCard title="Accepted Content Types" subtitle="What formats can creators submit?">
                        <div className="flex flex-wrap gap-2">
                            {CONTENT_TYPES.map((ct) => (
                                <button key={ct}
                                    onClick={() => {
                                        const updated = form.contentType.includes(ct)
                                            ? form.contentType.filter((c) => c !== ct)
                                            : [...form.contentType, ct];
                                        set({ contentType: updated });
                                    }}
                                    className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                                        form.contentType.includes(ct)
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/30"
                                    )}>
                                    {ct}
                                </button>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard title="Sample Images" subtitle="Provide 1-10 samples to guide creators">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {form.sampleImages.map((sample, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                                    <img
                                        src={sample.preview}
                                        alt={`Sample ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Hover overlay: Edit + Remove */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleEditSample(idx)}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/70 border border-white/20 text-[10px] font-black text-white uppercase tracking-widest hover:bg-primary/20 hover:border-primary/50 transition-all backdrop-blur-sm"
                                        >
                                            <Pencil className="w-2.5 h-2.5" />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => set({ sampleImages: form.sampleImages.filter((_, i) => i !== idx) })}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/70 border border-white/20 text-[10px] font-black text-white/60 uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all backdrop-blur-sm"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {form.sampleImages.length < 10 && (
                                sampleAddMode ? (
                                    <div className="flex flex-col gap-2 aspect-square rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 items-center justify-center">
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Add Sample</span>
                                        <button
                                            onClick={() => { setSampleAddMode(false); setAiGeneratorSampleOpen(true); }}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 border border-primary/30 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/25 transition-all"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Generate
                                        </button>
                                        <label className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/8 hover:text-white/60 transition-all cursor-pointer">
                                            <Upload className="w-3 h-3" />
                                            Upload
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                multiple
                                                onChange={(e) => {
                                                    setSampleAddMode(false);
                                                    const files = Array.from(e.target.files || []);
                                                    const newSamples = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                                                    const total = form.sampleImages.length + newSamples.length;
                                                    if (total > 10) {
                                                        toast.error("Maximum 10 samples allowed");
                                                        set({ sampleImages: [...form.sampleImages, ...newSamples.slice(0, 10 - form.sampleImages.length)] });
                                                    } else {
                                                        set({ sampleImages: [...form.sampleImages, ...newSamples] });
                                                    }
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={() => setSampleAddMode(false)}
                                            className="text-[9px] text-white/20 hover:text-white/40 transition-colors mt-0.5"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSampleAddMode(true)}
                                        className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all w-full"
                                    >
                                        <Plus className="w-5 h-5 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground mt-1">Add Sample</span>
                                    </button>
                                )
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Minimum 1 · Maximum 10 images</p>
                    </SectionCard>
                </div>
            ) : (
                <SectionCard
                    title="Voting Options"
                    subtitle={`Define what participants vote for · ${form.proposals.length}/10 options`}
                >
                    <div className="flex justify-end mb-1">
                        <button
                            onClick={handleAiProposals}
                            disabled={proposalAiLoading || !form.title.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        >
                            {proposalAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI Suggestions
                        </button>
                    </div>

                    <div className="space-y-4">
                        {form.proposals.map((p, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-4 border border-border rounded-xl bg-secondary/20">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 text-xs text-muted-foreground font-mono shrink-0 text-center">{idx + 1}</span>
                                    <Input
                                        placeholder={`Option ${idx + 1}`}
                                        value={p.title}
                                        onChange={(e) => updateProposal(idx, e.target.value)}
                                        className="flex-1"
                                    />
                                    {form.proposals.length > 2 && (
                                        <button onClick={() => removeProposal(idx)} className="shrink-0 p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <Minus className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                                        </button>
                                    )}
                                </div>

                                {/* Media Upload Area */}
                                <div className="pl-8 pr-10">
                                    {p.mediaPreview ? (
                                        <div className="relative inline-block mt-2 group">
                                            {p.media?.type.startsWith('video/') ? (
                                                <video src={p.mediaPreview} className="h-20 max-w-[12rem] rounded-md object-cover border border-border" controls />
                                            ) : (
                                                <>
                                                    <img src={p.mediaPreview} alt={`Option ${idx + 1} preview`} className="h-20 max-w-[12rem] rounded-md object-cover border border-border" />
                                                    {/* Edit overlay for images */}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditProposal(idx)}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 border border-white/20 text-[10px] font-black text-white uppercase tracking-widest hover:bg-primary/20 hover:border-primary/50 transition-all"
                                                        >
                                                            <Pencil className="w-2.5 h-2.5" />
                                                            Edit
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                            <button
                                                onClick={() => removeProposalMedia(idx)}
                                                className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {/* Generate with AI */}
                                            <button
                                                type="button"
                                                onClick={() => setAiGeneratorProposalIdx(idx)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-xs font-semibold text-primary transition-colors"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Generate
                                            </button>
                                            {/* Upload photo/video */}
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/40 hover:bg-secondary border border-border rounded-lg text-xs font-medium cursor-pointer transition-colors text-muted-foreground hover:text-foreground">
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Upload</span>
                                                <input
                                                    type="file"
                                                    accept="image/*,video/*"
                                                    className="hidden"
                                                    onChange={(e) => updateProposalMedia(idx, e.target.files?.[0])}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {form.proposals.length < 10 && (
                        <button onClick={addProposal}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
                            <Plus className="w-4 h-4" /> Add option
                        </button>
                    )}
                    <p className="text-xs text-muted-foreground">Minimum 2 · Maximum 10 options</p>
                </SectionCard>
            );

            // ─ Step 5: Moderation ───────────────────────────────────────────
            case 5: return (
                <SectionCard title="Moderation Rules" subtitle="Community guidelines for your campaign">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {MODERATION_CHIPS.map((chip) => (
                            <button key={chip}
                                onClick={() => {
                                    const current = form.moderationRules;
                                    const hasChip = current.includes(chip);
                                    if (!hasChip) {
                                        set({ moderationRules: current ? `${current}\n• ${chip}` : `• ${chip}` });
                                    }
                                }}
                                className="px-3 py-1.5 bg-secondary/60 border border-border rounded-full text-xs hover:border-primary/40 hover:bg-primary/5 transition-all">
                                + {chip}
                            </button>
                        ))}
                    </div>
                    <Textarea
                        placeholder={`e.g.\n• No copyrighted material\n• Original content only\n• No offensive content`}
                        value={form.moderationRules}
                        onChange={(e) => set({ moderationRules: e.target.value })}
                        rows={6}
                        maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">{form.moderationRules.length}/500</p>
                </SectionCard>
            );

            // ─ Step 6: Hashtags ─────────────────────────────────────────────
            case 6: return (
                <SectionCard title="Hashtags" subtitle="Help users discover your campaign">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span>
                            <Input
                                placeholder="e.g. summerfood"
                                value={form.hashtagInput}
                                onChange={(e) => set({ hashtagInput: e.target.value.replace(/^#/, "") })}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
                                className="pl-7"
                            />
                        </div>
                        <button onClick={addHashtag}
                            className="shrink-0 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-semibold hover:bg-secondary/70 transition-all">
                            Add
                        </button>
                    </div>

                    {/* Title word quick-add */}
                    {form.title && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground self-center">Quick add:</span>
                            {form.title.split(/\s+/).filter(w => w.length > 3).slice(0, 5).map((w) => {
                                const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
                                return clean && !form.hashtags.includes(clean) ? (
                                    <button key={clean} onClick={() => set({ hashtags: [...form.hashtags, clean] })}
                                        className="px-2.5 py-1 bg-secondary/60 border border-dashed border-border rounded-full text-xs hover:border-primary/40 transition-all">
                                        #{clean}
                                    </button>
                                ) : null;
                            })}
                        </div>
                    )}

                    {form.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {form.hashtags.map((tag) => (
                                <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-primary">
                                    #{tag}
                                    <button onClick={() => set({ hashtags: form.hashtags.filter((t) => t !== tag) })}>
                                        <X className="w-3 h-3 hover:text-primary/70" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">{form.hashtags.length}/10 hashtags added</p>
                </SectionCard>
            );

            // ─ Step 7: Review ───────────────────────────────────────────────
            case 7: return (
                <div className="space-y-5">
                    <SectionCard title="Campaign Summary" subtitle="Review everything before launching">
                        <div className="space-y-3">
                            {[
                                ["Type", form.type === "post" ? "Social Post Campaign" : "Vote Campaign"],
                                ["Title", form.title],
                                form.tagline ? ["Tagline", form.tagline] : null,
                                ["Duration", fmtDuration(durationMs)],
                                ["Participants", form.maxParticipants || "—"],
                                form.preferredGender !== "All" ? ["Audience", `${form.preferredGender}, ${form.ageGroup}`] : null,
                                form.regions.length > 0 ? ["Regions", form.regions.join(", ")] : null,
                                (form.hashtags && form.hashtags.length > 0) ? ["Hashtags", form.hashtags.map(h => `#${h}`).join(" ")] : null,
                            ].filter(Boolean).map((item) => {
                                const [k, v] = item as [string, string | number];
                                return (
                                    <div key={k} className="flex justify-between gap-4 text-sm">
                                        <span className="text-muted-foreground shrink-0">{k}</span>
                                        <span className="font-medium text-right truncate max-w-[240px]">{v}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>

                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                        <h3 className="text-sm font-bold mb-4">Reward Pool</h3>
                        <div className="space-y-2">
                            {[
                                ["Base Pool", `$${basePool.toFixed(2)}`],
                                ["Top Prize", `$${effectiveTop.toFixed(2)}`],
                                ...(isPost ? [["Creator Pool", `$${creatorPool.toFixed(2)}`]] : []),
                                ...(isPost && ldrNum > 0 ? [["Leaderboard", `$${ldrNum.toFixed(2)}`]] : []),
                                ["Platform Fee", `$${platformFee.toFixed(2)}`],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{k}</span>
                                    <span className="font-mono font-medium">{v}</span>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-primary/20 flex justify-between">
                                <span className="font-bold text-sm">Total Locked</span>
                                <span className="font-black font-mono text-primary text-base">${totalLocked.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {!isPost && form.proposals.filter(p => p.title.trim()).length > 0 && (
                        <SectionCard title="Voting Options">
                            <div className="space-y-2">
                                {form.proposals.filter(p => p.title.trim()).map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="w-5 h-5 rounded-full bg-secondary text-xs flex items-center justify-center shrink-0 font-mono">{i + 1}</span>
                                        <span>{p.title}</span>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            Clicking <strong>Launch Campaign</strong> will open a transaction modal. Your smart account will approve USDC and lock the reward pool on-chain — gasless via Privy on Polygon Amoy.
                        </p>
                    </div>
                </div>
            );

            default: return null;
        }
    };

    // ── Sticky Summary Sidebar ─────────────────────────────────────────────
    const SummarySidebar = () => (
        <div className="space-y-4">
            {/* Wallet info */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Wallet</p>
                    <button
                        onClick={refreshBalance}
                        className="p-1 hover:bg-secondary rounded-lg transition-colors"
                        title="Refresh balance"
                    >
                        <RefreshCw className="w-3 h-3 text-muted-foreground" />
                    </button>
                </div>
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Smart Account</span>
                        <button
                            onClick={copyAddress}
                            disabled={!address}
                            className="flex items-center gap-1.5 font-mono font-medium text-foreground hover:text-primary transition-colors disabled:cursor-default group"
                            title={address ?? undefined}
                        >
                            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—"}
                            {address && (
                                addressCopied
                                    ? <Check className="w-3 h-3 text-green-500" />
                                    : <Copy className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                        </button>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">USDC Balance</span>
                        <span className="font-mono font-bold text-primary">${balance}</span>
                    </div>
                    {availableCredit > 0 && (
                        <div className="flex justify-between text-xs pt-1 border-t border-border">
                            <span className="text-muted-foreground">Refund Credit</span>
                            <span className="font-mono font-bold text-green-500">+${availableCredit.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Campaign Summary</p>
                <div className="space-y-2.5">
                    {[
                        ["Type", form.type === "post" ? "Social Post" : "Vote"],
                        ["Participants", form.maxParticipants || "—"],
                        ["Duration", fmtDuration(durationMs)],
                        ["Total Locked", pCount > 0 ? `$${totalLocked.toFixed(2)}` : "—"],
                        ["Network", "Polygon Amoy"],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className={cn("font-medium", k === "Total Locked" && pCount > 0 && "text-primary font-bold")}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step progress */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Progress</p>
                <div className="space-y-2">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className={cn("flex items-center gap-2.5 text-xs",
                            i < currentStep ? "text-primary" : i === currentStep ? "text-foreground font-semibold" : "text-muted-foreground/50"
                        )}>
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                                i < currentStep ? "bg-primary text-primary-foreground" : i === currentStep ? "bg-primary/20 text-primary" : "bg-secondary"
                            )}>
                                {i < currentStep ? "✓" : i + 1}
                            </div>
                            {s.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Build LaunchFormData ───────────────────────────────────────────────
    const launchData: LaunchFormData = {
        ...form,
        proposals: form.proposals.filter(p => p.title.trim()),
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/brand/dashboard" className="p-2 hover:bg-secondary rounded-xl transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-black">Create Campaign</h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep].label}
                            </p>
                        </div>
                    </div>

                    {/* Step pills (desktop) */}
                    <div className="hidden lg:flex items-center gap-1">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary w-6" : "bg-border"
                            )} />
                        ))}
                    </div>

                    {/* Progress bar (mobile) */}
                    <div className="lg:hidden flex-1 max-w-[120px]">
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
                    {/* Step content */}
                    <div>
                        {renderStep()}

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                            <button
                                onClick={goBack}
                                disabled={currentStep === 0}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>

                            {currentStep < STEPS.length - 1 ? (
                                <button
                                    onClick={goNext}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        const err = validateStep(0) || validateStep(1) || validateStep(4);
                                        if (err) { toast.error(err); return; }
                                        setModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                                >
                                    Launch Campaign <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sticky sidebar */}
                    <div className="hidden lg:block sticky top-[65px]">
                        <SummarySidebar />
                    </div>
                </div>
            </div>

            <LaunchStepModal
                open={modalOpen}
                form={launchData}
                onClose={() => setModalOpen(false)}
                onSuccess={() => router.push("/brand/dashboard")}
            />

            {/* Brand AI Image Generator for voting options */}
            <BrandImageGeneratorModal
                isOpen={aiGeneratorProposalIdx !== null}
                onClose={() => setAiGeneratorProposalIdx(null)}
                onAddToOption={(file, preview) => {
                    if (aiGeneratorProposalIdx === null) return;
                    set({
                        proposals: form.proposals.map((p, i) =>
                            i === aiGeneratorProposalIdx
                                ? { ...p, media: file, mediaPreview: preview }
                                : p
                        ),
                    });
                    setAiGeneratorProposalIdx(null);
                }}
                brandId={user?.id ?? ""}
                eventTitle={form.title}
                eventDescription={form.description}
                optionLabel={aiGeneratorProposalIdx !== null ? `Option ${aiGeneratorProposalIdx + 1}` : undefined}
            />

            {/* Brand AI Image Generator for sample images */}
            <BrandImageGeneratorModal
                isOpen={aiGeneratorSampleOpen}
                onClose={() => setAiGeneratorSampleOpen(false)}
                onAddToOption={(file, preview) => {
                    if (form.sampleImages.length >= 10) {
                        toast.error("Maximum 10 samples allowed");
                        return;
                    }
                    set({ sampleImages: [...form.sampleImages, { file, preview: preview ?? URL.createObjectURL(file) }] });
                    setAiGeneratorSampleOpen(false);
                }}
                brandId={user?.id ?? ""}
                eventTitle={form.title}
                eventDescription={form.description}
                optionLabel="Sample Image"
            />

            {/* Pintura image editor — for editing sample and proposal images */}
            {pinturaImageSrc && (
                <PinturaImageEditor
                    isOpen={pinturaOpen}
                    imageSrc={pinturaImageSrc}
                    onDone={handlePinturaDone}
                    onClose={handlePinturaClose}
                />
            )}
        </div>
    );
}
