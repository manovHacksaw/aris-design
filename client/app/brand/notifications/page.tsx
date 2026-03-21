"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell, Zap, DollarSign, AlertCircle, Loader2,
    CheckCircle2, Check, CheckSquare, UserPlus, Vote,
    GitBranch, FileText, Trophy, XCircle, Star, X,
    Calendar, Hash, User, ArrowRight, Clock,
} from "lucide-react";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return `${Math.floor(d / 7)}w ago`;
}

function formatFullDate(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
        weekday: "short", year: "numeric", month: "short",
        day: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

// ─── Type config ──────────────────────────────────────────────────────────────

type FilterCategory = "all" | "campaigns" | "people" | "submissions" | "system";

type NotifConfig = {
    label: string;
    category: FilterCategory;
    icon: React.ReactNode;
    iconBg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
};

const NOTIF_CONFIG: Record<string, NotifConfig> = {
    BRAND_POST: {
        label: "New Campaign",
        category: "campaigns",
        icon: <Zap className="w-6 h-6 text-yellow-500 fill-yellow-400" />,
        iconBg: "bg-yellow-500/10 border-yellow-500/20",
        badgeBg: "bg-yellow-500/10", badgeText: "text-yellow-600", badgeBorder: "border-yellow-500/20",
    },
    VOTING_LIVE: {
        label: "Voting Live",
        category: "campaigns",
        icon: <Vote className="w-6 h-6 text-yellow-500" />,
        iconBg: "bg-yellow-500/10 border-yellow-500/20",
        badgeBg: "bg-yellow-500/10", badgeText: "text-yellow-600", badgeBorder: "border-yellow-500/20",
    },
    EVENT_PHASE_CHANGE: {
        label: "Phase Changed",
        category: "campaigns",
        icon: <GitBranch className="w-6 h-6 text-yellow-500" />,
        iconBg: "bg-yellow-500/10 border-yellow-500/20",
        badgeBg: "bg-yellow-500/10", badgeText: "text-yellow-600", badgeBorder: "border-yellow-500/20",
    },
    EVENT_RESULT: {
        label: "Results",
        category: "campaigns",
        icon: <Trophy className="w-6 h-6 text-yellow-500" />,
        iconBg: "bg-yellow-500/10 border-yellow-500/20",
        badgeBg: "bg-yellow-500/10", badgeText: "text-yellow-600", badgeBorder: "border-yellow-500/20",
    },
    EVENT_CANCELLED: {
        label: "Cancelled",
        category: "campaigns",
        icon: <XCircle className="w-6 h-6 text-red-400" />,
        iconBg: "bg-red-500/10 border-red-500/20",
        badgeBg: "bg-red-500/10", badgeText: "text-red-500", badgeBorder: "border-red-500/20",
    },
    EVENT_SUBMISSION: {
        label: "New Submission",
        category: "submissions",
        icon: <FileText className="w-6 h-6 text-primary" />,
        iconBg: "bg-primary/10 border-primary/20",
        badgeBg: "bg-primary/10", badgeText: "text-primary", badgeBorder: "border-primary/20",
    },
    EVENT_VOTE: {
        label: "New Vote",
        category: "submissions",
        icon: <Star className="w-6 h-6 text-primary" />,
        iconBg: "bg-primary/10 border-primary/20",
        badgeBg: "bg-primary/10", badgeText: "text-primary", badgeBorder: "border-primary/20",
    },
    SUBMISSION_VOTE: {
        label: "Vote Received",
        category: "submissions",
        icon: <Star className="w-6 h-6 text-primary" />,
        iconBg: "bg-primary/10 border-primary/20",
        badgeBg: "bg-primary/10", badgeText: "text-primary", badgeBorder: "border-primary/20",
    },
    NEW_SUBSCRIBER: {
        label: "New Follower",
        category: "people",
        icon: <UserPlus className="w-6 h-6 text-primary" />,
        iconBg: "bg-primary/10 border-primary/20",
        badgeBg: "bg-primary/10", badgeText: "text-primary", badgeBorder: "border-primary/20",
    },
    XP_MILESTONE: {
        label: "XP Milestone",
        category: "system",
        icon: <DollarSign className="w-6 h-6 text-green-400" />,
        iconBg: "bg-green-500/10 border-green-500/20",
        badgeBg: "bg-green-500/10", badgeText: "text-green-500", badgeBorder: "border-green-500/20",
    },
    STREAK: {
        label: "Streak",
        category: "system",
        icon: <Zap className="w-6 h-6 text-green-400" />,
        iconBg: "bg-green-500/10 border-green-500/20",
        badgeBg: "bg-green-500/10", badgeText: "text-green-500", badgeBorder: "border-green-500/20",
    },
    WELCOME: {
        label: "Welcome",
        category: "system",
        icon: <Bell className="w-6 h-6 text-foreground/40" />,
        iconBg: "bg-foreground/5 border-border/50",
        badgeBg: "bg-foreground/5", badgeText: "text-muted-foreground", badgeBorder: "border-border/50",
    },
    GENERAL: {
        label: "General",
        category: "system",
        icon: <AlertCircle className="w-6 h-6 text-foreground/40" />,
        iconBg: "bg-foreground/5 border-border/50",
        badgeBg: "bg-foreground/5", badgeText: "text-muted-foreground", badgeBorder: "border-border/50",
    },
};

function getConfig(type: string): NotifConfig {
    return NOTIF_CONFIG[type] ?? NOTIF_CONFIG["GENERAL"];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotifIcon({ type, size = "md" }: { type: string; size?: "md" | "lg" }) {
    const { icon, iconBg } = getConfig(type);
    const dim = size === "lg" ? "w-20 h-20 rounded-3xl" : "w-16 h-16 rounded-2xl";
    return (
        <div className={cn(dim, "flex items-center justify-center shrink-0 border", iconBg)}>
            {size === "lg"
                ? <span className="scale-150">{icon}</span>
                : icon}
        </div>
    );
}

function NotifBadge({ type }: { type: string }) {
    const { label, badgeBg, badgeText, badgeBorder } = getConfig(type);
    return (
        <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
            badgeBg, badgeText, badgeBorder
        )}>
            {label}
        </span>
    );
}

