"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Compass, CheckCircle2, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostActionState } from "@/hooks/usePostActionFlow";
import { usePostActionFlow } from "@/hooks/usePostActionFlow";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface Props {
    state: PostActionState;
    onDismiss: () => void;
}

export default function PostActionSheet({ state, onDismiss }: Props) {
    const router = useRouter();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { timeLabel, subtitle } = usePostActionFlow(state);
    const nextEvent = state.nextEvent ?? null;

    // Auto-navigate to next event (or explore) after 2 s.
    // Capture stable values at mount — avoids timer reset on every parent re-render.
    useEffect(() => {
        const targetUrl = nextEvent ? `/events/${nextEvent.id}` : "/explore";
        timerRef.current = setTimeout(() => {
            onDismiss();
            router.push(targetUrl);
        }, 0);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

const handleShare = () => {
        try {
            if (navigator.share) navigator.share({ title: state.eventName, url: window.location.href });
            else if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
        } catch { /* user cancelled */ }
    };
    const logoCid = nextEvent?.brand?.logoCid;
    const logoSrc = logoCid
        ? (logoCid.startsWith("http") ? logoCid : `${PINATA_GW}/${logoCid}`)
        : null;

    return (
        <motion.div
            key="post-action-sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg px-4 pb-6 pointer-events-none"
            style={{ pointerEvents: "none" }}
        >
            <div
                className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden pointer-events-auto"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-lime-400" size={20} />
                        <div>
                            <p className="text-sm font-semibold text-white leading-snug">
                                {state.type === "vote"
                                    ? `Vote submitted to "${state.eventName}"`
                                    : `Entry submitted to "${state.eventName}"`}
                            </p>
                            {timeLabel && (
                                <p className="mt-0.5 text-xs text-zinc-400">
                                    {timeLabel}. {subtitle}
                                </p>
                            )}
                            {!timeLabel && (
                                <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="shrink-0 rounded-full p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Share button (submit only) */}
                {state.type === "submit" && (
                    <div className="px-5 pb-3">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-xs text-lime-400 hover:text-lime-300 transition-colors"
                        >
                            <Share2 size={13} /> Share event
                        </button>
                    </div>
                )}

                <div className="mx-5 h-px bg-zinc-800" />

                {/* Next event */}
                <div className="px-5 py-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Up next for you
                    </p>

                    {nextEvent ? (
                        <div className="flex items-center gap-3">
                            {/* Brand logo */}
                            <div className="shrink-0 h-10 w-10 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
                                {logoSrc
                                    ? <img src={logoSrc} alt={nextEvent.brand?.name ?? ""} className="h-full w-full object-cover" />
                                    : <span className="text-xs font-bold text-zinc-400">{(nextEvent.brand?.name ?? "?")[0]}</span>
                                }
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{nextEvent.title}</p>
                                <p className="text-xs text-zinc-400 truncate">
                                    {nextEvent.brand?.name}
                                    {nextEvent.status === "voting" ? " · Voting open" : " · Submissions open"}
                                </p>
                            </div>
                            {/* Auto-redirect in 2 s */}
                            <div className="shrink-0 flex items-center gap-1 text-xs text-zinc-500">
                                <ArrowRight size={13} className="text-lime-400" />
                                <span className="text-lime-400">Redirecting…</span>
                            </div>
                        </div>
                    ) : (
                        /* Fallback: no next event */
                        <Link
                            href="/explore"
                            onClick={onDismiss}
                            className="flex items-center gap-2 text-sm text-zinc-300 hover:text-lime-400 transition-colors"
                        >
                            <Compass size={16} className="text-zinc-500" />
                            Explore more events
                            <ArrowRight size={14} className="text-zinc-500" />
                        </Link>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
