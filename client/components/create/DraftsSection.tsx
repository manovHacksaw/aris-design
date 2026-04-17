"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileImage, Clock, ArrowRight, Trash2 } from "lucide-react";

export interface SubmissionDraft {
    id: string;
    eventId: string;
    eventTitle: string;
    eventImage?: string;
    imagePreview?: string;
    caption: string;
    savedAt: string;
}

const DRAFTS_KEY = "aris_submission_drafts";

export function saveDraft(draft: Omit<SubmissionDraft, "id" | "savedAt">) {
    const existing = getDrafts();
    const idx = existing.findIndex((d) => d.eventId === draft.eventId);
    const entry: SubmissionDraft = { ...draft, id: `draft_${draft.eventId}`, savedAt: new Date().toISOString() };
    if (idx >= 0) existing[idx] = entry;
    else existing.unshift(entry);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(existing));
}

export function getDrafts(): SubmissionDraft[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "[]"); }
    catch { return []; }
}

export function deleteDraft(eventId: string) {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(getDrafts().filter((d) => d.eventId !== eventId)));
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m || 1}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function DraftsSection() {
    const [drafts, setDrafts] = useState<SubmissionDraft[]>([]);

    useEffect(() => { setDrafts(getDrafts()); }, []);

    const handleDelete = (e: React.MouseEvent, eventId: string) => {
        e.preventDefault();
        deleteDraft(eventId);
        setDrafts(getDrafts());
    };

    if (drafts.length === 0) return null;

    return (
        <section>
            <div className="flex items-end justify-between mb-5">
                <div>
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] mb-1">Continue where you left off</p>
                    <h2 className="font-display text-3xl text-foreground uppercase tracking-tight">Drafts</h2>
                </div>
                <span className="text-[11px] font-black text-foreground/20 uppercase tracking-[0.15em]">
                    {drafts.length} saved
                </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                {drafts.map((draft, i) => (
                    <Link key={draft.id} href={`/events/${draft.eventId}`} className="block flex-shrink-0 w-[160px] sm:w-[176px]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            whileHover={{ scale: 1.02 }}
                            className="group relative p-3 rounded-[20px] bg-surface border border-surface-border hover:bg-surface hover:border-surface-border-strong transition-all duration-200"
                        >
                            <button
                                onClick={(e) => handleDelete(e, draft.eventId)}
                                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:border-red-500/30"
                            >
                                <Trash2 className="w-3 h-3 text-foreground/50 hover:text-red-400" />
                            </button>

                            <div className="relative aspect-square rounded-xl overflow-hidden bg-surface mb-3">
                                {draft.imagePreview || draft.eventImage ? (
                                    <img src={draft.imagePreview || draft.eventImage} alt={draft.eventTitle} className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-50" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <FileImage className="w-8 h-8 text-white/10" />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-full">
                                        <span className="text-[11px] font-black text-black">Continue</span>
                                        <ArrowRight className="w-3 h-3 text-black" />
                                    </div>
                                </div>
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 backdrop-blur-sm">
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Draft</span>
                                </div>
                            </div>

                            <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug mb-1">{draft.eventTitle}</h3>
                            <p className="text-[10px] text-foreground/30 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(draft.savedAt)}
                            </p>
                        </motion.div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