// ─── Detail row used inside modal ─────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-foreground break-words">{value}</p>
            </div>
        </div>
    );
}

// ─── Per-type metadata renderer ───────────────────────────────────────────────

function NotifMetaDetails({ n }: { n: Notification }) {
    const m = (n as any).data ?? (n as any).metadata ?? {};

    switch (n.type) {
        case "NEW_SUBSCRIBER":
            return (
                <>
                    {m.subscriberName && <DetailRow icon={<User className="w-4 h-4 text-muted-foreground" />} label="Subscriber" value={m.subscriberName} />}
                    {m.subscribedAt && <DetailRow icon={<Clock className="w-4 h-4 text-muted-foreground" />} label="Subscribed at" value={formatFullDate(m.subscribedAt)} />}
                </>
            );

        case "BRAND_POST":
        case "VOTING_LIVE":
        case "EVENT_RESULT":
            return (
                <>
                    {m.eventName && <DetailRow icon={<Calendar className="w-4 h-4 text-muted-foreground" />} label="Campaign" value={m.eventName} />}
                    {m.brandName && <DetailRow icon={<User className="w-4 h-4 text-muted-foreground" />} label="Brand" value={m.brandName} />}
                    {m.eventId && <DetailRow icon={<Hash className="w-4 h-4 text-muted-foreground" />} label="Campaign ID" value={m.eventId} />}
                </>
            );

        case "EVENT_PHASE_CHANGE":
            return (
                <>
                    {m.eventName && <DetailRow icon={<Calendar className="w-4 h-4 text-muted-foreground" />} label="Campaign" value={m.eventName} />}
                    {m.oldStatus && m.newStatus && (
                        <div className="flex items-start gap-3 py-3 border-b border-border/50">
                            <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">
                                <GitBranch className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Phase Transition</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-secondary text-xs font-bold text-muted-foreground">{m.oldStatus}</span>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                    <span className="px-2 py-0.5 rounded bg-primary/10 text-xs font-bold text-primary">{m.newStatus}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {m.eventId && <DetailRow icon={<Hash className="w-4 h-4 text-muted-foreground" />} label="Campaign ID" value={m.eventId} />}
                </>
            );

        case "EVENT_SUBMISSION":
        case "EVENT_VOTE":
            return (
                <>
                    {m.eventName && <DetailRow icon={<Calendar className="w-4 h-4 text-muted-foreground" />} label="Campaign" value={m.eventName} />}
                    {m.votedAt && <DetailRow icon={<Clock className="w-4 h-4 text-muted-foreground" />} label="Time" value={formatFullDate(m.votedAt)} />}
                    {m.eventId && <DetailRow icon={<Hash className="w-4 h-4 text-muted-foreground" />} label="Campaign ID" value={m.eventId} />}
                </>
            );

        case "SUBMISSION_VOTE":
            return (
                <>
                    {m.eventName && <DetailRow icon={<Calendar className="w-4 h-4 text-muted-foreground" />} label="Campaign" value={m.eventName} />}
                    {m.submissionId && <DetailRow icon={<Hash className="w-4 h-4 text-muted-foreground" />} label="Submission ID" value={m.submissionId} />}
                    {m.votedAt && <DetailRow icon={<Clock className="w-4 h-4 text-muted-foreground" />} label="Voted at" value={formatFullDate(m.votedAt)} />}
                </>
            );

        case "EVENT_CANCELLED":
            return (
                <>
                    {(m.eventName || m.eventTitle) && <DetailRow icon={<Calendar className="w-4 h-4 text-muted-foreground" />} label="Campaign" value={m.eventName ?? m.eventTitle} />}
                    {m.brandName && <DetailRow icon={<User className="w-4 h-4 text-muted-foreground" />} label="Brand" value={m.brandName} />}
                    {m.reason && <DetailRow icon={<AlertCircle className="w-4 h-4 text-muted-foreground" />} label="Reason" value={m.reason} />}
                    {m.eventId && <DetailRow icon={<Hash className="w-4 h-4 text-muted-foreground" />} label="Campaign ID" value={m.eventId} />}
                </>
            );

        case "XP_MILESTONE":
            return (
                <>
                    {m.category && <DetailRow icon={<Star className="w-4 h-4 text-muted-foreground" />} label="Category" value={m.category} />}
                    {m.threshold !== undefined && <DetailRow icon={<Trophy className="w-4 h-4 text-muted-foreground" />} label="Threshold Reached" value={String(m.threshold)} />}
                    {m.xpAwarded !== undefined && <DetailRow icon={<Zap className="w-4 h-4 text-muted-foreground" />} label="XP Awarded" value={`+${m.xpAwarded} XP`} />}
                </>
            );

        case "STREAK":
            return (
                <>
                    {m.streakCount !== undefined && <DetailRow icon={<Zap className="w-4 h-4 text-muted-foreground" />} label="Streak" value={`${m.streakCount} days`} />}
                    {m.milestone !== undefined && <DetailRow icon={<Trophy className="w-4 h-4 text-muted-foreground" />} label="Milestone" value={m.milestone ? "Yes" : "No"} />}
                </>
            );

        default:
            return null;
    }
}

// ─── Notification Detail Modal ────────────────────────────────────────────────

function NotifDetailModal({ n, onClose, onMarkRead }: {
    n: Notification;
    onClose: () => void;
    onMarkRead: (id: string) => void;
}) {
    const cfg = getConfig(n.type);

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
            >
                <motion.div
                    key="modal"
                    initial={{ opacity: 0, y: 40, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.97 }}
                    transition={{ type: "spring", damping: 28, stiffness: 340 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-card border border-border rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl overflow-hidden"
                >
                    {/* Modal header */}
                    <div className="flex items-start justify-between p-6 border-b border-border/50">
                        <div className="flex items-center gap-4">
                            <NotifIcon type={n.type} size="lg" />
                            <div>
                                <NotifBadge type={n.type} />
                                <h2 className="font-black text-xl text-foreground mt-1 leading-tight">
                                    {n.title}
                                </h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center shrink-0 transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-1 overflow-y-auto max-h-[60vh]">
                        {/* Full message */}
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {n.message}
                        </p>

                        {/* Metadata details */}
                        <div className="bg-secondary/30 rounded-2xl px-4">
                            <NotifMetaDetails n={n} />
                            {/* Always show received-at */}
                            <DetailRow
                                icon={<Clock className="w-4 h-4 text-muted-foreground" />}
                                label="Received"
                                value={formatFullDate(n.createdAt)}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 p-6 pt-4 border-t border-border/50">
                        {!n.isRead ? (
                            <button
                                onClick={() => { onMarkRead(n.id); onClose(); }}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Mark as Read
                            </button>
                        ) : (
                            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary/50 text-sm font-bold text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4" /> Already Read
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-3 rounded-xl bg-secondary text-foreground text-sm font-bold hover:bg-secondary/80 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Filter config ─────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: FilterCategory }[] = [
    { label: "All", value: "all" },
    { label: "Campaigns", value: "campaigns" },
    { label: "Submissions", value: "submissions" },
    { label: "People", value: "people" },
    { label: "System", value: "system" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandNotificationsPage() {
    const [filter, setFilter] = useState<FilterCategory>("all");
    const [selected, setSelected] = useState<Notification | null>(null);
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const filtered = notifications.filter(n => {
        if (filter === "all") return true;
        return getConfig(n.type).category === filter;
    });

    function handleCardClick(n: Notification) {
        setSelected(n);
        if (!n.isRead) markAsRead(n.id);
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Detail modal */}
            {selected && (
                <NotifDetailModal
                    n={selected}
                    onClose={() => setSelected(null)}
                    onMarkRead={markAsRead}
                />
            )}

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-black px-2.5 py-1 rounded-full border border-primary/20">
                                {unreadCount} New
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                        Manage your brand updates, rewards, and insights.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground text-sm font-bold rounded-full hover:bg-secondary/80 border border-border transition-colors whitespace-nowrap"
                        >
                            <CheckSquare className="w-4 h-4" />
                            <span className="hidden md:inline">Mark all as read</span>
                            <span className="md:hidden">Read all</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Filter tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {FILTERS.map(({ label, value }) => {
                    const count = value === "all"
                        ? notifications.length
                        : notifications.filter(n => getConfig(n.type).category === value).length;
                    return (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                filter === value
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            {label}
                            {count > 0 && (
                                <span className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                    filter === value ? "bg-white/20" : "bg-secondary"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.length > 0 ? (
                            filtered.map((n, i) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.15) }}
                                >
                                    <div
                                        onClick={() => handleCardClick(n)}
                                        className={cn(
                                            "group bg-card border rounded-3xl p-4 md:p-6 transition-all duration-300 shadow-sm flex flex-col md:flex-row gap-4 md:items-center relative cursor-pointer",
                                            n.isRead
                                                ? "border-border hover:shadow-md hover:border-border/80"
                                                : "border-primary/30 bg-primary/5 hover:border-primary/50 shadow-primary/5"
                                        )}
                                    >
                                        {!n.isRead && (
                                            <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] md:hidden" />
                                        )}

                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <NotifIcon type={n.type} />
                                            <div className="min-w-0 flex-1 pr-6 md:pr-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <NotifBadge type={n.type} />
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        {formatRelativeTime(n.createdAt)}
                                                    </span>
                                                </div>
                                                <h3 className={cn(
                                                    "text-base md:text-lg font-black tracking-tight truncate transition-colors",
                                                    !n.isRead ? "text-foreground" : "text-foreground/80"
                                                )}>
                                                    {n.title}
                                                </h3>
                                                <p className={cn(
                                                    "text-sm mt-1 line-clamp-2 md:line-clamp-1",
                                                    !n.isRead ? "text-muted-foreground font-medium" : "text-muted-foreground/70"
                                                )}>
                                                    {n.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Read indicator / action */}
                                        <div className="flex items-center justify-end gap-3 mt-2 md:mt-0 md:pl-4 md:border-l md:border-border/50 shrink-0">
                                            {!n.isRead ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                                    className="w-full md:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 flex items-center justify-center gap-2"
                                                >
                                                    <Check className="w-4 h-4" /> Mark Read
                                                </button>
                                            ) : (
                                                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                                                    <CheckCircle2 className="w-4 h-4" /> Read
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-card border border-border rounded-3xl p-12 text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto mb-4 border border-border/50">
                                    <Bell className="w-8 h-8 text-muted-foreground/40" />
                                </div>
                                <p className="font-bold text-foreground mb-1 text-lg">
                                    {filter === "all" ? "No notifications yet." : `No ${filter} updates.`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    You're all caught up on your brand's activity!
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
