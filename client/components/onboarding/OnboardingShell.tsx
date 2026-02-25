"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface StepMeta {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  hints: string[];
  bg?: string; // optional Unsplash URL for left panel bg
}

interface OnboardingShellProps {
  step: number;
  total: number;
  meta: StepMeta;
  children: React.ReactNode;
}

export default function OnboardingShell({ step, total, meta, children }: OnboardingShellProps) {
  const { Icon, title, subtitle, hints, bg } = meta;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-5/12 relative bg-[#050505] items-center justify-center overflow-hidden border-r border-white/5">
        {bg && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
            style={{ backgroundImage: `url('${bg}')` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80" />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 p-12 w-full max-w-lg space-y-8"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>

            {/* Title + subtitle */}
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-white tracking-tighter leading-tight whitespace-pre-line">
                {title}
              </h2>
              <p className="text-white/50 text-sm font-medium leading-relaxed">{subtitle}</p>
            </div>

            {/* Hints */}
            <div className="space-y-3">
              {hints.map((hint, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-[7px] shrink-0" />
                  <p className="text-white/35 text-sm leading-relaxed">{hint}</p>
                </div>
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {Array.from({ length: total }).map((_, i) => {
                const s = i + 1;
                return (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      s === step
                        ? "w-8 bg-primary"
                        : s < step
                        ? "w-3 bg-primary/40"
                        : "w-3 bg-white/10"
                    }`}
                  />
                );
              })}
            </div>

            {/* Step counter */}
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
              Step {step} of {total}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-12 lg:justify-center">

          {/* Mobile progress */}
          <div className="lg:hidden flex gap-1.5 mb-6 flex-wrap">
            {Array.from({ length: total }).map((_, i) => {
              const s = i + 1;
              return (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    s === step
                      ? "flex-1 bg-primary min-w-[24px]"
                      : s < step
                      ? "w-6 bg-primary/40"
                      : "w-3 bg-white/10"
                  }`}
                />
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
