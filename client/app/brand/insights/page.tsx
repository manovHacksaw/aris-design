"use client";

import { useEffect, useState } from "react";
import { getBrandEvents } from "@/services/event.service";
import { getBrandAnalyticsOverview } from "@/services/brand.service";
import type { Event } from "@/services/event.service";
import { cn } from "@/lib/utils";
import {
    BarChart2, Trophy, Users, CheckCircle2, Zap,
    ChevronDown, ChevronUp, Save, Lightbulb,
    Activity, Target, Shuffle, ArrowUpRight, Scale, Vote,
    ImagePlus, Loader2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    LineChart, Line, TooltipProps
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GenderCounts {
    male: number; female: number; nonBinary: number; other: number; unknown: number;
}
interface AgeGroupCounts {
    "24_under": number; "25_34": number; "35_44": number;
    "45_54": number; "55_64": number; "65_plus": number; unknown: number;
}
interface EventSummary {
    eventId: string; title: string; eventType: "post_and_vote" | "vote_only";
    status: string; totalVotes: number; totalSubmissions: number;
    uniqueParticipants: number; winningMargin: number; entropy: number;
    normalizedEntropy: number; historicalAlignment: number;
    topContentVotePercent: number; votesByGender: GenderCounts;
    votesByAgeGroup: AgeGroupCounts;
}
interface BrandAnalytics {
    totalEvents: number; totalVoteEvents: number; totalPostEvents: number;
    totalVotesAcrossEvents: number; totalUniqueParticipants: number;
    averageHistoricalAlignment: number; avgParticipantTrustScore: number;
    averageEntropy: number; averageWinningMargin: number;
    decisionConfidenceScore: number; overallVotesByGender: GenderCounts;
    overallVotesByAgeGroup: AgeGroupCounts; eventsSummary: EventSummary[];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "aris_brand_insights";
function loadInsights(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveInsight(id: string, text: string) {
    const c = loadInsights(); c[id] = text;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

// ─── Chart theme ──────────────────────────────────────────────────────────────

const CHART_COLORS = {
    cyan: "#06b6d4",
    blue: "#3B82F6",
    violet: "#8B5CF6",
    gray: "#6B7280",
    emerald: "#10b981",
    amber: "#f59e0b",
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
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="font-bold text-white/50 capitalize">{p.name}</span>
                    <span className="font-black text-white ml-2">{p.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
    return (
        <div className="flex items-center gap-4 flex-wrap">
            {items.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function ChartCard({
    title, legend, axisLabel, filterButtons, filterValue, onFilter, children, empty
}: {
    title: string;
    legend: { color: string; label: string }[];
    axisLabel?: string;
    filterButtons?: string[];
    filterValue?: string;
    onFilter?: (v: string) => void;
    children: React.ReactNode;
    empty?: boolean;
}) {
    return (
        <div className="bg-card border border-white/[0.06] rounded-[22px] overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-display uppercase tracking-widest text-white text-sm pt-1">{title}</h3>
                    {filterButtons && (
                        <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full p-1 gap-0.5">
                            {filterButtons.map(btn => (
                                <button
                                    key={btn}
                                    onClick={() => onFilter?.(btn)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                                        filterValue === btn
                                            ? "bg-white/10 text-white"
                                            : "text-white/30 hover:text-white/60"
                                    )}
                                >
                                    {btn}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <ChartLegend items={legend} />
                    {axisLabel && (
                        <span className="text-[10px] text-white/20 font-bold hidden sm:block">{axisLabel}</span>
                    )}
                </div>
            </div>

            {/* Chart area */}
            <div className="px-2 pt-3 pb-2">
                {empty ? (
                    <div className="h-[220px] flex items-center justify-center">
                        <p className="text-sm text-white/20 font-bold">No event history found</p>
                    </div>
                ) : (
                    <div className="h-[220px]">{children}</div>
                )}
            </div>
        </div>
    );
}

// ─── Participants Area Chart ──────────────────────────────────────────────────

type ParticipantFilter = "5" | "10" | "All";

function ParticipantsChart({ summaries }: { summaries: EventSummary[] }) {
    const [filter, setFilter] = useState<ParticipantFilter>("All");

    const sliced = filter === "All" ? summaries : summaries.slice(-Number(filter));
    const data = sliced.map(s => ({
        name: s.title.length > 14 ? s.title.slice(0, 13) + "…" : s.title,
        participants: s.uniqueParticipants,
        votes: s.totalVotes,
    }));

    return (
        <ChartCard
            title="Unique Participants"
            legend={[
                { color: CHART_COLORS.cyan, label: "Participants" },
                { color: CHART_COLORS.blue, label: "Votes" },
            ]}
            axisLabel="X — Events   Y — Count"
            filterButtons={["5", "10", "All"]}
            filterValue={filter}
            onFilter={(v) => setFilter(v as ParticipantFilter)}
            empty={data.length === 0}
        >
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
                    <Area
                        type="monotone" dataKey="participants" name="Participants"
                        stroke={CHART_COLORS.cyan} strokeWidth={2}
                        fill="url(#gradCyan)" dot={{ fill: CHART_COLORS.cyan, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: CHART_COLORS.cyan, strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone" dataKey="votes" name="Votes"
                        stroke={CHART_COLORS.blue} strokeWidth={2}
                        fill="url(#gradBlue)" dot={{ fill: CHART_COLORS.blue, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: CHART_COLORS.blue, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

// ─── Demographic Bar Chart ────────────────────────────────────────────────────

const AGE_LABELS: Record<string, string> = {
    "24_under": "24 & UNDER", "25_34": "25 - 34", "35_44": "35 - 44",
    "45_54": "45 - 54", "55_64": "55 - 64", "65_plus": "65+"
};

function DemographicChart({ genderData, ageData, totalVotes }: {
    genderData: GenderCounts; ageData: AgeGroupCounts; totalVotes: number;
}) {
    const safeTotal = totalVotes || 1;
    const malePct = genderData.male / safeTotal;
    const femalePct = genderData.female / safeTotal;
    const othersPct = (genderData.nonBinary + genderData.other + genderData.unknown) / safeTotal;

    const data = (Object.keys(AGE_LABELS) as (keyof AgeGroupCounts)[]).map(age => {
        const t = ageData[age] || 0;
        return {
            age: AGE_LABELS[age],
            male: Math.round(t * malePct),
            female: Math.round(t * femalePct),
            others: Math.round(t * othersPct),
        };
    });

    const hasData = data.some(d => d.male + d.female + d.others > 0);

    return (
        <ChartCard
            title="User Demographic"
            legend={[
                { color: CHART_COLORS.cyan, label: "Male" },
                { color: CHART_COLORS.blue, label: "Female" },
                { color: CHART_COLORS.gray, label: "Others" },
            ]}
            axisLabel="X — Age   Y — Engagement"
            empty={!hasData}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid {...GRID_STYLE} vertical={false} />
                    <XAxis dataKey="age" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="male" name="Male" fill={CHART_COLORS.cyan} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="female" name="Female" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="others" name="Others" fill={CHART_COLORS.gray} radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

// ─── Decision Quality Chart ───────────────────────────────────────────────────

function DecisionQualityChart({ summaries }: { summaries: EventSummary[] }) {
    const data = summaries
        .filter(s => s.totalVotes > 0)
        .slice(-10)
        .map(s => ({
            name: s.title.length > 12 ? s.title.slice(0, 11) + "…" : s.title,
            margin: parseFloat(s.winningMargin.toFixed(1)),
            alignment: parseFloat((s.historicalAlignment * 100).toFixed(1)),
            entropy: parseFloat((s.normalizedEntropy * 100).toFixed(1)),
        }));

    const hasData = data.length > 0;

    return (
        <ChartCard
            title="Decision Quality per Event"
            legend={[
                { color: CHART_COLORS.emerald, label: "Winning Margin (xiii)" },
                { color: CHART_COLORS.violet, label: "Hist. Alignment — AHA (ix)" },
                { color: CHART_COLORS.amber, label: "Norm. Entropy × 100 (xv)" },
            ]}
            axisLabel="X — Events   Y — %"
            empty={!hasData}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="margin" name="Winning Margin"
                        stroke={CHART_COLORS.emerald} strokeWidth={2}
                        dot={{ fill: CHART_COLORS.emerald, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="alignment" name="Hist. Alignment"
                        stroke={CHART_COLORS.violet} strokeWidth={2}
                        dot={{ fill: CHART_COLORS.violet, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="entropy" name="Norm. Entropy ×100"
                        stroke={CHART_COLORS.amber} strokeWidth={2} strokeDasharray="4 3"
                        dot={{ fill: CHART_COLORS.amber, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

// ─── DCS Gauge ───────────────────────────────────────────────────────────────

function DCSGauge({ score }: { score: number }) {
    const pct = Math.min(Math.max(score, 0), 1);
    const circumference = 2 * Math.PI * 40;
    const offset = circumference * (1 - pct);
    const color = pct >= 0.7 ? CHART_COLORS.emerald : pct >= 0.45 ? CHART_COLORS.amber : "#ef4444";
    const label = pct >= 0.7 ? "High" : pct >= 0.45 ? "Moderate" : "Low";

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-[72px] h-[72px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" strokeWidth="8" fill="transparent" stroke="rgba(255,255,255,0.07)" />
                    <motion.circle
                        cx="48" cy="48" r="40" strokeWidth="8" strokeLinecap="round"
                        fill="transparent" stroke={color}
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-black text-foreground">{Math.round(pct * 100)}%</span>
                </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{label}</p>
            <p className="text-[10px] text-foreground/25">Decision Confidence</p>
        </div>
    );
}

// ─── Metric Tile ─────────────────────────────────────────────────────────────

function MetricTile({ icon, label, value, sub, color }: {
    icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
    return (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
                {icon}
                <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-wider truncate">{label}</span>
            </div>
            <p className={cn("text-xl font-black", color)}>{value}</p>
            <p className="text-[10px] text-foreground/25 mt-0.5 leading-tight">{sub}</p>
        </div>
    );
}

// ─── Event Insight Card ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    posting: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    voting: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    scheduled: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};
const STATUS_LABELS: Record<string, string> = {
    completed: "Completed", posting: "Active", voting: "Voting",
    draft: "Draft", scheduled: "Scheduled",
};

function EventInsightCard({ event, summary }: { event: Event; summary?: EventSummary }) {
    const [expanded, setExpanded] = useState(false);
    const [note, setNote] = useState(() => loadInsights()[event.id] ?? "");
    const [saved, setSaved] = useState(false);
    const coverUrl = event.imageUrl || (event.imageCid ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}` : null);
    const votes = summary?.totalVotes ?? event._count?.votes ?? 0;
    const submissions = summary?.totalSubmissions ?? event._count?.submissions ?? 0;

    function handleSave() {
        saveInsight(event.id, note);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    // Per-event demographic chart data
    const perEventDemoData = summary && summary.totalVotes > 0
        ? (Object.keys(AGE_LABELS) as (keyof AgeGroupCounts)[]).map(age => {
            const t = summary.votesByAgeGroup[age] || 0;
            const st = summary.totalVotes || 1;
            const mp = summary.votesByGender.male / st;
            const fp = summary.votesByGender.female / st;
            const op = (summary.votesByGender.nonBinary + summary.votesByGender.other + summary.votesByGender.unknown) / st;
            return {
                age: AGE_LABELS[age], total: t,
                male: Math.round(t * mp), female: Math.round(t * fp), others: Math.round(t * op),
            };
        })
        : [];

    const hasDemoData = perEventDemoData.some(d => d.total > 0);

    return (
        <div className="bg-card border border-white/[0.06] rounded-[20px] overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
            >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {coverUrl
                        ? <img src={coverUrl} alt={event.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><BarChart2 className="w-4 h-4 text-white/10" /></div>
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", STATUS_STYLES[event.status] ?? STATUS_STYLES.draft)}>
                            {STATUS_LABELS[event.status] ?? event.status}
                        </span>
                        <span className="text-[10px] font-bold text-foreground/25 uppercase tracking-wider">
                            {event.eventType === "vote_only" ? "Vote-only" : "Post & Vote"}
                        </span>
                    </div>
                    <h3 className="font-black text-sm text-foreground line-clamp-1">{event.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(event.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                </div>

                <div className="hidden md:flex items-center gap-5 shrink-0">
                    {[
                        { label: "Votes", value: votes },
                        { label: "Posts", value: submissions },
                        ...(summary ? [
                            { label: "Top %", value: `${summary.topContentVotePercent.toFixed(0)}%` },
                            { label: "Margin", value: `${summary.winningMargin.toFixed(0)}%` },
                        ] : []),
                    ].map(s => (
                        <div key={s.label} className="text-center">
                            <p className="text-sm font-black text-foreground">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                        </div>
                    ))}
                </div>

                {note && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                <div className="text-white/20 shrink-0">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-white/[0.05] px-5 py-5 space-y-5">
                            {/* Decision quality tiles */}
                            {summary && summary.totalVotes > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <MetricTile icon={<Target className="w-3.5 h-3.5 text-emerald-400" />}
                                        label="Winning Margin (xiii)" value={`${summary.winningMargin.toFixed(1)}%`}
                                        sub="lead of #1 over #2" color="text-emerald-400" />
                                    <MetricTile icon={<Vote className="w-3.5 h-3.5 text-blue-400" />}
                                        label="Top Content % (vii)" value={`${summary.topContentVotePercent.toFixed(1)}%`}
                                        sub="share of all votes" color="text-blue-400" />
                                    <MetricTile icon={<Shuffle className="w-3.5 h-3.5 text-amber-400" />}
                                        label="Entropy (xiv/xv)" value={summary.entropy.toFixed(2)}
                                        sub={`norm: ${summary.normalizedEntropy.toFixed(2)}`} color="text-amber-400" />
                                    <MetricTile icon={<Scale className="w-3.5 h-3.5 text-violet-400" />}
                                        label="Hist. Alignment (ix)" value={`${(summary.historicalAlignment * 100).toFixed(1)}%`}
                                        sub="winner consensus" color="text-violet-400" />
                                </div>
                            )}

                            {/* Per-event demographic chart */}
                            {hasDemoData && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/30 mb-3">
                                        Voter Demographics
                                    </p>
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-3">
                                        <ChartLegend items={[
                                            { color: CHART_COLORS.cyan, label: "Male (x)" },
                                            { color: CHART_COLORS.blue, label: "Female (x)" },
                                            { color: CHART_COLORS.gray, label: "Others" },
                                        ]} />
                                        <div className="h-[160px] mt-3">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={perEventDemoData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                                                    <CartesianGrid {...GRID_STYLE} vertical={false} />
                                                    <XAxis dataKey="age" tick={{ ...TICK_STYLE, fontSize: 9 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                                                    <Bar dataKey="male" name="Male" fill={CHART_COLORS.cyan} radius={[2, 2, 0, 0]} maxBarSize={16} />
                                                    <Bar dataKey="female" name="Female" fill={CHART_COLORS.blue} radius={[2, 2, 0, 0]} maxBarSize={16} />
                                                    <Bar dataKey="others" name="Others" fill={CHART_COLORS.gray} radius={[2, 2, 0, 0]} maxBarSize={16} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rewards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-primary/8 border border-primary/20 rounded-[14px] p-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-wider">Base Pool</p>
                                        <p className="font-black text-foreground text-sm">
                                            {event.baseReward ? `$${event.baseReward}/vote` : "—"}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-[14px] p-3 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-yellow-400/70 font-bold uppercase tracking-wider">Top Pool</p>
                                        <p className="font-black text-foreground text-sm">
                                            {event.leaderboardPool ? `$${event.leaderboardPool.toLocaleString()}`
                                                : event.topReward ? `$${event.topReward.toLocaleString()}` : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-primary" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.15em] text-foreground/50">Outcome Notes</h4>
                                </div>
                                <textarea
                                    value={note} onChange={(e) => setNote(e.target.value)}
                                    placeholder="What worked? What would you change? Key learnings…"
                                    className="w-full min-h-[80px] bg-white/[0.03] border border-white/[0.07] rounded-[14px] px-4 py-3 text-sm text-foreground placeholder:text-white/20 resize-y focus:outline-none focus:border-primary/50 transition-colors font-medium leading-relaxed"
                                />
                                <div className="flex items-center justify-between">
                                    <Link href={`/brand/events/${event.id}`}
                                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        Full Campaign Analytics
                                    </Link>
                                    <button
                                        onClick={handleSave}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                                            saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                                : "bg-primary text-primary-foreground hover:opacity-90"
                                        )}
                                    >
                                        {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                        {saved ? "Saved" : "Save Note"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type FilterTab = "all" | "completed" | "active";

export default function BrandInsightsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [analytics, setAnalytics] = useState<BrandAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>("all");

    useEffect(() => {
        Promise.allSettled([getBrandEvents(), getBrandAnalyticsOverview()])
            .then(([evtsResult, analyticsResult]) => {
                if (evtsResult.status === "fulfilled") setEvents(evtsResult.value);
                if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value);
            })
            .finally(() => setLoading(false));
    }, []);

    const summaryMap = new Map<string, EventSummary>(
        (analytics?.eventsSummary ?? []).map(s => [s.eventId, s])
    );

    const filtered = events.filter(e => {
        if (filter === "completed") return e.status === "completed";
        if (filter === "active") return e.status === "posting" || e.status === "voting";
        return true;
    });

    const dcs = analytics?.decisionConfidenceScore ?? 0;
    const totalVotes = analytics?.totalVotesAcrossEvents ?? 0;

    const kpiCards = [
        {
            label: "Total Events", icon: BarChart2, color: "text-primary", bg: "bg-primary/10",
            value: loading ? "—" : (analytics?.totalEvents ?? events.length),
            sub: analytics ? `${analytics.totalVoteEvents} vote · ${analytics.totalPostEvents} post` : "",
        },
        {
            label: "Total Votes", icon: Vote, color: "text-cyan-400", bg: "bg-cyan-500/10",
            value: loading ? "—" : totalVotes.toLocaleString(),
            sub: analytics ? `${analytics.totalUniqueParticipants.toLocaleString()} unique voters` : "",
        },
        {
            label: "Avg Winning Margin", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10",
            value: loading ? "—" : `${(analytics?.averageWinningMargin ?? 0).toFixed(1)}%`,
            sub: "lead of #1 over #2 (xiii)",
        },
        {
            label: "Decision Confidence", icon: Activity,
            color: dcs >= 0.7 ? "text-emerald-400" : dcs >= 0.45 ? "text-amber-400" : "text-red-400",
            bg: dcs >= 0.7 ? "bg-emerald-500/10" : dcs >= 0.45 ? "bg-amber-500/10" : "bg-red-500/10",
            value: loading ? "—" : `${Math.round(dcs * 100)}%`,
            sub: "DCS quality signal (xviii)",
        },
    ];

    return (
        <div className="space-y-6 pb-32 md:pb-12 font-sans">
            {/* Header */}
            <header>
                <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight mb-1">
                    Insights
                </h1>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Campaign analytics, decision quality signals, and audience demographics</p>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map(card => (
                    <div key={card.label} className="bg-card border border-white/[0.06] rounded-[22px] p-5 space-y-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.bg)}>
                            <card.icon className={cn("w-4 h-4", card.color)} />
                        </div>
                        <div>
                            <p className={cn("font-display text-3xl uppercase tracking-tight", card.color)}>{card.value}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{card.label}</p>
                            {card.sub && <p className="text-[10px] text-foreground/25 mt-1">{card.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts row 1: Participants + Demographics */}
            {loading ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-[320px] bg-card border border-white/[0.06] rounded-[22px] animate-pulse" />)}
                </div>
            ) : analytics ? (
                <div className="grid md:grid-cols-2 gap-4">
                    <ParticipantsChart summaries={analytics.eventsSummary} />
                    <DemographicChart
                        genderData={analytics.overallVotesByGender}
                        ageData={analytics.overallVotesByAgeGroup}
                        totalVotes={totalVotes}
                    />
                </div>
            ) : null}

            {/* Charts row 2: Decision quality line chart + DCS summary */}
            {analytics && analytics.eventsSummary.some(s => s.totalVotes > 0) && (
                <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
                    <DecisionQualityChart summaries={analytics.eventsSummary} />

                    {/* DCS + Brand summary */}
                    <div className="bg-card border border-white/[0.06] rounded-[22px] p-5 flex flex-col items-center gap-4 min-w-[200px]">
                        <DCSGauge score={dcs} />
                        <div className="w-full space-y-3 pt-2 border-t border-white/[0.05]">
                            {[
                                { label: "Avg Entropy (xiv)", value: analytics.averageEntropy.toFixed(2), color: "text-amber-400" },
                                { label: "AHA (xvi)", value: `${(analytics.averageHistoricalAlignment * 100).toFixed(1)}%`, color: "text-violet-400" },
                                { label: "Trust Score", value: `${(analytics.avgParticipantTrustScore * 100).toFixed(0)}%`, color: "text-blue-400" },
                                {
                                    label: "Mix (i)",
                                    value: `${analytics.totalVoteEvents}v / ${analytics.totalPostEvents}p`,
                                    color: "text-cyan-400"
                                },
                            ].map(m => (
                                <div key={m.label} className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-wider">{m.label}</span>
                                    <span className={cn("text-xs font-black", m.color)}>{m.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filter + event list */}
            <div>
                <div className="flex gap-2 mb-4">
                    {(["all", "completed", "active"] as FilterTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={cn(
                                "px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                                filter === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab === "all" ? `All (${events.length})` : tab === "completed" ? "Completed" : "Active"}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-white/[0.06] rounded-[20px] animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="font-bold">No events yet</p>
                        <p className="text-sm mt-1">Create your first campaign to start tracking insights</p>
                        <Link href="/brand/create-event"
                            className="inline-flex mt-4 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:opacity-90 transition-opacity">
                            Create Campaign
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(event => (
                            <EventInsightCard key={event.id} event={event} summary={summaryMap.get(event.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
