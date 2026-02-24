"use client";

import { useState } from "react";
import {
    ChevronLeft, Upload, DollarSign, Image as ImageIcon,
    Layout, Rocket, CalendarDays, ListChecks, Hash, Users, X
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = ["Details", "Schedule", "Requirements", "Rewards"];

interface FormData {
    title: string;
    type: "post" | "vote";
    description: string;
    startDate: string;
    endDate: string;
    timezone: string;
    rules: string;
    hashtags: string[];
    hashtagInput: string;
    contentType: string[];
    maxParticipants: string;
    baseReward: string;
    leaderboardPool: string;
    topPrize: string;
}

const CONTENT_TYPES = ["Photo", "Video", "Reel", "Story", "Text Post"];
const TIMEZONES = ["UTC", "EST (UTC-5)", "PST (UTC-8)", "IST (UTC+5:30)", "CET (UTC+1)"];

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start gap-2 text-sm">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-bold text-right truncate max-w-[160px]">{value}</span>
        </div>
    );
}

export default function CreateCampaignPage() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormData>({
        title: "",
        type: "post",
        description: "",
        startDate: "",
        endDate: "",
        timezone: "UTC",
        rules: "",
        hashtags: [],
        hashtagInput: "",
        contentType: ["Photo"],
        maxParticipants: "",
        baseReward: "",
        leaderboardPool: "",
        topPrize: "",
    });

    const set = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

    const addHashtag = () => {
        const tag = form.hashtagInput.replace(/^#/, "").trim();
        if (tag && !form.hashtags.includes(tag)) {
            set({ hashtags: [...form.hashtags, tag], hashtagInput: "" });
        }
    };

    const removeHashtag = (tag: string) => set({ hashtags: form.hashtags.filter((t) => t !== tag) });

    const toggleContentType = (ct: string) => {
        const updated = form.contentType.includes(ct)
            ? form.contentType.filter((c) => c !== ct)
            : [...form.contentType, ct];
        set({ contentType: updated });
    };

    const estimatedReach = form.baseReward ? Math.round((parseFloat(form.baseReward) || 0) * 640) : 0;

    const totalBudget =
        (parseFloat(form.leaderboardPool) || 0) +
        (parseFloat(form.baseReward) || 0) * (parseFloat(form.maxParticipants) || 0);

    const campaignDays = form.startDate && form.endDate
        ? Math.max(0, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-32 md:pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/brand/dashboard" className="p-2 rounded-full hover:bg-secondary transition-colors shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Create Campaign</h1>
                    <p className="text-sm text-muted-foreground">Launch a new campaign in minutes.</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center">
                {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center flex-1">
                        <button onClick={() => setStep(i)} className="flex items-center gap-2">
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors shrink-0",
                                i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            )}>
                                {i < step ? "✓" : i + 1}
                            </div>
                            <span className={cn(
                                "text-xs font-bold hidden sm:block transition-colors",
                                i === step ? "text-foreground" : "text-muted-foreground"
                            )}>{s}</span>
                        </button>
                        {i < STEPS.length - 1 && (
                            <div className={cn("flex-1 h-[2px] mx-3", i < step ? "bg-primary" : "bg-border")} />
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Step 0: Campaign Details */}
                    {step === 0 && (
                        <>
                            <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Layout className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-bold">Campaign Details</h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Nike Summer Photo Challenge"
                                        className="w-full p-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:font-normal"
                                        value={form.title}
                                        onChange={(e) => set({ title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(["post", "vote"] as const).map((t) => (
                                            <button
                                                key={t}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 text-center transition-all",
                                                    form.type === t
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-border hover:border-foreground/20"
                                                )}
                                                onClick={() => set({ type: t })}
                                            >
                                                <span className="block text-base font-black mb-0.5">
                                                    {t === "post" ? "Social Post" : "Vote Event"}
                                                </span>
                                                <span className="text-xs opacity-60">
                                                    {t === "post" ? "User-created content" : "Community voting"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                                    <textarea
                                        placeholder="Describe your campaign goals, brand story, and what you want to achieve..."
                                        className="w-full p-4 h-32 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                        value={form.description}
                                        onChange={(e) => set({ description: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground text-right">{form.description.length}/500</p>
                                </div>
                            </section>

                            {/* Cover Image */}
                            <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-bold">Cover Image</h2>
                                </div>
                                <div className="border-2 border-dashed border-border rounded-[20px] p-8 md:p-12 hover:bg-secondary/20 hover:border-primary/40 transition-colors cursor-pointer group text-center">
                                    <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors text-muted-foreground">
                                        <Upload className="w-7 h-7" />
                                    </div>
                                    <h3 className="font-bold mb-1">Upload Campaign Cover</h3>
                                    <p className="text-muted-foreground text-sm">Drag & drop or click to browse</p>
                                    <p className="text-xs text-muted-foreground/60 mt-2">PNG, JPG, WebP · Max 5MB · Recommended 1200×630</p>
                                </div>
                            </section>
                        </>
                    )}

                    {/* Step 1: Schedule */}
                    {step === 1 && (
                        <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold">Schedule</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                        value={form.startDate}
                                        onChange={(e) => set({ startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                        value={form.endDate}
                                        onChange={(e) => set({ endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timezone</label>
                                <select
                                    className="w-full p-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                                    value={form.timezone}
                                    onChange={(e) => set({ timezone: e.target.value })}
                                >
                                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                            </div>

                            {campaignDays !== null && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                                    <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                                    <p className="text-sm font-bold text-primary">Campaign runs for {campaignDays} day{campaignDays !== 1 ? "s" : ""}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Max Participants</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        placeholder="Leave blank for unlimited"
                                        className="w-full pl-11 pr-4 py-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold"
                                        value={form.maxParticipants}
                                        onChange={(e) => set({ maxParticipants: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Cap the number of entries to control quality and spend.</p>
                            </div>
                        </section>
                    )}

                    {/* Step 2: Requirements */}
                    {step === 2 && (
                        <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                                    <ListChecks className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold">Requirements</h2>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Rules</label>
                                <textarea
                                    placeholder="e.g. Must follow @NikeRunning, tag 2 friends, use #JustDoIt, photo must be taken outdoors..."
                                    className="w-full p-4 h-36 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    value={form.rules}
                                    onChange={(e) => set({ rules: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Hashtags</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Add hashtag and press Enter"
                                            className="w-full pl-9 pr-4 py-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                            value={form.hashtagInput}
                                            onChange={(e) => set({ hashtagInput: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
                                        />
                                    </div>
                                    <button
                                        onClick={addHashtag}
                                        className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        Add
                                    </button>
                                </div>
                                {form.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {form.hashtags.map((tag) => (
                                            <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold">
                                                #{tag}
                                                <button onClick={() => removeHashtag(tag)} className="hover:opacity-70 transition-opacity">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accepted Content Types</label>
                                <div className="flex flex-wrap gap-2">
                                    {CONTENT_TYPES.map((ct) => (
                                        <button
                                            key={ct}
                                            onClick={() => toggleContentType(ct)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-bold border-2 transition-all",
                                                form.contentType.includes(ct)
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-foreground/30 text-muted-foreground"
                                            )}
                                        >
                                            {ct}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Step 3: Rewards */}
                    {step === 3 && (
                        <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold">Rewards & Budget</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Reward / Participant</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">$</span>
                                        <input
                                            type="number"
                                            placeholder="0.50"
                                            className="w-full pl-8 pr-4 py-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold text-lg"
                                            value={form.baseReward}
                                            onChange={(e) => set({ baseReward: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Every valid submission earns this amount.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leaderboard Pool</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">$</span>
                                        <input
                                            type="number"
                                            placeholder="5000"
                                            className="w-full pl-8 pr-4 py-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold text-lg"
                                            value={form.leaderboardPool}
                                            onChange={(e) => set({ leaderboardPool: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Distributed to top performers on the leaderboard.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Prize (1st Place)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        placeholder="500"
                                        className="w-full pl-8 pr-4 py-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold text-lg"
                                        value={form.topPrize}
                                        onChange={(e) => set({ topPrize: e.target.value })}
                                    />
                                </div>
                            </div>

                            {(form.baseReward || form.leaderboardPool) && (
                                <div className="p-5 bg-secondary/30 rounded-xl border border-border space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Breakdown</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Participation Rewards</span>
                                        <span className="font-bold font-mono">${((parseFloat(form.baseReward) || 0) * (parseFloat(form.maxParticipants) || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Leaderboard Pool</span>
                                        <span className="font-bold font-mono">${(parseFloat(form.leaderboardPool) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="h-[1px] bg-border" />
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">Total Budget</span>
                                        <span className="font-black text-primary font-mono">${totalBudget.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Step Navigation */}
                    <div className="flex justify-between pt-2">
                        <button
                            onClick={() => setStep((s) => Math.max(0, s - 1))}
                            disabled={step === 0}
                            className="px-6 py-3 rounded-xl border border-border font-bold text-sm hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        {step < STEPS.length - 1 && (
                            <button
                                onClick={() => setStep((s) => s + 1)}
                                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                            >
                                Next: {STEPS[step + 1]}
                            </button>
                        )}
                    </div>
                </div>

                {/* Sticky Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                        {estimatedReach > 0 && (
                            <div className="bg-primary/5 border border-primary/20 rounded-[20px] p-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Estimated Reach</p>
                                <p className="text-3xl font-black text-primary">~{estimatedReach.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-1">Users in your target demographic</p>
                            </div>
                        )}

                        <div className="bg-card border border-border rounded-[20px] p-5 shadow-sm space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Summary</h3>
                            <div className="space-y-2.5">
                                <Row label="Title" value={form.title || "—"} />
                                <Row label="Type" value={form.type === "post" ? "Social Post" : "Vote Event"} />
                                <Row label="Start" value={form.startDate ? new Date(form.startDate).toLocaleDateString() : "—"} />
                                <Row label="End" value={form.endDate ? new Date(form.endDate).toLocaleDateString() : "—"} />
                                <Row label="Max Participants" value={form.maxParticipants || "Unlimited"} />
                                <Row label="Base Reward" value={form.baseReward ? `$${form.baseReward}` : "—"} />
                                <Row label="Leaderboard Pool" value={form.leaderboardPool ? `$${form.leaderboardPool}` : "—"} />
                                {form.hashtags.length > 0 && (
                                    <Row label="Hashtags" value={form.hashtags.map((t) => `#${t}`).join(", ")} />
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => console.log("Launch", form)}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                        >
                            <Rocket className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                            Launch Campaign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
