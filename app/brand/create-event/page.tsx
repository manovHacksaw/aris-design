"use client";

import { useState } from "react";
import {
    ChevronLeft, Upload, DollarSign, Image as ImageIcon,
    Rocket, CalendarDays, ListChecks, Hash, Users, X, ChevronDown, Camera
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = ["Details", "Schedule", "Requirements", "Rewards"];
const STEP_TITLES = ["Event Details", "Schedule", "Requirements", "Rewards & Budget"];
const CONTENT_CATEGORIES = ["Photography", "Art", "Sports", "Fashion", "Food", "Travel", "Music", "Tech"];

interface FormData {
    title: string;
    type: "post" | "vote" | "post_and_vote";
    contentCategory: string;
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

/** Input field with label floating on the top border */
function Field({
    label,
    labelPrefix,
    children,
    className,
}: {
    label: string;
    labelPrefix?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("relative border border-border rounded-xl px-4 py-3 bg-card", className)}>
            <div className="absolute -top-[9px] left-3 flex items-center gap-1 bg-card px-1">
                {labelPrefix}
                <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
            </div>
            {children}
        </div>
    );
}

export default function CreateCampaignPage() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormData>({
        title: "",
        type: "post",
        contentCategory: "Photography",
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

    const removeHashtag = (tag: string) =>
        set({ hashtags: form.hashtags.filter((t) => t !== tag) });

    const toggleContentType = (ct: string) => {
        const updated = form.contentType.includes(ct)
            ? form.contentType.filter((c) => c !== ct)
            : [...form.contentType, ct];
        set({ contentType: updated });
    };

    const estimatedReach = form.baseReward
        ? Math.round((parseFloat(form.baseReward) || 0) * 640)
        : 0;

    const totalBudget =
        (parseFloat(form.leaderboardPool) || 0) +
        (parseFloat(form.baseReward) || 0) * (parseFloat(form.maxParticipants) || 0);

    const campaignDays =
        form.startDate && form.endDate
            ? Math.max(
                  0,
                  Math.round(
                      (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                  )
              )
            : null;

    return (
        <div className="w-full min-h-full flex flex-col">

            {/* ── Header: title left, step bars fill remaining space ── */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href="/brand/dashboard"
                        className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold whitespace-nowrap">{STEP_TITLES[step]}</h1>
                </div>

                {/* Step progress bars — fill remaining header width */}
                <div className="flex flex-1 gap-2">
                    {STEPS.map((s, i) => (
                        <button
                            key={s}
                            onClick={() => setStep(i)}
                            className={cn(
                                "flex-1 h-[3px] rounded-full transition-colors",
                                i <= step ? "bg-primary" : "bg-border"
                            )}
                            aria-label={s}
                        />
                    ))}
                </div>
            </div>

            {/* ── Form content — centred, max-w matches the screenshot width ── */}
            <div className="w-full max-w-xl mx-auto space-y-5 flex-1">

                {/* ═══════════════════════════════════════
                    Step 0 – Event Details
                ════════════════════════════════════════ */}
                {step === 0 && (
                    <>
                        {/* Guidelines card with floating label */}
                        <div className="relative border border-border rounded-xl p-5 bg-card">
                            <div className="absolute -top-[9px] left-3 bg-card px-1">
                                <span className="text-[11px] text-muted-foreground leading-none">
                                    Guidelines
                                </span>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground pt-1">
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Vote counts are revealed at the end of the event</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>
                                        <strong className="text-foreground">Vote Event</strong>
                                        {" – "}Users vote on content that you post
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>
                                        <strong className="text-foreground">Post and Vote Event</strong>
                                        {" – "}Phase 1&nbsp;: Users post content,
                                        <br />
                                        Phase 2&nbsp;:{" "}
                                        <strong className="text-foreground">VOTE EVENT</strong> with user posts
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>
                                        Choose a fitting Title and Description to make it interesting for users
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Event Title */}
                        <Field label="Event Title">
                            <input
                                type="text"
                                placeholder="e.g. Nike Summer Photo Challenge"
                                className="w-full bg-transparent outline-none font-medium text-foreground placeholder:text-muted-foreground/40 mt-0.5"
                                value={form.title}
                                onChange={(e) => set({ title: e.target.value })}
                            />
                        </Field>

                        {/* Event Type  +  Content Category */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Event Type */}
                            <Field
                                label="Event Type"
                                labelPrefix={
                                    <span className="w-3 h-3 rounded-full border border-muted-foreground inline-flex items-center justify-center text-[8px] leading-none text-muted-foreground">
                                        +
                                    </span>
                                }
                            >
                                <div className="flex items-center justify-between mt-0.5">
                                    <select
                                        className="flex-1 bg-transparent outline-none font-medium appearance-none text-foreground cursor-pointer"
                                        value={form.type}
                                        onChange={(e) =>
                                            set({ type: e.target.value as FormData["type"] })
                                        }
                                    >
                                        <option value="post">Post</option>
                                        <option value="vote">Vote</option>
                                        <option value="post_and_vote">Post &amp; Vote</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />
                                </div>
                            </Field>

                            {/* Content Category */}
                            <Field label="Content Category" className="relative overflow-visible">
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5">
                                        <Camera className="w-3 h-3" />
                                        {form.contentCategory}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />
                                </div>
                                {/* Invisible overlay select */}
                                <select
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    value={form.contentCategory}
                                    onChange={(e) => set({ contentCategory: e.target.value })}
                                >
                                    {CONTENT_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        {/* Description */}
                        <Field label="Description">
                            <textarea
                                placeholder="Describe your campaign goals, brand story, and what you want to achieve..."
                                className="w-full bg-transparent outline-none resize-none h-28 font-medium text-foreground placeholder:text-muted-foreground/40 mt-0.5"
                                value={form.description}
                                onChange={(e) => set({ description: e.target.value })}
                            />
                        </Field>

                        {/* Cover Image */}
                        <Field label="Cover Image" labelPrefix={<ImageIcon className="w-3 h-3 text-muted-foreground" />}>
                            <div className="border border-dashed border-border rounded-xl p-6 hover:bg-secondary/20 hover:border-primary/40 transition-colors cursor-pointer group text-center mt-1">
                                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors text-muted-foreground">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Drag &amp; drop or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground/50 mt-1">
                                    PNG, JPG, WebP · Max 5MB · 1200×630
                                </p>
                            </div>
                        </Field>
                    </>
                )}

                {/* ═══════════════════════════════════════
                    Step 1 – Schedule
                ════════════════════════════════════════ */}
                {step === 1 && (
                    <>
                        {/* Info card — same floating-label style as Guidelines */}
                        <div className="relative border border-border rounded-xl p-5 bg-card">
                            <div className="absolute -top-[9px] left-3 flex items-center gap-1.5 bg-card px-1">
                                <CalendarDays className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground leading-none">Schedule</span>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground pt-1">
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Set start and end dates to define the campaign window</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Vote counts and results are revealed only after the end date</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Capping participants helps control quality and total spend</span>
                                </li>
                            </ul>
                        </div>

                        {/* Start + End dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Date &amp; Time">
                                <input
                                    type="datetime-local"
                                    className="w-full bg-transparent outline-none font-medium text-foreground mt-0.5"
                                    value={form.startDate}
                                    onChange={(e) => set({ startDate: e.target.value })}
                                />
                            </Field>
                            <Field label="End Date &amp; Time">
                                <input
                                    type="datetime-local"
                                    className="w-full bg-transparent outline-none font-medium text-foreground mt-0.5"
                                    value={form.endDate}
                                    onChange={(e) => set({ endDate: e.target.value })}
                                />
                            </Field>
                        </div>

                        {/* Timezone */}
                        <Field label="Timezone">
                            <div className="flex items-center justify-between mt-0.5">
                                <select
                                    className="flex-1 bg-transparent outline-none font-medium appearance-none text-foreground cursor-pointer"
                                    value={form.timezone}
                                    onChange={(e) => set({ timezone: e.target.value })}
                                >
                                    {TIMEZONES.map((tz) => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none" />
                            </div>
                        </Field>

                        {/* Campaign duration pill */}
                        {campaignDays !== null && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                                <p className="text-sm font-bold text-primary">
                                    Campaign runs for {campaignDays} day{campaignDays !== 1 ? "s" : ""}
                                </p>
                            </div>
                        )}

                        {/* Max Participants */}
                        <Field
                            label="Max Participants"
                            labelPrefix={<Users className="w-3 h-3 text-muted-foreground" />}
                        >
                            <input
                                type="number"
                                placeholder="Leave blank for unlimited"
                                className="w-full bg-transparent outline-none font-medium text-foreground placeholder:text-muted-foreground/40 mt-0.5"
                                value={form.maxParticipants}
                                onChange={(e) => set({ maxParticipants: e.target.value })}
                            />
                        </Field>
                    </>
                )}

                {/* ═══════════════════════════════════════
                    Step 2 – Requirements
                ════════════════════════════════════════ */}
                {step === 2 && (
                    <>
                        {/* Info card */}
                        <div className="relative border border-border rounded-xl p-5 bg-card">
                            <div className="absolute -top-[9px] left-3 flex items-center gap-1.5 bg-card px-1">
                                <ListChecks className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground leading-none">Requirements</span>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground pt-1">
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Define clear rules so participants know exactly what is expected</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Add required hashtags that participants must include in their posts</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Select which content formats are accepted for submissions</span>
                                </li>
                            </ul>
                        </div>

                        {/* Campaign Rules */}
                        <Field label="Campaign Rules">
                            <textarea
                                placeholder="e.g. Must follow @NikeRunning, tag 2 friends, use #JustDoIt, photo must be taken outdoors..."
                                className="w-full bg-transparent outline-none resize-none h-36 font-medium text-foreground placeholder:text-muted-foreground/40 mt-0.5"
                                value={form.rules}
                                onChange={(e) => set({ rules: e.target.value })}
                            />
                        </Field>

                        {/* Required Hashtags */}
                        <Field
                            label="Required Hashtags"
                            labelPrefix={<Hash className="w-3 h-3 text-muted-foreground" />}
                        >
                            <div className="flex items-center gap-2 mt-0.5">
                                <input
                                    type="text"
                                    placeholder="Add hashtag and press Enter"
                                    className="flex-1 bg-transparent outline-none font-medium text-foreground placeholder:text-muted-foreground/40"
                                    value={form.hashtagInput}
                                    onChange={(e) => set({ hashtagInput: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); addHashtag(); }
                                    }}
                                />
                                <button
                                    onClick={addHashtag}
                                    className="px-3 py-1 bg-primary text-primary-foreground rounded-lg font-bold text-xs hover:opacity-90 transition-opacity shrink-0"
                                >
                                    Add
                                </button>
                            </div>
                            {form.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {form.hashtags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold"
                                        >
                                            #{tag}
                                            <button
                                                onClick={() => removeHashtag(tag)}
                                                className="hover:opacity-70 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Field>

                        {/* Accepted Content Types */}
                        <Field label="Accepted Content Types">
                            <div className="flex flex-wrap gap-2 mt-2">
                                {CONTENT_TYPES.map((ct) => (
                                    <button
                                        key={ct}
                                        onClick={() => toggleContentType(ct)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all",
                                            form.contentType.includes(ct)
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-foreground/30 text-muted-foreground"
                                        )}
                                    >
                                        {ct}
                                    </button>
                                ))}
                            </div>
                        </Field>
                    </>
                )}

                {/* ═══════════════════════════════════════
                    Step 3 – Rewards
                ════════════════════════════════════════ */}
                {step === 3 && (
                    <>
                        {/* Info card */}
                        <div className="relative border border-border rounded-xl p-5 bg-card">
                            <div className="absolute -top-[9px] left-3 flex items-center gap-1.5 bg-card px-1">
                                <DollarSign className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground leading-none">Rewards &amp; Budget</span>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground pt-1">
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Base reward is paid to every participant with a valid submission</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Leaderboard pool is split among top-ranked participants</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>Top prize is awarded exclusively to the 1st place winner</span>
                                </li>
                            </ul>
                        </div>

                        {/* Base Reward + Leaderboard Pool */}
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Base Reward / Participant">
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-muted-foreground font-bold">$</span>
                                    <input
                                        type="number"
                                        placeholder="0.50"
                                        className="flex-1 bg-transparent outline-none font-mono font-bold text-foreground placeholder:text-muted-foreground/40"
                                        value={form.baseReward}
                                        onChange={(e) => set({ baseReward: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">Every valid submission earns this.</p>
                            </Field>

                            <Field label="Leaderboard Pool">
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-muted-foreground font-bold">$</span>
                                    <input
                                        type="number"
                                        placeholder="5000"
                                        className="flex-1 bg-transparent outline-none font-mono font-bold text-foreground placeholder:text-muted-foreground/40"
                                        value={form.leaderboardPool}
                                        onChange={(e) => set({ leaderboardPool: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">Split among top performers.</p>
                            </Field>
                        </div>

                        {/* Top Prize */}
                        <Field label="Top Prize (1st Place)">
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-muted-foreground font-bold">$</span>
                                <input
                                    type="number"
                                    placeholder="500"
                                    className="flex-1 bg-transparent outline-none font-mono font-bold text-foreground placeholder:text-muted-foreground/40"
                                    value={form.topPrize}
                                    onChange={(e) => set({ topPrize: e.target.value })}
                                />
                            </div>
                        </Field>

                        {/* Budget Breakdown — uses same floating-label card */}
                        {(form.baseReward || form.leaderboardPool) && (
                            <div className="relative border border-border rounded-xl p-5 bg-card">
                                <div className="absolute -top-[9px] left-3 bg-card px-1">
                                    <span className="text-[11px] text-muted-foreground leading-none">Budget Breakdown</span>
                                </div>
                                <div className="space-y-3 pt-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Participation Rewards</span>
                                        <span className="font-bold font-mono">
                                            ${(
                                                (parseFloat(form.baseReward) || 0) *
                                                (parseFloat(form.maxParticipants) || 0)
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Leaderboard Pool</span>
                                        <span className="font-bold font-mono">
                                            ${(parseFloat(form.leaderboardPool) || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-[1px] bg-border" />
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">Total Budget</span>
                                        <span className="font-black text-primary font-mono">
                                            ${totalBudget.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Estimated Reach */}
                        {estimatedReach > 0 && (
                            <div className="relative border border-primary/30 rounded-xl p-5 bg-primary/5">
                                <div className="absolute -top-[9px] left-3 bg-card px-1">
                                    <span className="text-[11px] text-primary leading-none font-bold">Estimated Reach</span>
                                </div>
                                <p className="text-3xl font-black text-primary pt-1">
                                    ~{estimatedReach.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Users in your target demographic
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Navigation ── */}
                <div className="flex justify-center pt-4 pb-10">
                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep((s) => s + 1)}
                            className="px-16 py-3 bg-primary text-primary-foreground rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={() => console.log("Launch", form)}
                            className="px-12 py-3 bg-primary text-primary-foreground rounded-full font-black text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            <Rocket className="w-4 h-4" />
                            Launch Campaign
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
