"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    ChevronLeft, ChevronRight, Info, Rocket, Sparkles, Loader2, Plus, Minus,
    Users, Trophy, Clock, ThumbsUp, Wallet, AlertCircle, RefreshCw,
    Upload, Pencil, X, LayoutGrid, List, Tag, Vote, PlusCircle, ShieldCheck, ImageIcon, Save,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollIndicator } from "@/components/ui/ScrollIndicator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LaunchStepModal, { type LaunchFormData } from "@/components/brand/LaunchStepModal";
import { generateAiProposals } from "@/services/ai.service";
import { readBrandRefundBalance } from "@/lib/blockchain/contracts";
import { useWallet } from "@/context/WalletContext";
import { useUser } from "@/context/UserContext";
import { BrandImageGeneratorModal } from "@/components/create/BrandImageGeneratorModal";
import { getBrandEvents, createEvent, updateEvent } from "@/services/event.service";
import type { Event } from "@/services/event.service";
import { uploadToPinata } from "@/lib/pinata-upload";
import EventDraftPanel from "@/components/brand/createEvent/EventDraftPanel";
import AiEventPanel from "@/components/brand/createEvent/AiEventPanel";

// ── Constants ──────────────────────────────────────────────────────────────────
const BASE_RATE = 0.030;   // $0.030/participant — base voter reward
const CREATOR_RATE = 0.050;
const FEE_VOTE = 0.015;
const FEE_POST = 0.020;

const EVENT_DOMAINS = [
    "UI/UX Design",
    "Marketing",
    "Branding",
    "Photography",
    "Copywriting",
    "Video & Reels",
    "Fashion",
    "Food & Beverage",
    "Tech & Gaming",
    "Health & Wellness",
    "Music & Arts",
    "Other",
];

const STEPS = [
    { id: "type",     title: "What type of event?",          guideline: "Post campaigns let creators submit content. Vote campaigns use fixed options you define." },
    { id: "basics",   title: "Tell us about your event",     guideline: "Give your event a name, description, domain, and how long it should run." },
    { id: "rewards",  title: "Participants & rewards",       guideline: "Set the cap on participants. Base reward is auto-calculated; top prize can be customised." },
    { id: "content",  title: "Set up voting options",        guideline: "Add the options your audience will vote on. At least 2 required." },
    { id: "review",   title: "Review & launch",              guideline: "Preview your event then hit Launch to deploy." },
];

interface Proposal { title: string; order: number; media?: File; mediaPreview?: string; }

