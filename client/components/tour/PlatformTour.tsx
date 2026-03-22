"use client";

import { useState } from "react";
import { X, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Home Feed",
    text: "See trending campaigns, active events, and your personalized feed.",
  },
  {
    title: "Explore",
    text: "Discover brands and creators you may want to follow.",
  },
  {
    title: "Events",
    text: "Open an event to view details, rules, and vote or submit content.",
  },
  {
    title: "Create",
    text: "Use the create section to submit entries to live campaigns.",
  },
  {
    title: "Activity",
    text: "Track your votes, submissions, and platform notifications.",
  },
  {
    title: "Wallet",
    text: "Check your rewards and wallet activity in one place.",
  },
  {
    title: "Profile",
    text: "Manage profile details, preferences, and followed accounts.",
  },
];

export default function PlatformTour() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const shouldStart = window.localStorage.getItem("aris_start_platform_tour") === "true";
    if (shouldStart) window.localStorage.removeItem("aris_start_platform_tour");
    return shouldStart;
  });
  const [stepIndex, setStepIndex] = useState(0);

  if (!open) return null;

  const current = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close tour overlay"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-[24px] bg-[#0c0c10] border border-white/[0.1] shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-primary/80 uppercase tracking-[0.2em]">
              Platform Tour
            </p>
            <h3 className="font-display text-2xl text-white uppercase tracking-tight mt-1">{current.title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <p className="text-sm text-white/60 leading-relaxed">{current.text}</p>

        <div className="flex items-center gap-2">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-8 bg-primary" : "w-3 bg-white/15"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            disabled={stepIndex === 0}
            className="px-4 py-2 rounded-xl border border-white/[0.12] text-xs font-black uppercase tracking-wider text-white/60 disabled:opacity-30"
          >
            <span className="inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) setOpen(false);
              else setStepIndex((s) => s + 1);
            }}
            className="ml-auto px-4 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider"
          >
            <span className="inline-flex items-center gap-1">
              {isLast ? "Finish Tour" : "Next"}
              {isLast ? <Sparkles className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
