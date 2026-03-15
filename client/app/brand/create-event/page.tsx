"use client";

import { useState, useRef, useCallback } from "react";
import {
    ChevronLeft, ChevronRight, Info, Rocket, Sparkles, Loader2, X, Plus, Minus,
    Upload, Users, DollarSign, Globe, FileText, Shield, Hash,
    CheckCircle2, ImageIcon, RefreshCw, Zap, Copy, Check, Pencil,
    Tag, Trophy, Clock, ShieldCheck, ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

const FORM_QUESTIONS = [
    { id: "type", title: "What type of campaign is this?", guideline: "Social Post campaigns let creators submit content. Vote campaigns are fixed options you define." },
    { id: "title", title: "Give your campaign a title", guideline: "Keep it catchy. You can also generate an AI tagline." },
    { id: "description", title: "Describe your campaign", guideline: "Explain what it is about and why people should participate." },
    { id: "schedule", title: "When does it happen?", guideline: "Set the start and end dates. Post campaigns need a distinct posting phase." },
    { id: "cover", title: "Upload a cover image", guideline: "This is the primary visual identity of your campaign." },
    { id: "rewards", title: "Set your budget & limits", guideline: "Define the maximum number of participants and the prize pool." },
    { id: "audience", title: "Who is your target audience?", guideline: "Optional: specify gender, age groups, and regions." },
    { id: "instructions", title: "Participation Instructions", guideline: "Clear rules for how users should engage." },
    { id: "content", title: "Content Setup", guideline: "Provide options to vote on, or sample images to guide creators." },
    { id: "moderation", title: "Moderation & Discoverability", guideline: "Set community rules and hashtags for the campaign." },
    { id: "review", title: "Review & Launch", guideline: "Check your settings before deploying to the blockchain." }
];

type StepId = string;

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
    const [direction, setDirection] = useState(1);
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
            .catch(() => { });
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
            case 0: return null;
            case 1:
                if (!form.title.trim()) return "Event title is required.";
                return null;
            case 2:
                if (form.description.trim().length < 20) return "Description must be at least 20 characters.";
                return null;
            case 3:
                if (!form.startImmediately && !form.startDate) return "Start date is required.";
                if (!form.endDate) return "End date is required.";
                if (isPost && !form.postingEndDate) return "Posting end / voting start date is required.";
                if (durationMs < 10 * 60 * 1000) return "Event must run for at least 10 minutes total.";
                if (isPost && form.postingEndDate) {
                    const pEndMs = new Date(form.postingEndDate).getTime();
                    if (pEndMs <= resolvedStartMs) return "Posting end must be after start.";
                    if (pEndMs >= new Date(form.endDate).getTime()) return "Voting end must be after posting end.";
                }
                return null;
            case 4: return null;
            case 5:
                if (!form.maxParticipants || parseInt(form.maxParticipants) < 10) return "Minimum 10 participants required.";
                if (parseInt(form.maxParticipants) > 100_000) return "Maximum 100,000 participants allowed.";
                if (!form.topPrize || parseFloat(form.topPrize) < minTop) return `Top prize must be at least $${minTop.toFixed(2)}.`;
                if (isPost && (!form.leaderboardPool || parseFloat(form.leaderboardPool) <= 0)) return "Leaderboard pool is required.";
                return null;
            case 6: return null;
            case 7: return null;
            case 8:
                if (isPost && form.sampleImages.length === 0) return "At least one sample image is required.";
                if (!isPost && form.proposals.filter(p => p.title.trim()).length < 2) return "At least 2 voting options are required.";
                return null;
            case 9: return null;
            default:
                return null;
        }
    };

    const goNext = () => {
        const err = validateStep(currentStep);
        if (err) { toast.error(err); return; }
        setDirection(1);
        setCurrentStep((s) => Math.min(s + 1, FORM_QUESTIONS.length - 1));
    };

    const goBack = () => {
        setDirection(-1);
        setCurrentStep((s) => Math.max(s - 1, 0));
    };

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir < 0 ? 1000 : -1000, opacity: 0 }),
    };

    const renderQuestionFields = () => {
        switch (currentStep) {
            case 0: // Type
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(["post", "vote"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => { set({ type: t }); setTimeout(goNext, 300); }}
                                className={cn(
                                    "p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 hover:shadow-lg",
                                    form.type === t
                                        ? "border-primary bg-primary/10"
                                        : "border-border bg-secondary/40 hover:border-primary/50"
                                )}
                            >
                                <p className="font-black text-xl text-foreground capitalize mb-2">
                                    {t === "post" ? "Social Post Campaign" : "Vote Campaign"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t === "post"
                                        ? "Creators submit content · Audience votes for the best"
                                        : "Audience votes between fixed options you define"}
                                </p>
                            </button>
                        ))}
                    </div>
                );
            case 1: // Title
                return (
                    <div className="space-y-6">
                        <Input
                            autoFocus
                            placeholder="e.g. Summer Noodle Challenge"
                            value={form.title}
                            onChange={(e) => set({ title: e.target.value })}
                            maxLength={120}
                            className="text-2xl p-6 font-medium"
                            onKeyDown={(e) => { if (e.key === "Enter" && form.title.trim()) goNext(); }}
                        />
                        <div className="flex flex-col gap-2">
                            <Label optional>Optional Tagline</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="AI-generated tagline"
                                    value={form.tagline}
                                    onChange={(e) => set({ tagline: e.target.value })}
                                    className="flex-1"
                                />
                                <button
                                    onClick={handleGenerateTagline}
                                    disabled={taglineLoading || !form.title.trim()}
                                    className="shrink-0 flex items-center gap-2 px-6 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {taglineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {form.tagline ? "Regenerate" : "Generate"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 2: // Description
                return (
                    <div>
                        <Textarea
                            autoFocus
                            placeholder="Describe your campaign — what it's about, why creators should participate..."
                            value={form.description}
                            onChange={(e) => set({ description: e.target.value })}
                            rows={6}
                            maxLength={2000}
                            className="text-lg p-6"
                        />
                        <p className="text-xs text-muted-foreground mt-2 text-right">{form.description.length}/2000</p>
                    </div>
                );
            case 3: // Schedule
                return (
                    <div className="space-y-6">
                        <button
                            type="button"
                            onClick={() => set({ startImmediately: !form.startImmediately })}
                            className={cn(
                                "flex items-center gap-3 w-full p-4 rounded-xl border text-sm font-semibold transition-all hover:shadow-md",
                                form.startImmediately
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border bg-secondary/40 text-muted-foreground hover:border-accent/50"
                            )}
                        >
                            <Zap className={cn("w-5 h-5 shrink-0", form.startImmediately ? "text-accent" : "")} />
                            Start Event Immediately
                            <span className={cn(
                                "ml-auto w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                form.startImmediately ? "border-accent bg-accent" : "border-muted-foreground"
                            )}>
                                {form.startImmediately && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </span>
                        </button>
                        {isPost ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-xl border border-border">
                                    <div>
                                        <Label>Submissions Open</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.startDate}
                                            disabled={form.startImmediately}
                                            className={form.startImmediately ? "opacity-40 cursor-not-allowed" : ""}
                                            onChange={(e) => set({ startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Submissions Close</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.postingEndDate}
                                            min={form.startImmediately ? undefined : form.startDate}
                                            onChange={(e) => set({ postingEndDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-xl border border-border">
                                    <div>
                                        <Label>Voting Opens</Label>
                                        <div className="flex items-center h-[50px] px-4 rounded-xl border border-border bg-secondary/40 text-muted-foreground">
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
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-xl border border-border">
                                <div>
                                    <Label>Voting Start</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.startDate}
                                        disabled={form.startImmediately}
                                        className={form.startImmediately ? "opacity-40 cursor-not-allowed" : ""}
                                        onChange={(e) => set({ startDate: e.target.value })}
                                    />
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
                            </div>
                        )}
                        <div>
                            <Label optional>Timezone</Label>
                            <Select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })}>
                                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                            </Select>
                        </div>
                    </div>
                );
            case 4: // Cover Image
                return (
                    <div
                        onClick={() => coverInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f); }}
                        className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all w-full h-80"
                    >
                        {coverPreview ? (
                            <img src={coverPreview} alt="cover" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <>
                                <Upload className="w-12 h-12 text-muted-foreground transition-all group-hover:text-primary" />
                                <p className="text-lg font-medium text-muted-foreground text-center">Click or drag to upload cover image</p>
                            </>
                        )}
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }} />
                    </div>
                );
            case 5: // Rewards
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <Label>Max Participants (Voters)</Label>
                                <Input
                                    type="number" min={10} max={100000} placeholder="e.g. 100"
                                    value={form.maxParticipants}
                                    onChange={(e) => set({ maxParticipants: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-2">Required min 10</p>
                            </div>
                            <div>
                                <Label>Top Prize Pool (USDC)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        type="number" min={minTop} step={0.01}
                                        placeholder={minTop > 0 ? minTop.toFixed(2) : "0.00"}
                                        value={form.topPrize}
                                        onChange={(e) => set({ topPrize: e.target.value })}
                                        className="pl-8"
                                    />
                                </div>
                                {pCount > 0 && <p className="text-xs text-muted-foreground mt-2">Min: ${minTop.toFixed(2)}</p>}
                            </div>
                        </div>
                        {isPost && (
                            <div>
                                <Label optional>Leaderboard Pool (USDC)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        type="number" min={0} step={0.01} placeholder="0.00"
                                        value={form.leaderboardPool}
                                        onChange={(e) => set({ leaderboardPool: e.target.value })}
                                        className="pl-8"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Top 3 creators split this pool</p>
                            </div>
                        )}
                        {/* Refund Credit */}
                        {availableCredit > 0 && (
                            <div className={cn("p-5 rounded-2xl border transition-all mt-4", form.useRefundCredit ? "bg-primary/10 border-primary" : "bg-secondary/40 border-border")}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <RefreshCw className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="font-bold text-foreground">Apply Event Credit?</p>
                                            <p className="text-sm font-medium text-muted-foreground">From previously ended apps</p>
                                        </div>
                                    </div>
                                    <button onClick={() => set({ useRefundCredit: !form.useRefundCredit })} className={cn("relative w-12 h-6 rounded-full transition-colors", form.useRefundCredit ? "bg-primary" : "bg-foreground/20")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform", form.useRefundCredit ? "translate-x-7" : "translate-x-1")} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {pCount > 0 && (
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold">Total Net Deposit Required</span>
                                    <span className="text-2xl font-black font-mono text-primary">${Math.max(0, totalLocked - (form.useRefundCredit ? form.refundCreditAmount : 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 6: // Audience
                return (
                    <div className="space-y-6">
                        <div>
                            <Label optional>Preferred Gender</Label>
                            <div className="flex flex-wrap gap-2">
                                {GENDERS.map((g) => (
                                    <button key={g} onClick={() => set({ preferredGender: g })}
                                        className={cn("px-5 py-2.5 rounded-full text-sm font-semibold border transition-all hover:shadow-md",
                                            form.preferredGender === g ? "border-accent bg-accent/20 text-accent" : "border-border text-muted-foreground hover:border-accent/50 hover:text-accent"
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
                                        className={cn("px-5 py-2.5 rounded-full text-sm font-semibold border transition-all hover:shadow-md",
                                            form.ageGroup === a ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"
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
                                    placeholder="e.g. South Asia, Brazil…"
                                    value={form.regionInput}
                                    onChange={(e) => set({ regionInput: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }}
                                />
                                <button onClick={addRegion} className="px-6 bg-secondary border border-border rounded-xl font-bold hover:bg-secondary/70 transition-all text-sm">Add</button>
                            </div>
                            {form.regions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {form.regions.map((r) => (
                                        <span key={r} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm font-semibold shadow-sm">
                                            <Globe className="w-4 h-4 text-muted-foreground" /> {r}
                                            <button onClick={() => set({ regions: form.regions.filter((x) => x !== r) })}><X className="w-4 h-4 hover:text-red-500 transition-colors" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 7: // Instructions
                return (
                    <div>
                        <Textarea
                            autoFocus
                            placeholder="e.g. Vote for the design that best represents summer. Only one vote per account is allowed."
                            value={form.participantInstructions}
                            onChange={(e) => set({ participantInstructions: e.target.value })}
                            rows={8} maxLength={1000} className="text-lg p-6"
                        />
                        <div className="flex justify-end text-xs text-muted-foreground mt-2">
                            <span>{form.participantInstructions.length}/1000</span>
                        </div>
                    </div>
                );
            case 8: // Content (Post Guidelines / Vote Options)
                return isPost ? (
                    <div className="space-y-6">
                        <Textarea
                            placeholder="e.g. Upload a photo of your best recipe using our product. Include a caption."
                            value={form.submissionGuidelines}
                            onChange={(e) => set({ submissionGuidelines: e.target.value })}
                            rows={4} maxLength={1000}
                        />
                        <div>
                            <Label>Accepted Formats</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {CONTENT_TYPES.map((ct) => (
                                    <button key={ct} onClick={() => {
                                        const updated = form.contentType.includes(ct) ? form.contentType.filter((c) => c !== ct) : [...form.contentType, ct];
                                        set({ contentType: updated });
                                    }}
                                        className={cn("px-4 py-2 rounded-lg text-sm font-semibold border transition-all",
                                            form.contentType.includes(ct) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                                        )}>{ct}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>Sample Images (Up to 10)</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {form.sampleImages.map((sample, idx) => (
                                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden group border border-border">
                                        <img src={sample.preview} alt={`Sample ${idx}`} className="w-full h-full object-cover" />
                                        <button onClick={() => set({ sampleImages: form.sampleImages.filter((_, i) => i !== idx) })} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                                {form.sampleImages.length < 10 && (
                                    <label className="w-24 h-24 flex items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-all">
                                        <Plus className="w-6 h-6 text-muted-foreground" />
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            const newSamples = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                                            set({ sampleImages: [...form.sampleImages, ...newSamples].slice(0, 10) });
                                        }} multiple />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="flex justify-end mb-1">
                            <button
                                onClick={handleAiProposals}
                                disabled={proposalAiLoading || !form.title.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {proposalAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                AI Suggestions
                            </button>
                        </div>
                        {form.proposals.map((p, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-border rounded-xl bg-secondary/10">
                                <Input
                                    placeholder={`Option ${idx + 1}`}
                                    value={p.title}
                                    onChange={(e) => updateProposal(idx, e.target.value)}
                                    className="flex-1"
                                />
                                {p.mediaPreview ? (
                                    <div className="relative group shrink-0">
                                        <img src={p.mediaPreview} alt={`Preview`} className="w-16 h-16 rounded-lg object-cover border border-border" />
                                        <button onClick={() => removeProposalMedia(idx)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : (
                                    <div className="shrink-0 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAiGeneratorProposalIdx(idx)}
                                            className="flex items-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl font-semibold transition-all text-sm"
                                        >
                                            <Sparkles className="w-4 h-4" /> Generate
                                        </button>
                                        <label className="flex items-center gap-2 px-4 py-3 bg-secondary border border-border rounded-xl font-semibold cursor-pointer hover:bg-secondary/70 transition-all text-sm">
                                            <Upload className="w-4 h-4" /> Media
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => updateProposalMedia(idx, e.target.files?.[0])} />
                                        </label>
                                    </div>
                                )}
                                {form.proposals.length > 2 && (
                                    <button onClick={() => removeProposal(idx)} className="shrink-0 p-3 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-xl transition-colors"><Minus className="w-5 h-5" /></button>
                                )}
                            </div>
                        ))}
                        {form.proposals.length < 10 && (
                            <button onClick={addProposal} className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
                                <Plus className="w-5 h-5" /> Add Option
                            </button>
                        )}
                    </div>
                );
            case 9: // Moderation
                return (
                    <div className="space-y-6">
                        <div>
                            <Label>Moderation Rules</Label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {MODERATION_CHIPS.map((chip) => (
                                    <button key={chip} onClick={() => {
                                        const cur = form.moderationRules;
                                        if (!cur.includes(chip)) set({ moderationRules: cur ? `${cur}\n• ${chip}` : `• ${chip}` });
                                    }} className="px-4 py-2 bg-secondary/60 border border-border rounded-full text-xs font-semibold hover:border-primary/50 transition-all">+ {chip}</button>
                                ))}
                            </div>
                            <Textarea value={form.moderationRules} onChange={(e) => set({ moderationRules: e.target.value })} rows={5} />
                        </div>
                        <div>
                            <Label>Hashtags</Label>
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                                    <Input value={form.hashtagInput} onChange={(e) => set({ hashtagInput: e.target.value.replace(/^#/, "") })} onKeyDown={(e) => { if (e.key === "Enter") addHashtag(); }} className="pl-8" />
                                </div>
                                <button onClick={addHashtag} className="px-6 bg-secondary border border-border rounded-xl font-bold hover:bg-secondary/70">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {form.hashtags.map((tag) => (
                                    <span key={tag} className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-semibold text-primary">
                                        #{tag} <button onClick={() => set({ hashtags: form.hashtags.filter((t) => t !== tag) })}><X className="w-4 h-4 hover:text-red-500" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 10: // Review
                const userPerspectiveCover = coverPreview || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop";
                return (
                    <div className="flex flex-col lg:flex-row gap-6 w-full text-left">
                        {/* ── Left column (User View) ── */}
                        <div className="flex-1 min-w-0" onClick={() => setCurrentStep(4)}>
                            <div className="relative rounded-[24px] overflow-hidden h-[220px] md:h-[260px] border border-white/[0.05] transition-all hover:border-accent/50 cursor-pointer group">
                                <img src={userPerspectiveCover} className="w-full h-full object-cover" alt="Event" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
                                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="bg-black/30 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 hover:bg-black/50 transition-colors" onClick={(e) => { e.stopPropagation(); setCurrentStep(0); }}>
                                            <Tag className="w-3 h-3 text-white/60" />
                                            <span className="text-[10px] font-black text-white">{form.type === "post" ? "Post & Vote" : "Vote Only"}</span>
                                        </div>
                                    </div>
                                    <div className="hover:translate-x-1 transition-transform" onClick={(e) => { e.stopPropagation(); setCurrentStep(1); }}>
                                        <h1 className="font-display text-4xl md:text-[3rem] text-white leading-tight mb-1 group-hover:text-accent transition-colors">
                                            {form.title || "Untitled Event"}
                                        </h1>
                                        {form.tagline && (
                                            <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2 max-w-[420px] mb-4">
                                                {form.tagline}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1 pointer-events-none opacity-50">
                                            {isPost ? (
                                                <div className="px-5 py-2.5 bg-orange-500 text-white rounded-full text-xs font-black uppercase tracking-widest">
                                                    Submit Entry
                                                </div>
                                            ) : (
                                                <div className="px-5 py-2.5 bg-lime-400 text-black rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                    Vote Below
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/20 shadow-2xl">
                                        <Pencil className="w-4 h-4 text-white" />
                                        <span className="text-xs font-black text-white">EDIT HERO</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Right column (Details & Financials) ── */}
                        <div className="lg:w-[320px] shrink-0 space-y-4">
                            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5 relative group cursor-pointer hover:border-accent/40 transition-all" onClick={() => setCurrentStep(3)}>
                                <div className="flex items-center gap-3 mb-4 pt-1">
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                        <span className="text-xs font-black text-accent">B</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-foreground">Your Brand</p>
                                        <p className="text-[10px] text-foreground/40 font-medium">Event Host</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3 px-3 rounded-[12px] border bg-accent/5 border-accent/20 mb-4 group-hover:bg-accent/10 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-accent" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent/80">
                                            Duration
                                        </span>
                                    </div>
                                    <span className="text-sm font-black text-accent">{fmtDuration(durationMs)}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-t border-border/30">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Participants Max</span>
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3 h-3 text-foreground/40" />
                                        <span className="text-sm font-black text-foreground">{form.maxParticipants || "0"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3 border-t border-border/30">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Watching Now</span>
                                    <div className="flex items-center gap-1.5 opacity-40">
                                        <span className="relative flex h-1.5 w-1.5"><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" /></span>
                                        <span className="text-sm font-black text-green-400">--</span>
                                    </div>
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/20 p-2 rounded-full">
                                    <Pencil className="w-3 h-3 text-accent" />
                                </div>
                            </div>

                            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5 relative group cursor-pointer hover:border-[#A78BFA]/40 transition-all" onClick={() => setCurrentStep(5)}>
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy className="w-4 h-4 text-[#A78BFA]" />
                                    <span className="text-sm font-black text-foreground">Rewards Pool</span>
                                </div>

                                <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[14px] p-4 mb-4 group-hover:bg-[#A78BFA]/10 transition-colors">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Top Prize</p>
                                    <p className="text-3xl font-black text-foreground">${effectiveTop.toFixed(2)}</p>
                                    <p className="text-[10px] text-foreground/40 font-medium tracking-tight">USDC</p>
                                </div>

                                {isPost && (
                                    <div className="mb-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Creator Leaderboard</p>
                                        <p className="text-xl font-black text-foreground">${creatorPool.toFixed(2)}</p>
                                        <p className="text-[10px] text-foreground/40 font-medium tracking-tight">USDC</p>
                                    </div>
                                )}

                                <div className="pt-3 mt-3 border-t border-white/[0.08]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Voter Base Pool</p>
                                    <p className="text-lg font-bold text-foreground">${basePool.toFixed(2)}</p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-accent/20 flex justify-between items-end">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">Total Deposit</p>
                                    <p className="text-xl font-black text-accent font-mono">${totalLocked.toFixed(2)}</p>
                                </div>

                                <div className="pb-4 mt-4 mb-4 border-b border-t border-border/40 pt-4">
                                    <div className="flex items-center gap-1.5 mb-2.5">
                                        <ShieldCheck className="w-3 h-3 text-foreground/40" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Eligibility</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400/80 border border-orange-500/15">
                                            Open to All Users
                                        </span>
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/50 border border-border/40">
                                            1 Submission / User
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="pt-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-3">
                                        {isPost ? "Posting Rules" : "Voting Guidelines"}
                                    </p>
                                    <ol className="space-y-2.5">
                                        {(isPost
                                            ? (form.participantInstructions ? form.participantInstructions.split("\n").filter(Boolean) : [
                                                "Upload a high-res image (max 5 MB).",
                                                "One submission per participant.",
                                                "No offensive, copyrighted material."
                                            ])
                                            : [
                                                "Browse all entries in the grid below.",
                                                "Click the vote button on your favourite entry.",
                                                "You can only cast one vote — choose wisely!",
                                            ]
                                        ).slice(0, 3).map((rule, i) => (
                                            <li key={i} className="flex gap-2.5 text-xs text-foreground/60">
                                                <span className={cn(
                                                    "w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5",
                                                    isPost ? "bg-orange-500/10 text-orange-400" : "bg-lime-400/10 text-lime-400"
                                                )}>
                                                    {i + 1}
                                                </span>
                                                {rule}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                                
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#A78BFA]/20 p-2 rounded-full">
                                    <Pencil className="w-3 h-3 text-[#A78BFA]" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    const launchData: LaunchFormData = {
        ...form,
        proposals: form.proposals.filter(p => p.title.trim()),
    };

    return (
        <div className="h-[90vh] min-h-[600px] w-full bg-background flex flex-col relative overflow-hidden font-sans">
            {/* Top Bar Navigation */}
            <div className="absolute top-0 left-0 right-0 px-4 py-6 sm:px-6 sm:py-8 flex justify-between items-center z-20 pointer-events-none">
                <Link href="/brand/dashboard" className="pointer-events-auto flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span className="text-xs font-black tracking-widest uppercase">Exit</span>
                </Link>
                <div className="pointer-events-auto flex flex-col items-end gap-2">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Step {currentStep + 1} of {FORM_QUESTIONS.length}
                    </div>
                    <div className="flex gap-1.5 opacity-80">
                        {FORM_QUESTIONS.map((_, i) => (
                            <div key={i} className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                i === currentStep ? "bg-primary w-8 shadow-sm shadow-primary/50" : i < currentStep ? "bg-primary/40 w-3" : "bg-border w-2"
                            )} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-8 pt-24 sm:pt-32 pb-32 sm:pb-40 w-full max-w-5xl mx-auto z-10 overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full text-center"
                    >
                        {/* Guideline Tooltip */}
                        <div className="mb-6 group relative inline-flex items-center gap-2 text-accent bg-accent/10 px-4 py-2 rounded-full cursor-help hover:bg-accent/20 transition-colors border border-accent/20">
                            <Info className="w-4 h-4" />
                            <span className="text-xs font-bold tracking-wide uppercase">Setup Guide</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 p-4 bg-card border border-border shadow-2xl rounded-2xl text-xs text-foreground font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 origin-top z-50 leading-relaxed">
                                {FORM_QUESTIONS[currentStep].guideline}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-3 h-3 bg-card border-t border-l border-border" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-display uppercase mb-6 sm:mb-8 text-foreground tracking-tighter leading-none px-2 group-hover:text-accent transition-colors duration-500">
                            {FORM_QUESTIONS[currentStep].title}
                        </h2>

                        {/* Dynamic Input Surface */}
                        <div className="w-full text-left mx-auto max-w-3xl px-2 sm:px-4">
                            {renderQuestionFields()}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Bar Execution */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 flex justify-between items-center z-20 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
                {currentStep > 0 ? (
                    <button
                        onClick={goBack}
                        className="pointer-events-auto flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-border text-sm font-bold hover:bg-secondary hover:border-accent/40 hover:text-accent transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                    </button>
                ) : <div />}

                {currentStep < FORM_QUESTIONS.length - 1 ? (
                    <button
                        onClick={goNext}
                        className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 bg-foreground text-background rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-foreground/20 group hover:bg-accent hover:text-white"
                    >
                        Continue <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            let errMessage = null;
                            for (let i = 0; i < FORM_QUESTIONS.length; i++) {
                                const err = validateStep(i);
                                if (err) { errMessage = `Step ${i + 1}: ${err}`; break; }
                            }
                            if (errMessage) { toast.error(errMessage); return; }
                            setModalOpen(true);
                        }}
                        className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 group hover:bg-accent"
                    >
                        Launch <Rocket className="w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 ml-1" />
                    </button>
                )}
            </div>

            <LaunchStepModal
                open={modalOpen}
                form={launchData}
                onClose={() => setModalOpen(false)}
                onSuccess={() => router.push("/brand/dashboard")}
            />
            {pinturaImageSrc && (
                <PinturaImageEditor isOpen={pinturaOpen} imageSrc={pinturaImageSrc} onDone={handlePinturaDone} onClose={handlePinturaClose} />
            )}
        </div>
    );
}