const AGE_GROUPS = ["All Ages", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
const GENDERS = ["All", "M", "F"] as const;
const REGIONS = ["north", "south", "east", "west"] as const;
const REGION_LABELS: Record<string, string> = { north: "North", south: "South", east: "East", west: "West" };

interface FormData {
    type: "post" | "vote";
    title: string;
    description: string;
    domain: string;
    maxParticipants: string;
    baseReward: string;
    topPrize: string;
    leaderboardPool: string;
    proposals: Proposal[];
    // Demographic targeting
    preferredGender: string;
    ageGroup: string;
    regions: string[];
    // fields required by LaunchFormData but set to defaults
    tagline: string;
    startImmediately: boolean;
    startDate: string;
    endDate: string;
    postingEndDate: string;
    timezone: string;
    rules: string;
    hashtags: string[];
    contentType: string[];
    coverImage: File | null;
    sampleImages: File[];
    useRefundCredit: boolean;
    refundCreditAmount: number;
}

// ── Small utility components ───────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
    return (
        <span className="relative inline-flex items-center group ml-1.5 align-middle">
            <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-default hover:text-muted-foreground transition-colors" />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl bg-card border border-border px-3 py-2 text-xs text-muted-foreground shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-[100] leading-relaxed backdrop-blur-none" style={{ isolation: "isolate" }}>
                {text}
            </span>
        </span>
    );
}

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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CreateEventPage() {
    const router = useRouter();
    const { address, balance } = useWallet();
    const { user } = useUser();
    const [currentStep, setCurrentStep] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [direction, setDirection] = useState(1);
    const [proposalAiLoading, setProposalAiLoading] = useState(false);
    const [availableCredit, setAvailableCredit] = useState(0);
    const [aiGeneratorProposalIdx, setAiGeneratorProposalIdx] = useState<number | null>(null);
    const proposalFileRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const bannerInputRef = useRef<HTMLInputElement | null>(null);
    const [bannerGeneratorOpen, setBannerGeneratorOpen] = useState(false);
    const [samplePreviews, setSamplePreviews] = useState<string[]>([]);
    const sampleInputRef = useRef<HTMLInputElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    // ── Landing / Draft state ──────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<"landing" | "form">("landing");
    const [drafts, setDrafts] = useState<Event[]>([]);
    const [draftsLoading, setDraftsLoading] = useState(true);
    const [savingDraft, setSavingDraft] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

    const [form, setForm] = useState<FormData>({
        type: "vote",
        title: "",
        description: "",
        domain: "",
        maxParticipants: "",
        baseReward: String(BASE_RATE),
        topPrize: "",
        leaderboardPool: "",
        proposals: [{ title: "", order: 0 }, { title: "", order: 1 }],
        preferredGender: "All",
        ageGroup: "All Ages",
        regions: [],
        tagline: "",
        startImmediately: true,
        startDate: "",
        endDate: "",
        postingEndDate: "",
        timezone: "UTC",
        rules: "",
        hashtags: [],
        contentType: ["Photo"],
        coverImage: null,
        sampleImages: [],
        useRefundCredit: false,
        refundCreditAmount: 0,
    });

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

    // Load drafts on mount
    useEffect(() => {
        setDraftsLoading(true);
        getBrandEvents("draft")
            .then((events) => setDrafts(events))
            .catch(() => setDrafts([]))
            .finally(() => setDraftsLoading(false));
    }, []);

    const set = useCallback((patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch })), []);

    // ── Resume a draft event → pre-fill form ──────────────────────────────────
    const handleResumeDraft = useCallback((event: Event) => {
        setCurrentDraftId(event.id);
        set({
            type: event.eventType === "post_and_vote" ? "post" : "vote",
            title: event.title ?? "",
            description: event.description ?? "",
            domain: event.category ?? "",
            tagline: (event as any).tagline ?? "",
            hashtags: (event as any).hashtags ?? [],
            regions: (event as any).regions ?? [],
            preferredGender: (event as any).preferredGender ?? "All",
            ageGroup: (event as any).ageGroup ?? "All Ages",
            maxParticipants: event.capacity ? String(event.capacity) : "",
            baseReward: event.baseReward ? String(event.baseReward) : String(BASE_RATE),
            topPrize: event.topReward ? String(event.topReward) : "",
            leaderboardPool: event.leaderboardPool ? String(event.leaderboardPool) : "",
        });
        // If event has an imageUrl set banner preview
        if (event.imageUrl) {
            setBannerPreview(event.imageUrl);
        } else if (event.imageCid) {
            setBannerPreview(`https://gateway.pinata.cloud/ipfs/${event.imageCid}`);
        }
        setCurrentStep(0);
        setViewMode("form");
    }, [set]);

    // ── Save current form state as a draft ────────────────────────────────────
    const handleSaveDraft = useCallback(async () => {
        if (!form.title.trim()) {
            toast.error("Add an event name before saving as draft");
            return;
        }
        setSavingDraft(true);
        try {
            // Upload banner if a new file has been selected
            let imageUrl: string | undefined;
            if (form.coverImage instanceof File) {
                const uploadResult = await uploadToPinata(form.coverImage);
                imageUrl = uploadResult.imageUrl;
            } else if (bannerPreview && !bannerPreview.startsWith("blob:")) {
                imageUrl = bannerPreview;
            }

            const payload = {
                title: form.title,
                description: form.description || undefined,
                category: form.domain || undefined,
                eventType: form.type === "post" ? "post_and_vote" : "vote_only",
                capacity: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
                baseReward: parseFloat(form.baseReward) || undefined,
                topReward: parseFloat(form.topPrize) || undefined,
                leaderboardPool: parseFloat(form.leaderboardPool) || undefined,
                tagline: form.tagline || undefined,
                hashtags: form.hashtags,
                regions: form.regions,
                preferredGender: form.preferredGender,
                ageGroup: form.ageGroup,
                startTime: new Date(Date.now() + 86400000).toISOString(),
                endTime: new Date(Date.now() + 86400000 * 2).toISOString(),
                status: "draft" as const,
                imageUrl,
            };

            if (currentDraftId) {
                await updateEvent(currentDraftId, payload as any);
                setDrafts((prev) => prev.map((d) => d.id === currentDraftId ? { ...d, ...payload } as Event : d));
                toast.success("Draft updated");
            } else {
                const created = await createEvent(payload as any);
                setCurrentDraftId(created.id);
                setDrafts((prev) => [created, ...prev]);
                toast.success("Saved as draft");
            }
            router.push("/brand/create-event");
        } catch (err: any) {
            toast.error(err?.message || "Failed to save draft");
        } finally {
            setSavingDraft(false);
        }
    }, [form, currentDraftId]);

    // ── Delete a draft ────────────────────────────────────────────────────────
    const handleDeleteDraft = useCallback((id: string) => {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
    }, []);

    // ── Derived reward values ──────────────────────────────────────────────────
    const isPost = form.type === "post";
    const pCount = Math.max(parseInt(form.maxParticipants) || 0, 0);
    const topNum = parseFloat(form.topPrize) || 0;
    const minTop = BASE_RATE * pCount;
    const effectiveTop = Math.max(topNum, minTop);
    const creatorPool = isPost ? CREATOR_RATE * pCount : 0;
    const platformFee = (isPost ? FEE_POST : FEE_VOTE) * pCount;
    const basePool = BASE_RATE * pCount;
    const leaderboardNum = parseFloat(form.leaderboardPool) || 0;
    const minLeaderboard = isPost ? basePool : 0;
    const effectiveLeaderboard = isPost ? Math.max(leaderboardNum, minLeaderboard) : 0;
    const totalLocked = basePool + effectiveTop + creatorPool + effectiveLeaderboard + platformFee;

    // ── Date helpers ──────────────────────────────────────────────────────────
    const toDatetimeLocal = (d: Date): string => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const nowDatetimeLocal = () => toDatetimeLocal(new Date());

    const computeDurationLabel = (start: string, end: string): string | null => {
        const s = start ? new Date(start) : new Date();
        const e = end ? new Date(end) : null;
        if (!e || isNaN(e.getTime()) || e <= s) return null;
        const diffMs = e.getTime() - s.getTime();
        const totalMins = Math.floor(diffMs / 60000);
        const d = Math.floor(totalMins / 1440);
        const h = Math.floor((totalMins % 1440) / 60);
        const m = totalMins % 60;
        const parts: string[] = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0 && d === 0) parts.push(`${m}m`);
        return parts.length ? parts.join(" ") : null;
    };

    const applyPreset = (hours: number) => {
        const base = form.startImmediately ? new Date() : (form.startDate ? new Date(form.startDate) : new Date());
        const end = new Date(base.getTime() + hours * 3600000);
        set({ endDate: toDatetimeLocal(end) });
    };

    const applyPostingPreset = (hours: number) => {
        const base = form.startImmediately ? new Date() : (form.startDate ? new Date(form.startDate) : new Date());
        const end = new Date(base.getTime() + hours * 3600000);
        set({ postingEndDate: toDatetimeLocal(end) });
    };

    const applyVotingPreset = (hours: number) => {
        const base = form.postingEndDate ? new Date(form.postingEndDate) : (form.startImmediately ? new Date() : (form.startDate ? new Date(form.startDate) : new Date()));
        const end = new Date(base.getTime() + hours * 3600000);
        set({ endDate: toDatetimeLocal(end) });
    };

    // ── Proposal helpers ───────────────────────────────────────────────────────
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

    const updateProposalMedia = (idx: number, file: File) => {
        const preview = URL.createObjectURL(file);
        set({ proposals: form.proposals.map((p, i) => i === idx ? { ...p, media: file, mediaPreview: preview } : p) });
    };

    const removeProposalMedia = (idx: number) => {
        const p = form.proposals[idx];
        if (p?.mediaPreview) URL.revokeObjectURL(p.mediaPreview);
        set({ proposals: form.proposals.map((p, i) => i === idx ? { ...p, media: undefined, mediaPreview: undefined } : p) });
    };

    const handleAiProposals = async () => {
        if (!form.title.trim()) { toast.error("Enter a title first"); return; }
        setProposalAiLoading(true);
        try {
            const res = await generateAiProposals({ title: form.title, description: form.description, category: form.domain });
            if (res.success && res.proposals) {
                set({ proposals: res.proposals.slice(0, 6).map((p, i) => ({ title: p.title, order: i })) });
            } else {
                toast.error("Could not generate suggestions");
            }
        } finally {
            setProposalAiLoading(false);
        }
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const visibleSteps = isPost
        ? STEPS.filter((s) => s.id !== "content")
        : STEPS;

    const validateStep = (idx: number): string | null => {
        const stepId = visibleSteps[idx]?.id;
        switch (stepId) {
            case "type": return null;
            case "basics":
                if (!form.title.trim()) return "Event name is required.";
                if (form.description.trim().length < 20) return "Description must be at least 20 characters.";
                if (!form.domain || form.domain === "Other") return "Please enter your domain.";
                if (!form.coverImage) return "Event banner is required.";
                if (isPost && form.sampleImages.length < 1) return "At least 1 sample image is required for post events.";
                if (!form.startImmediately && !form.startDate) return "Please set a start date.";
                if (isPost) {
                    if (!form.postingEndDate) return "Please set a posting end date.";
                    if (!form.endDate) return "Please set a voting end date.";
                    const s = form.startImmediately ? new Date() : new Date(form.startDate);
                    const p = new Date(form.postingEndDate);
                    const e = new Date(form.endDate);
                    if (isNaN(p.getTime()) || p <= s) return "Posting end date must be after start date.";
                    if (p.getTime() - s.getTime() < 10 * 60000) return "Post duration must be at least 10 minutes.";
                    if (isNaN(e.getTime()) || e <= p) return "Voting end date must be after posting end date.";
                    if (e.getTime() - p.getTime() < 10 * 60000) return "Vote duration must be at least 10 minutes.";
                } else {
                    if (!form.endDate) return "Please set an end date.";
                    const s = form.startImmediately ? new Date() : new Date(form.startDate);
                    const e = new Date(form.endDate);
                    if (isNaN(e.getTime()) || e <= s) return "End date must be after start date.";
                    if (e.getTime() - s.getTime() < 10 * 60000) return "Duration must be at least 10 minutes.";
                }
                return null;
            case "rewards":
                if (!form.maxParticipants || parseInt(form.maxParticipants) < 10) return "Minimum 10 participants required.";
                if (parseInt(form.maxParticipants) > 100_000) return "Maximum 100,000 participants.";
                if (!form.topPrize || parseFloat(form.topPrize) < minTop) return `Top prize must be at least $${minTop.toFixed(2)}.`;
                if (isPost && (!form.leaderboardPool || parseFloat(form.leaderboardPool) < minLeaderboard)) return `Leaderboard pool must be at least $${minLeaderboard.toFixed(2)}.`;
                return null;
            case "content":
                if (form.proposals.filter((p) => p.title.trim()).length < 2) return "At least 2 voting options are required.";
                return null;
            case "review": return null;
            default: return null;
        }
    };

    const goNext = () => {
        const err = validateStep(currentStep);
        if (err) { toast.error(err); return; }
        setDirection(1);
        setCurrentStep((s) => Math.min(s + 1, visibleSteps.length - 1));
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

    // ── Step renderers ─────────────────────────────────────────────────────────
    const renderStep = () => {
        const stepId = visibleSteps[currentStep]?.id;

        switch (stepId) {
            case "type":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(["vote", "post"] as const).map((t) => (
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
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", t === "vote" ? "bg-lime-400/10" : "bg-orange-500/10")}>
                                    {t === "vote" ? <ThumbsUp className="w-5 h-5 text-lime-400" /> : <Upload className="w-5 h-5 text-orange-400" />}
                                </div>
                                <p className="font-black text-xl text-foreground capitalize mb-2">
                                    {t === "post" ? "Post Campaign" : "Vote Campaign"}
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

            case "basics":
                return (
                    <div className="space-y-5">
                        <div>
                            <Label>Event Name</Label>
                            <Input
                                autoFocus
                                placeholder="e.g. Summer Noodle Challenge"
                                value={form.title}
                                onChange={(e) => set({ title: e.target.value })}
                                maxLength={120}
                            />
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Describe your event — what it's about, why people should participate..."
                                value={form.description}
                                onChange={(e) => set({ description: e.target.value })}
                                rows={4}
                                maxLength={2000}
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">{form.description.length}/2000</p>
                        </div>

                        <div>
                            <Label>Domain</Label>
                            {(() => {
                                const isCustom = form.domain !== "" && !EVENT_DOMAINS.slice(0, -1).includes(form.domain);
                                return (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            {EVENT_DOMAINS.map((d) => {
                                                const active = d === "Other" ? isCustom || form.domain === "Other" : form.domain === d;
                                                return (
                                                    <button
                                                        key={d}
                                                        onClick={() => set({ domain: d })}
                                                        className={cn(
                                                            "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                                                            active
                                                                ? "border-primary bg-primary/10 text-primary"
                                                                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                                        )}
                                                    >
                                                        {d}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {(isCustom || form.domain === "Other") && (
                                            <Input
                                                autoFocus
                                                className="mt-3"
                                                placeholder="Describe your domain (e.g. Interior Design)"
                                                value={form.domain === "Other" ? "" : form.domain}
                                                onChange={(e) => set({ domain: e.target.value || "Other" })}
                                                maxLength={60}
                                            />
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        <div className="space-y-3">
                            <Label>Schedule</Label>

                            {/* Start Immediately toggle */}
                            <button
                                onClick={() => set({ startImmediately: !form.startImmediately, startDate: !form.startImmediately ? "" : form.startDate })}
                                className={cn(
                                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                                    form.startImmediately
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/50"
                                )}
                            >
                                <Rocket className={cn("w-4 h-4", form.startImmediately ? "text-primary" : "text-muted-foreground")} />
                                Start Immediately
                            </button>

                            {/* Date pickers */}
                            {isPost ? (
                                <div className="space-y-4">
                                    {/* Row 1: Start + Posting End */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <span className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Date & Time</span>
                                            <Input
                                                type="datetime-local"
                                                value={form.startImmediately ? nowDatetimeLocal() : form.startDate}
                                                min={nowDatetimeLocal()}
                                                disabled={form.startImmediately}
                                                onChange={(e) => set({ startDate: e.target.value })}
                                                className={cn(form.startImmediately && "opacity-40 cursor-not-allowed")}
                                            />
                                        </div>
                                        <div>
                                            <span className="flex items-center text-xs font-semibold text-orange-400 mb-1.5">
                                                Posting End Date & Time
                                                <InfoTooltip text="Creators can submit their posts until this time. Once posting ends, voting begins automatically." />
                                            </span>
                                            <Input
                                                type="datetime-local"
                                                value={form.postingEndDate}
                                                min={form.startImmediately ? nowDatetimeLocal() : (form.startDate || nowDatetimeLocal())}
                                                onChange={(e) => set({ postingEndDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Posting duration + presets */}
                                    {(() => {
                                        const label = computeDurationLabel(form.startImmediately ? "" : form.startDate, form.postingEndDate);
                                        return (
                                            <div className="space-y-1.5">
                                                {label && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                                                        Post Duration: <span className="text-orange-400 font-semibold">{label}</span>
                                                    </p>
                                                )}
                                                <div className="flex gap-2 flex-wrap">
                                                    {[1, 6, 24, 48, 72, 168].map((h) => (
                                                        <button
                                                            key={h}
                                                            onClick={() => applyPostingPreset(h)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:border-orange-400/50 hover:text-orange-400 transition-all"
                                                        >
                                                            {h >= 24 ? `${h / 24}d` : `${h}h`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Voting End */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <span className="flex items-center text-xs font-semibold text-lime-400 mb-1.5">
                                                Voting End Date & Time
                                                <InfoTooltip text="Audience votes on submitted posts during this period. When voting ends, the event closes and winners are determined." />
                                            </span>
                                            <Input
                                                type="datetime-local"
                                                value={form.endDate}
                                                min={form.postingEndDate || (form.startImmediately ? nowDatetimeLocal() : (form.startDate || nowDatetimeLocal()))}
                                                onChange={(e) => set({ endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Voting duration + presets */}
                                    {(() => {
                                        const voteLabel = computeDurationLabel(form.postingEndDate, form.endDate);
                                        const totalLabel = computeDurationLabel(form.startImmediately ? "" : form.startDate, form.endDate);
                                        return (
                                            <div className="space-y-1.5">
                                                {voteLabel && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-lime-400" />
                                                        Vote Duration: <span className="text-lime-400 font-semibold">{voteLabel}</span>
                                                    </p>
                                                )}
                                                <div className="flex gap-2 flex-wrap">
                                                    {[1, 6, 24, 48, 72, 168].map((h) => (
                                                        <button
                                                            key={h}
                                                            onClick={() => applyVotingPreset(h)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:border-lime-400/50 hover:text-lime-400 transition-all"
                                                        >
                                                            {h >= 24 ? `${h / 24}d` : `${h}h`}
                                                        </button>
                                                    ))}
                                                </div>
                                                {totalLabel && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Total Duration: <span className="text-foreground font-semibold">{totalLabel}</span>
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <span className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Date & Time</span>
                                            <Input
                                                type="datetime-local"
                                                value={form.startImmediately ? nowDatetimeLocal() : form.startDate}
                                                min={nowDatetimeLocal()}
                                                disabled={form.startImmediately}
                                                onChange={(e) => set({ startDate: e.target.value })}
                                                className={cn(form.startImmediately && "opacity-40 cursor-not-allowed")}
                                            />
                                        </div>
                                        <div>
                                            <span className="flex items-center text-xs font-semibold text-muted-foreground mb-1.5">
                                                End Date & Time
                                                <InfoTooltip text="When voting ends, the event closes and winners are determined." />
                                            </span>
                                            <Input
                                                type="datetime-local"
                                                value={form.endDate}
                                                min={form.startImmediately ? nowDatetimeLocal() : (form.startDate || nowDatetimeLocal())}
                                                onChange={(e) => set({ endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Duration computed display */}
                                    {(() => {
                                        const label = computeDurationLabel(form.startImmediately ? "" : form.startDate, form.endDate);
                                        return label ? (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                Duration: <span className="text-foreground font-semibold">{label}</span>
                                            </p>
                                        ) : null;
                                    })()}

                                    {/* Quick-select preset chips */}
                                    <div className="flex gap-2 flex-wrap">
                                        {[1, 6, 24, 48, 72, 168].map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => applyPreset(h)}
                                                className="px-3 py-2 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:border-accent/50 hover:text-accent transition-all"
                                            >
                                                {h >= 24 ? `${h / 24}d` : `${h}h`}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Audience Targeting ────────────────────────────────────── */}
                        <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="text-sm font-black text-foreground">Audience Targeting</span>
                                <InfoTooltip text="Only participants matching these demographics will be allowed to join this event. Leave at defaults to allow everyone." />
                                <span className="ml-auto text-xs font-normal text-muted-foreground">(optional)</span>
                            </div>

                            {/* Gender */}
                            <div>
                                <Label>Gender</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {GENDERS.map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => set({ preferredGender: g })}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                                                form.preferredGender === g
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                            )}
                                        >
                                            {g === "All" ? "All Genders" : g === "M" ? "Male" : "Female"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Age Group */}
                            <div>
                                <Label>Age Group</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {AGE_GROUPS.map((a) => (
                                        <button
                                            key={a}
                                            type="button"
                                            onClick={() => set({ ageGroup: a })}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                                                form.ageGroup === a
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                            )}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Region */}
                            <div>
                                <Label>Region (India)</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {REGIONS.map((r) => {
                                        const active = form.regions.includes(r);
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() =>
                                                    set({
                                                        regions: active
                                                            ? form.regions.filter((x) => x !== r)
                                                            : [...form.regions, r],
                                                    })
                                                }
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                                                    active
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                                )}
                                            >
                                                {REGION_LABELS[r]}
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.regions.length === 0 && (
                                    <p className="text-xs text-muted-foreground/60 mt-1.5">No region selected — all regions allowed</p>
                                )}
                            </div>
                        </div>

                        {/* Banner upload */}
                        <div>
                            <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                Event Banner
                                <InfoTooltip text="This image appears as the event banner visible to participants. Recommended: 16:9 ratio, JPEG or PNG, max 5 MB." />
                            </label>

                            {bannerPreview ? (
                                <div className="relative w-full rounded-2xl overflow-hidden border border-border group" style={{ aspectRatio: "16/9" }}>
                                    <img
                                        src={bannerPreview}
                                        alt="Banner preview"
                                        className="w-full h-full object-cover cursor-zoom-in"
                                        onClick={() => setLightboxSrc(bannerPreview)}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setBannerGeneratorOpen(true)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-primary/20 backdrop-blur-sm border border-primary/40 rounded-xl text-xs font-bold text-primary hover:bg-primary/30 transition-all"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Regenerate
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => bannerInputRef.current?.click()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-xs font-bold text-white hover:bg-white/20 transition-all"
                                        >
                                            <Upload className="w-3.5 h-3.5" /> Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                URL.revokeObjectURL(bannerPreview);
                                                setBannerPreview(null);
                                                set({ coverImage: null });
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/30 transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full rounded-2xl border-2 border-dashed border-border bg-secondary/30" style={{ aspectRatio: "16/9" }}>
                                    <div className="flex flex-col items-center justify-center gap-4 h-full py-8">
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setBannerGeneratorOpen(true)}
                                                className="flex items-center gap-2 px-5 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-2xl text-sm font-bold transition-all hover:scale-105"
                                            >
                                                <Sparkles className="w-4 h-4" /> Generate with AI
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => bannerInputRef.current?.click()}
                                                className="flex items-center gap-2 px-5 py-3 bg-secondary hover:bg-secondary/70 border border-border rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground transition-all hover:scale-105"
                                            >
                                                <Upload className="w-4 h-4" /> Upload
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground/50">16:9 · JPEG, PNG · Max 5 MB</p>
                                    </div>
                                </div>
                            )}

                            <input
                                ref={bannerInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 5 * 1024 * 1024) { toast.error("Banner must be under 5 MB"); return; }
                                    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                                    setBannerPreview(URL.createObjectURL(file));
                                    set({ coverImage: file });
                                    e.target.value = "";
                                }}
                            />
                        </div>

                        {/* Banner AI generator modal */}
                        <BrandImageGeneratorModal
                            isOpen={bannerGeneratorOpen}
                            onClose={() => setBannerGeneratorOpen(false)}
                            onAddToOption={(file, preview) => {
                                if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                                setBannerPreview(preview);
                                set({ coverImage: file });
                                setBannerGeneratorOpen(false);
                            }}
                            brandId={user?.ownedBrands?.[0]?.id ?? ""}
                            eventTitle={form.title}
                            eventDescription={form.description}
                            optionLabel="Event Banner (16:9)"
                        />

                        {/* Sample images — post events only */}
                        {isPost && (
                            <div>
                                <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                    Sample Images
                                    <InfoTooltip text="Upload reference images to show creators what kind of content you're looking for. At least 1 required." />
                                    <span className="ml-1.5 text-xs font-normal text-red-400">*required</span>
                                </label>

                                {/* Grid of uploaded samples */}
                                {samplePreviews.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {samplePreviews.map((src, i) => (
                                            <div key={i} className="relative group rounded-xl overflow-hidden border border-border" style={{ aspectRatio: "1/1" }}>
                                                <img src={src} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        URL.revokeObjectURL(src);
                                                        const newPreviews = samplePreviews.filter((_, idx) => idx !== i);
                                                        const newFiles = form.sampleImages.filter((_, idx) => idx !== i);
                                                        setSamplePreviews(newPreviews);
                                                        set({ sampleImages: newFiles });
                                                    }}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload button */}
                                {samplePreviews.length < 4 && (
                                    <button
                                        type="button"
                                        onClick={() => sampleInputRef.current?.click()}
                                        className="flex items-center gap-2 px-5 py-3 bg-secondary hover:bg-secondary/70 border border-dashed border-border rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground transition-all hover:scale-[1.02]"
                                    >
                                        <Upload className="w-4 h-4" /> Add Sample Image
                                    </button>
                                )}
                                <p className="text-xs text-muted-foreground/50 mt-1.5">JPEG, PNG · Max 5 MB each · 1–4 images required</p>

                                <input
                                    ref={sampleInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (file.size > 5 * 1024 * 1024) { toast.error("Sample image must be under 5 MB"); return; }
                                        setSamplePreviews((p) => [...p, URL.createObjectURL(file)]);
                                        set({ sampleImages: [...form.sampleImages, file] });
                                        e.target.value = "";
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );

            case "rewards":
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Max Participants */}
                            <div>
                                <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                    Max Voters
                                    <InfoTooltip text="The maximum number of people who can participate. All pool sizes are calculated from this number. Min 10 · Max 100,000." />
                                </label>
                                <Input
                                    type="number" min={10} max={100000} placeholder="e.g. 500"
                                    value={form.maxParticipants}
                                    onChange={(e) => set({ maxParticipants: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Min 10 · Max 100,000</p>
                            </div>

                            {/* Base Reward (auto) */}
                            <div>
                                <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                    Base Reward per {isPost ? "Submission" : "Vote"} (auto)
                                    <InfoTooltip text={
                                        isPost
                                            ? `Fixed at $${CREATOR_RATE.toFixed(3)} per creator submission. Formula: Base Pool = $${CREATOR_RATE.toFixed(3)} × Max Participants. Paid out to every creator who submits a valid post.`
                                            : `Fixed at $${BASE_RATE.toFixed(3)} per vote cast. Formula: Base Pool = $${BASE_RATE.toFixed(3)} × Max Participants. Distributed evenly among all voters at event end.`
                                    } />
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input
                                        value={(isPost ? CREATOR_RATE : BASE_RATE).toFixed(3)}
                                        readOnly
                                        className="pl-8 opacity-60 cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {pCount > 0 ? `Base pool = $${basePool.toFixed(2)}` : "Fixed platform rate"}
                                </p>
                            </div>
                        </div>

                        {/* Voter Base Reward — shown for post type separately */}
                        {isPost && (
                            <div>
                                <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                    Voter Base Reward (auto)
                                    <InfoTooltip text={`Fixed at $${BASE_RATE.toFixed(3)} per vote cast. Formula: Voter Pool = $${BASE_RATE.toFixed(3)} × Max Participants. Distributed among all voters who vote on submitted posts.`} />
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input value={BASE_RATE.toFixed(3)} readOnly className="pl-8 opacity-60 cursor-not-allowed" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {pCount > 0 ? `Voter pool = $${(BASE_RATE * pCount).toFixed(2)}` : "Fixed platform rate"}
                                </p>
                            </div>
                        )}

                        {/* Top Prize Pool */}
                        <div>
                            <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                Top Prize Pool (USDC)
                                <InfoTooltip text={
                                    isPost
                                        ? `Bonus pool rewarding voters who voted for the top-ranked creator posts. Formula: min = $${BASE_RATE.toFixed(3)} × Max Participants. Distributed among voters of top-performing posts.`
                                        : `Bonus pool distributed among voters who voted for the top-ranked options. Formula: min = $${BASE_RATE.toFixed(3)} × Max Participants. The more you set, the bigger the incentive to vote correctly.`
                                } />
                            </label>
                            <div className="relative max-w-sm">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                    type="number" min={minTop} step={0.01}
                                    placeholder={minTop > 0 ? minTop.toFixed(2) : "0.00"}
                                    value={form.topPrize}
                                    onChange={(e) => set({ topPrize: e.target.value })}
                                    className="pl-8"
                                />
                            </div>
                            {pCount > 0 && <p className="text-xs text-muted-foreground mt-1">Minimum: ${minTop.toFixed(2)} ($0.030 × {pCount})</p>}
                        </div>

                        {/* Leaderboard Pool — post type only */}
                        {isPost && (
                            <div>
                                <label className="flex items-center text-sm font-semibold text-foreground mb-1.5">
                                    Leaderboard Pool (USDC)
                                    <InfoTooltip text={`Rewards the top 3 creators ranked by votes received.\n\n🥇 1st place → 50%\n🥈 2nd place → 35%\n🥉 3rd place → 15%\n\nFormula: min = $${BASE_RATE.toFixed(3)} × Max Participants = $${minLeaderboard.toFixed(2)}`} />
                                </label>
                                <div className="relative max-w-sm">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input
                                        type="number" min={minLeaderboard} step={0.01}
                                        placeholder={minLeaderboard > 0 ? minLeaderboard.toFixed(2) : "0.00"}
                                        value={form.leaderboardPool}
                                        onChange={(e) => set({ leaderboardPool: e.target.value })}
                                        className="pl-8"
                                    />
                                </div>
                                {pCount > 0 && (
                                    <div className="mt-2 space-y-0.5">
                                        <p className="text-xs text-muted-foreground">Minimum: ${minLeaderboard.toFixed(2)} ($0.030 × {pCount})</p>
                                        {leaderboardNum >= minLeaderboard && leaderboardNum > 0 && (
                                            <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                                                <span>🥇 ${(leaderboardNum * 0.50).toFixed(2)}</span>
                                                <span>🥈 ${(leaderboardNum * 0.35).toFixed(2)}</span>
                                                <span>🥉 ${(leaderboardNum * 0.15).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Refund Credit */}
                        {availableCredit > 0 && (
                            <div className={cn("p-5 rounded-2xl border transition-all", form.useRefundCredit ? "bg-primary/10 border-primary" : "bg-secondary/40 border-border")}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <RefreshCw className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="font-bold text-foreground">Apply Event Credit</p>
                                            <p className="text-sm text-muted-foreground">${availableCredit.toFixed(2)} available</p>
                                        </div>
                                    </div>
                                    <button onClick={() => set({ useRefundCredit: !form.useRefundCredit })}
                                        className={cn("relative w-12 h-6 rounded-full transition-colors", form.useRefundCredit ? "bg-primary" : "bg-foreground/20")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform", form.useRefundCredit ? "translate-x-7" : "translate-x-1")} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Cost summary */}
                        {pCount > 0 && (
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cost Breakdown</p>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        {isPost ? "Creator base pool" : "Voter base pool"}
                                        <InfoTooltip text={isPost ? `$${CREATOR_RATE.toFixed(3)} × ${pCount} participants` : `$${BASE_RATE.toFixed(3)} × ${pCount} participants`} />
                                    </span>
                                    <span className="font-mono">${(isPost ? creatorPool : basePool).toFixed(2)}</span>
                                </div>
                                {isPost && (
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            Voter base pool
                                            <InfoTooltip text={`$${BASE_RATE.toFixed(3)} × ${pCount} participants`} />
                                        </span>
                                        <span className="font-mono">${basePool.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        Top prize pool
                                        <InfoTooltip text="Rewards voters who picked the top-ranked content." />
                                    </span>
                                    <span className="font-mono">${effectiveTop.toFixed(2)}</span>
                                </div>
                                {isPost && (
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            Leaderboard pool
                                            <InfoTooltip text="Split 50/35/15 among the top 3 creators by votes received." />
                                        </span>
                                        <span className="font-mono">${effectiveLeaderboard.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        Platform fee
                                        <InfoTooltip text={`$${(isPost ? FEE_POST : FEE_VOTE).toFixed(3)} × ${pCount} participants`} />
                                    </span>
                                    <span className="font-mono">${platformFee.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-primary/20 pt-2 flex justify-between font-black text-foreground">
                                    <span>Total deposit</span>
                                    <span className="text-primary font-mono text-lg">${Math.max(0, totalLocked - (form.useRefundCredit ? form.refundCreditAmount : 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "content":
                return (
                    <div className="space-y-4">
                        {/* Header row: AI text suggestions */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleAiProposals}
                                disabled={proposalAiLoading || !form.title.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {proposalAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                AI Suggestions
                            </button>
                        </div>

                        {/* Options list */}
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                            {form.proposals.map((p, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border border-border rounded-xl bg-secondary/10">
                                    {/* Number badge */}
                                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                        {idx + 1}
                                    </span>

                                    {/* Text input */}
                                    <Input
                                        placeholder={`Option ${idx + 1}`}
                                        value={p.title}
                                        onChange={(e) => updateProposal(idx, e.target.value)}
                                        className="flex-1"
                                    />

                                    {/* Image area */}
                                    {p.mediaPreview ? (
                                        <div className="relative shrink-0 group">
                                            <img
                                                src={p.mediaPreview}
                                                alt={`Option ${idx + 1}`}
                                                className="w-16 h-16 rounded-xl object-cover border border-border cursor-zoom-in"
                                                onClick={() => setLightboxSrc(p.mediaPreview!)}
                                            />
                                            <button
                                                onClick={() => removeProposalMedia(idx)}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* AI Generate image */}
                                            <button
                                                type="button"
                                                onClick={() => setAiGeneratorProposalIdx(idx)}
                                                className="flex items-center gap-1.5 px-3 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-xs font-semibold transition-all"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Generate
                                            </button>
                                            {/* Manual upload */}
                                            <label className="flex items-center gap-1.5 px-3 py-2.5 bg-secondary border border-border rounded-xl text-xs font-semibold cursor-pointer hover:bg-secondary/70 transition-all">
                                                <Upload className="w-3.5 h-3.5" />
                                                Upload
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    ref={el => { proposalFileRefs.current[idx] = el; }}
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) updateProposalMedia(idx, f);
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {/* Remove option */}
                                    {form.proposals.length > 2 && (
                                        <button
                                            onClick={() => removeProposal(idx)}
                                            className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-xl transition-colors shrink-0"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {form.proposals.length < 10 && (
                            <button onClick={addProposal} className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity text-sm">
                                <Plus className="w-4 h-4" /> Add Option
                            </button>
                        )}

                        {/* AI Image Generator modal */}
                        {aiGeneratorProposalIdx !== null && (
                            <BrandImageGeneratorModal
                                isOpen={true}
                                onClose={() => setAiGeneratorProposalIdx(null)}
                                onAddToOption={(file, preview) => {
                                    set({ proposals: form.proposals.map((p, i) =>
                                        i === aiGeneratorProposalIdx ? { ...p, media: file, mediaPreview: preview } : p
                                    )});
                                    setAiGeneratorProposalIdx(null);
                                }}
                                brandId={user?.ownedBrands?.[0]?.id ?? ""}
                                eventTitle={form.title}
                                eventDescription={form.description}
                                optionLabel={`Option ${aiGeneratorProposalIdx + 1}`}
                            />
                        )}
                    </div>
                );

            case "review":
                return null;
        }
    };

    // ── Review / Launch full-page preview ─────────────────────────────────────
    const launchData: LaunchFormData = {
        ...form,
        postingEndDate: "",
        proposals: form.proposals.filter((p) => p.title.trim()),
        category: form.domain,
    } as LaunchFormData & { category: string };

    const isLastStep = currentStep === visibleSteps.length - 1;

    if (isLastStep) {
        const filledProposals = form.proposals.filter((p) => p.title.trim());
        const netDeposit = Math.max(0, totalLocked - (form.useRefundCredit ? form.refundCreditAmount : 0));
        const basicsIdx = visibleSteps.findIndex(s => s.id === "basics");
        const rewardsIdx = visibleSteps.findIndex(s => s.id === "rewards");
        const contentIdx = visibleSteps.findIndex(s => s.id === "content");
        const goTo = (idx: number) => { setDirection(-1); setCurrentStep(idx); };

        return (
            <div className="min-h-screen w-full bg-background font-sans">
                {/* ── Page body — exact copy of events/[id]/page layout ── */}
                <main className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pb-24 pt-2">
                    {/* ── Breadcrumb — mirrors events/[id]/page ── */}
                    <div className="flex items-center gap-1.5 mb-4 px-0">
                        <button onClick={goBack} className="text-xs text-foreground/40 hover:text-foreground transition-colors">Back</button>
                        <ChevronRight className="w-3 h-3 text-foreground/20" />
                        <span className="text-xs text-foreground/60 font-medium truncate max-w-[260px]">
                            {form.title || "Untitled Event"}
                        </span>
                        <div className="ml-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Preview</span>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* ── Left column ── */}
                        <div className="flex-1 min-w-0">
                            {/* Banner — click to edit basics */}
                            <div
                                onClick={() => goTo(basicsIdx)}
                                className="relative rounded-[24px] overflow-hidden h-[220px] md:h-[260px] mb-5 border border-white/[0.05] cursor-pointer group"
                            >
                                {bannerPreview
                                    ? <img src={bannerPreview} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                                    : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
                                }
                                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
                                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className={cn(
                                            "backdrop-blur-md border px-2.5 py-1 rounded-full flex items-center gap-1.5",
                                            isPost
                                                ? "bg-orange-500/80 border-orange-400/30"
                                                : "bg-black/30 border-white/10"
                                        )}>
                                            <Clock className="w-3 h-3 text-white" />
                                            <span className="text-[10px] font-black text-white">
                                                {isPost ? "Posting Open" : "Voting phase"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        {form.title && (
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">{user?.username ?? "Your Brand"}</p>
                                        )}
                                        <h1 className="font-display text-3xl md:text-[2.6rem] text-white leading-tight mb-1">
                                            {form.title || "Untitled Event"}
                                        </h1>
                                        {form.description && (
                                            <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-2 max-w-[420px] mb-4">
                                                {form.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3">
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
                                {/* Edit overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/20 shadow-2xl">
                                        <Pencil className="w-4 h-4 text-white" />
                                        <span className="text-xs font-black text-white">EDIT BASICS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Post event: upload hero — exact copy of posting phase layout */}
                            {isPost ? (
                                <>
                                    {/* Submit Your Entry card */}
                                    <div className="rounded-[24px] border border-border/40 bg-white/[0.02] overflow-hidden mb-5">
                                        {/* Header */}
                                        <div className="px-5 pt-5 pb-4 border-b border-border/30 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                                <Upload className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-sm font-black text-foreground">Submit Your Entry</h2>
                                                <p className="text-[10px] text-foreground/40 font-medium">Upload or generate an image to compete for the reward pool</p>
                                            </div>
                                            {/* Mode toggle — static preview */}
                                            <div className="flex items-center bg-foreground/5 border border-border/40 rounded-xl p-0.5 shrink-0">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                                                    <Upload className="w-3 h-3" /> Upload
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-foreground/40 text-[10px] font-black uppercase tracking-wider">
                                                    <Sparkles className="w-3 h-3" /> AI
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            {/* Upload zone */}
                                            <div className="border-2 border-dashed border-border/40 hover:border-orange-500/50 rounded-[20px] h-[220px] md:h-[280px] flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors">
                                                <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                                    <ImageIcon className="w-7 h-7 text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground/70">Drop your image here</p>
                                                    <p className="text-xs text-foreground/40 font-medium mt-1">or click to browse</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {["JPEG", "PNG", "WEBP"].map(fmt => (
                                                        <span key={fmt} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-foreground/5 border border-border/40 text-foreground/30">{fmt}</span>
                                                    ))}
                                                    <span className="text-[9px] font-bold text-foreground/25">· max 5 MB</span>
                                                </div>
                                            </div>
                                            {/* Caption */}
                                            <div className="w-full bg-secondary/40 border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground/30">
                                                Add a caption to describe your entry… (optional)
                                            </div>
                                            {/* Submit CTA */}
                                            <button disabled className="w-full py-4 bg-orange-500/30 text-white rounded-[14px] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-not-allowed">
                                                <Upload className="w-4 h-4" /> Submit Entry
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rules & Eligibility */}
                                    <div
                                        onClick={() => goTo(basicsIdx)}
                                        className="rounded-[24px] border border-border/40 bg-white/[0.02] p-5 space-y-5 cursor-pointer group relative"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldCheck className="w-3.5 h-3.5 text-foreground/40" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Eligibility</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">Open to All Users</span>
                                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-foreground/5 text-foreground/50 border border-border/40">1 Submission / User</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Info className="w-3.5 h-3.5 text-foreground/40" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Submission Rules</p>
                                            </div>
                                            <ol className="space-y-3">
                                                {[
                                                    "Upload a high-resolution image (JPEG or PNG, max 5 MB).",
                                                    "Preferred aspect ratio: 4:5 or 1:1.",
                                                    "Add an optional caption to describe your work.",
                                                    "One submission per participant — make it count.",
                                                    "No offensive or copyrighted content.",
                                                ].map((rule, i) => (
                                                    <li key={i} className="flex gap-3 text-sm text-foreground/60 leading-relaxed">
                                                        <span className="w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                        {rule}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                        {form.description && (
                                            <div className="pt-4 border-t border-border/30">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">About This Event</p>
                                                <p className="text-sm text-foreground/60 leading-relaxed">{form.description}</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[24px] pointer-events-none">
                                            <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/20 shadow-2xl">
                                                <Pencil className="w-4 h-4 text-white" />
                                                <span className="text-xs font-black text-white">EDIT BASICS</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                            <>
                            {/* Tab bar — vote events only */}
                            <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
                                <div className="flex items-center gap-1">
                                    {(["trending", "latest", "top"] as const).map((tab) => (
                                        <button key={tab} className={cn(
                                            "relative px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all",
                                            tab === "trending" ? "text-foreground" : "text-foreground/30"
                                        )}>
                                            {tab}
                                            {tab === "trending" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                                        {`${filledProposals.length} Options`}
                                    </span>
                                    <div className="flex border border-border/40 rounded-lg overflow-hidden">
                                        <button className="p-1.5 bg-white/10 text-foreground">
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                        </button>
                                        <button className="p-1.5 text-foreground/30">
                                            <List className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Vote options */}
                            <div onClick={() => contentIdx >= 0 && goTo(contentIdx)} className="cursor-pointer group relative">
                                {filledProposals.length === 0 ? (
                                    <div className="py-16 flex flex-col items-center text-center gap-4 border border-dashed border-lime-400/20 rounded-2xl hover:border-lime-400/40 transition-colors">
                                        <div className="w-14 h-14 rounded-3xl bg-lime-400/10 flex items-center justify-center group-hover:bg-lime-400/20 transition-colors">
                                            <ThumbsUp className="w-7 h-7 text-lime-400/60 group-hover:text-lime-400 transition-colors" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-foreground tracking-tighter mb-1">No Options Yet</h2>
                                            <p className="text-sm text-foreground/50 font-medium">Go back to add vote options</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {filledProposals.map((p, i) => (
                                            <div key={i} className="relative rounded-[20px] bg-white/[0.03] border border-white/[0.06] overflow-hidden group/card hover:border-lime-400/20 transition-colors">
                                                {p.mediaPreview ? (
                                                    <div className="relative w-full aspect-[4/3] overflow-hidden">
                                                        <img src={p.mediaPreview} alt={p.title} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    </div>
                                                ) : (
                                                    <div className="w-full aspect-[4/3] bg-lime-400/5 flex items-center justify-center border-b border-white/[0.04]">
                                                        <span className="text-4xl font-black text-lime-400/20">{i + 1}</span>
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    <p className="text-sm font-bold text-foreground mb-3 truncate">{p.title}</p>
                                                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden mb-2">
                                                        <div className="h-full rounded-full bg-gradient-to-r from-lime-400/60 to-lime-400/30" style={{ width: "0%" }} />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] text-foreground/30 font-medium">0 votes</p>
                                                        <div className="px-3 py-1.5 bg-lime-400/10 border border-lime-400/20 rounded-full flex items-center gap-1 opacity-60">
                                                            <ThumbsUp className="w-3 h-3 text-lime-400" />
                                                            <span className="text-[10px] font-black text-lime-400">Vote</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {contentIdx >= 0 && (
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-[20px]">
                                        <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/20 shadow-2xl">
                                            <Pencil className="w-4 h-4 text-white" />
                                            <span className="text-xs font-black text-white">EDIT OPTIONS</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Voting guidelines + about */}
                            <div onClick={() => goTo(basicsIdx)} className="mt-6 rounded-[24px] border border-border/40 bg-white/[0.02] p-5 space-y-5 cursor-pointer group relative">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ShieldCheck className="w-3.5 h-3.5 text-foreground/40" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Eligibility</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">Open to All Users</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-3.5 h-3.5 text-foreground/40" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Voting Guidelines</p>
                                    </div>
                                    <ol className="space-y-2.5">
                                        {[
                                            "Browse all entries in the grid below.",
                                            "Click the vote button on your favourite entry.",
                                            "You can only cast one vote — choose wisely!",
                                        ].map((rule, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-foreground/60 leading-relaxed">
                                                <span className="w-5 h-5 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 bg-lime-400/10 text-lime-400">{i + 1}</span>
                                                {rule}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                                {form.description && (
                                    <div className="pt-4 border-t border-border/30">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">About This Event</p>
                                        <p className="text-sm text-foreground/60 leading-relaxed">{form.description}</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[24px] pointer-events-none">
                                    <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/20 shadow-2xl">
                                        <Pencil className="w-4 h-4 text-white" />
                                        <span className="text-xs font-black text-white">EDIT BASICS</span>
                                    </div>
                                </div>
                            </div>
                            </>
                        )}
                        </div>

                        {/* ── Right sidebar — mirrors EventSidebar ── */}
                        <div className="lg:w-[300px] shrink-0">
                        <div className="sticky top-6 space-y-4">
                            {/* Event info card */}
                            <div
                                onClick={() => goTo(basicsIdx)}
                                className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5 relative group cursor-pointer hover:border-[#A78BFA]/40 transition-all"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center">
                                        <span className="text-xs font-black text-[#A78BFA]">{user?.username?.[0]?.toUpperCase() ?? "B"}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-foreground">{user?.username ?? "Your Brand"}</p>
                                        <p className="text-[10px] text-foreground/40 font-medium">Event Host</p>
                                    </div>
                                    {form.domain && (
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20 shrink-0">
                                            <Tag className="w-2.5 h-2.5 text-[#A78BFA]/70" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]/80">{form.domain}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={cn(
                                    "flex items-center justify-between py-3 px-3 rounded-[12px] border mt-1",
                                    isPost ? "bg-orange-500/8 border-orange-500/20" : "bg-lime-400/5 border-lime-400/20"
                                )}>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className={cn("w-3 h-3", isPost ? "text-orange-400" : "text-lime-400")} />
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isPost ? "text-orange-400/80" : "text-lime-400/80")}>
                                            {isPost ? "Posting Ends In" : "Voting Ends In"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-foreground/30">
                                        {["d","h","m","s"].map((u, i) => (
                                            <span key={u} className="flex flex-col items-center">
                                                <span className="text-xs font-black font-mono leading-none">--</span>
                                                <span className="text-[8px] font-bold uppercase mt-0.5">{u}</span>
                                                {i < 3 && <span className="text-xs font-black mb-2 -mt-1">:</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="py-3 border-t border-border/30 mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Participating</span>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3 h-3 text-foreground/40" />
                                            <span className="text-sm font-black text-foreground">0</span>
                                            <span className="text-[10px] text-foreground/35 font-medium">/ {form.maxParticipants || "—"}</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]" style={{ width: "0%" }} />
                                    </div>
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#A78BFA]/20 p-2 rounded-full">
                                    <Pencil className="w-3 h-3 text-[#A78BFA]" />
                                </div>
                            </div>

                            {/* Rewards card */}
                            <div
                                onClick={() => goTo(rewardsIdx)}
                                className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5 relative group cursor-pointer hover:border-[#A78BFA]/40 transition-all"
                            >
                                {/* Vote & Earn */}
                                {!isPost && (
                                    <div className="mb-4 bg-lime-400/8 border border-lime-400/20 rounded-[14px] p-3.5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-lime-400/15 flex items-center justify-center shrink-0">
                                            <Trophy className="w-4 h-4 text-lime-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-lime-400">Vote &amp; Earn ${BASE_RATE.toFixed(3)}</p>
                                            <p className="text-[10px] text-foreground/50 leading-tight mt-0.5">Fixed reward per vote, distributed on completion</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-[#A78BFA]" />
                                        <span className="text-sm font-black text-foreground">Rewards Pool</span>
                                    </div>
                                    <span className="text-[9px] bg-[#A78BFA]/10 text-[#A78BFA] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#A78BFA]/20">Guaranteed</span>
                                </div>
                                {effectiveTop > 0 && (
                                    <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[14px] p-4 mb-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Grand-Prize Winner</p>
                                        <p className="text-2xl font-black text-foreground">${effectiveTop.toLocaleString()}</p>
                                        <p className="text-[10px] text-foreground/40 font-medium">USDC</p>
                                    </div>
                                )}
                                {isPost && effectiveLeaderboard > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Leaderboard Pool</p>
                                        <p className="text-xl font-black text-foreground">${effectiveLeaderboard.toLocaleString()}</p>
                                        <p className="text-[10px] text-foreground/40">USDC</p>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">Per {isPost ? "Submission" : "Vote"}</p>
                                    <p className="text-lg font-black text-foreground">${(isPost ? CREATOR_RATE : BASE_RATE).toFixed(3)}</p>
                                </div>
                                {/* Voting guidelines */}
                                <div className="pt-4 border-t border-border/40">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-3">
                                        {isPost ? "Posting Rules" : "Voting Guidelines"}
                                    </p>
                                    <ol className="space-y-2.5">
                                        {(isPost ? [
                                            "Upload a high-res image (JPEG or PNG, max 5 MB).",
                                            "Aspect ratio: 4:5 or 1:1 preferred.",
                                            "One submission per participant.",
                                        ] : [
                                            "Browse all entries in the grid below.",
                                            "Click the vote button on your favourite entry.",
                                            "You can only cast one vote — choose wisely!",
                                        ]).map((rule, i) => (
                                            <li key={i} className="flex gap-2.5 text-xs text-foreground/60">
                                                <span className={cn("w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5", isPost ? "bg-orange-500/10 text-orange-400" : "bg-lime-400/10 text-lime-400")}>
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

                            {/* Vote status panel (vote events only) */}
                            {!isPost && (
                                <div className="rounded-[20px] p-4 border bg-lime-400/5 border-lime-400/20 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-lime-400/15 flex items-center justify-center shrink-0">
                                            <Vote className="w-4 h-4 text-lime-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-foreground">Cast your vote</p>
                                            <p className="text-xs text-foreground/40 mt-0.5">Pick your favourite entry from the grid</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Wallet balance warning */}
                            {totalLocked > 0 && balance !== undefined && parseFloat(balance) < netDeposit && (
                                <div className="flex items-center gap-2 text-yellow-500 text-xs font-semibold bg-yellow-500/10 px-4 py-3 rounded-xl border border-yellow-500/20">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Wallet balance (${parseFloat(balance).toFixed(2)}) may be insufficient. Need ${netDeposit.toFixed(2)}.</span>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                </main>

                {/* ── Bottom action bar ── */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
                    <button
                        onClick={goBack}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-border text-sm font-bold hover:bg-secondary hover:border-accent/40 hover:text-accent transition-all group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                    </button>
                    <button
                        onClick={() => {
                            for (let i = 0; i < visibleSteps.length; i++) {
                                const err = validateStep(i);
                                if (err) { toast.error(`Step ${i + 1}: ${err}`); return; }
                            }
                            setConfirmOpen(true);
                        }}
                        className="flex items-center gap-2 px-10 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 hover:bg-accent group"
                    >
                        Launch <Rocket className="w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 ml-1" />
                    </button>
                </div>

                {/* ── Confirm Launch Dialog ── */}
                <AnimatePresence>
                    {confirmOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                            onClick={() => setConfirmOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-5">
                                    <Rocket className="w-7 h-7 text-primary" />
                                </div>
                                <h2 className="text-xl font-black text-foreground text-center mb-2">Confirm Launch</h2>
                                <p className="text-sm text-muted-foreground text-center mb-1">
                                    You're about to launch <span className="text-foreground font-semibold">{form.title || "your event"}</span>.
                                </p>
                                <p className="text-xs text-muted-foreground text-center mb-7">
                                    This will lock funds and make the event live. This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmOpen(false)}
                                        className="flex-1 py-3 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { setConfirmOpen(false); setModalOpen(true); }}
                                        className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:bg-accent transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                                    >
                                        <Rocket className="w-4 h-4" /> Launch
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Lightbox */}
                <AnimatePresence>
                    {lightboxSrc && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                            onClick={() => setLightboxSrc(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.88, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.88, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img src={lightboxSrc} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" />
                                <button
                                    onClick={() => setLightboxSrc(null)}
                                    className="absolute -top-3 -right-3 w-8 h-8 bg-black/70 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <LaunchStepModal
                    open={modalOpen}
                    form={launchData}
                    onClose={() => setModalOpen(false)}
                    onSuccess={() => router.push("/brand/dashboard")}
                />
            </div>
        );
    }

    // ── Landing view ───────────────────────────────────────────────────────────
    if (viewMode === "landing") {
        return (
            <div className="min-h-screen w-full bg-background font-sans">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link href="/brand/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                        <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="text-xs font-black tracking-widest uppercase">Dashboard</span>
                    </Link>
                    <h1 className="text-sm font-black uppercase tracking-widest text-foreground/60">Create Event</h1>
                    <div className="w-20" />
                </div>

                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                    {/* Event Draft Panel — top */}
                    <EventDraftPanel
                        drafts={drafts}
                        loading={draftsLoading}
                        onResume={handleResumeDraft}
                        onCreateNew={() => { setCurrentDraftId(null); setViewMode("form"); }}
                        onDeleteDraft={handleDeleteDraft}
                    />

                    {/* AI Studio Panel — bottom */}
                    <AiEventPanel
                        brandName={user?.ownedBrands?.[0]?.name}
                        brandBio={user?.ownedBrands?.[0]?.description}
                        onApplyEvent={(data) => {
                            if (data.title) set({ title: data.title });
                            if (data.description) set({ description: data.description });
                            if (data.domain) set({ domain: data.domain });
                            if (data.type) set({ type: data.type });
                            if (data.proposals) set({ proposals: data.proposals });
                            setCurrentDraftId(null);
                            setViewMode("form");
                            toast.success("AI event applied — review and launch");
                        }}
                        onApplyProposals={(proposals) => {
                            set({ proposals });
                            setCurrentDraftId(null);
                            setViewMode("form");
                            toast.success("Proposals applied");
                        }}
                        onApplyImage={(imageUrl) => {
                            setBannerPreview(imageUrl);
                            toast.success("Image set as banner");
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-background flex flex-col relative overflow-hidden font-sans">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 px-4 py-6 sm:px-6 sm:py-8 flex justify-between items-center z-20 pointer-events-none">
                <button
                    onClick={() => setViewMode("landing")}
                    className="pointer-events-auto flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span className="text-xs font-black tracking-widest uppercase">Back</span>
                </button>

                {/* Wallet badge */}
                <div className="pointer-events-auto hidden md:flex items-center bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl px-4 py-2 gap-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-green-500/20">Gasless</span>
                    </div>
                    {address ? (
                        <>
                            <span className="text-xs font-bold">{address.slice(0, 6)}...{address.slice(-4)}</span>
                            <span className="text-sm font-black">${balance !== undefined ? parseFloat(balance).toFixed(2) : "0.00"}</span>
                        </>
                    ) : (
                        <span className="text-xs text-yellow-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> No wallet</span>
                    )}
                </div>

                {/* Step indicators */}
                <div className="pointer-events-auto flex flex-col items-end gap-2">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Step {currentStep + 1} of {visibleSteps.length}
                    </div>
                    <div className="flex gap-1.5 opacity-80">
                        {visibleSteps.map((_, i) => (
                            <div key={i} className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                i === currentStep ? "bg-primary w-8 shadow-sm shadow-primary/50" : i < currentStep ? "bg-primary/40 w-3" : "bg-border w-2"
                            )} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div
                ref={scrollContainerRef}
                className={cn(
                    "flex-1 flex flex-col items-center justify-start px-3 sm:px-4 md:px-6 lg:px-8 pt-24 md:pt-32 pb-32 md:pb-40 w-full mx-auto z-10 overflow-y-auto no-scrollbar",
                    isLastStep ? "max-w-[1400px]" : "max-w-3xl"
                )}
            >
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full text-center"
                    >
                        {/* Guideline chip + title — hidden on review step */}
                        {!isLastStep && (
                            <>
                                <div className="mb-6 group relative inline-flex items-center gap-2 text-accent bg-accent/10 px-4 py-2 rounded-full cursor-help hover:bg-accent/20 transition-colors border border-accent/20">
                                    <Info className="w-4 h-4" />
                                    <span className="text-xs font-bold tracking-wide uppercase">Guide</span>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 p-4 bg-card border border-border shadow-2xl rounded-2xl text-xs text-foreground font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 origin-top z-50 leading-relaxed">
                                        {visibleSteps[currentStep]?.guideline}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-3 h-3 bg-card border-t border-l border-border" />
                                    </div>
                                </div>
                                <h2 className="text-5xl sm:text-6xl font-display uppercase mb-8 text-foreground tracking-tighter leading-none px-3">
                                    {visibleSteps[currentStep]?.title}
                                </h2>
                            </>
                        )}

                        <div className="w-full text-left">
                            {renderStep()}
                        </div>
                    </motion.div>
                </AnimatePresence>
                <ScrollIndicator scrollRef={scrollContainerRef} />
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 flex justify-between items-center z-20 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
                {currentStep > 0 ? (
                    <button onClick={goBack} className="pointer-events-auto flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-border text-sm font-bold hover:bg-secondary hover:border-accent/40 hover:text-accent transition-all group">
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                    </button>
                ) : <div />}

                {!isLastStep ? (
                    <div className="pointer-events-auto flex items-center gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={savingDraft}
                            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-50"
                        >
                            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Draft
                        </button>
                        <button onClick={goNext} className="flex items-center gap-2 px-8 py-3.5 bg-foreground text-background rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl hover:bg-accent hover:text-white group">
                            Continue <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            for (let i = 0; i < visibleSteps.length; i++) {
                                const err = validateStep(i);
                                if (err) { toast.error(`Step ${i + 1}: ${err}`); return; }
                            }
                            setConfirmOpen(true);
                        }}
                        className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 hover:bg-accent group"
                    >
                        Launch <Rocket className="w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 ml-1" />
                    </button>
                )}
            </div>

            {/* ── Confirm Launch Dialog ───────────────────────────────────────── */}
            <AnimatePresence>
                {confirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 16 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-5">
                                <Rocket className="w-7 h-7 text-primary" />
                            </div>
                            <h2 className="text-xl font-black text-foreground text-center mb-2">Confirm Launch</h2>
                            <p className="text-sm text-muted-foreground text-center mb-1">
                                You're about to launch <span className="text-foreground font-semibold">{form.title || "your event"}</span>.
                            </p>
                            <p className="text-xs text-muted-foreground text-center mb-7">
                                This will lock funds and make the event live. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmOpen(false)}
                                    className="flex-1 py-3 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { setConfirmOpen(false); setModalOpen(true); }}
                                    className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:bg-accent transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                                >
                                    <Rocket className="w-4 h-4" /> Launch
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LaunchStepModal
                open={modalOpen}
                form={launchData}
                onClose={() => setModalOpen(false)}
                onSuccess={() => router.push("/brand/dashboard")}
            />

            {/* ── Image Lightbox ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {lightboxSrc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                        onClick={() => setLightboxSrc(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.88, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={lightboxSrc}
                                alt="Preview"
                                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                            />
                            <button
                                onClick={() => setLightboxSrc(null)}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-black/70 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
