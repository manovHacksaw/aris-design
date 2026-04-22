"use client";

import { motion } from "framer-motion";
import { Sparkles, Paperclip, Settings2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { StarsBackground } from "@/components/ui/stars-background";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import HeroPreviewPanel from "./HeroPreviewPanel";

const AI_PLACEHOLDERS = [
    "Describe what you want to create…",
    "A surreal cityscape at golden hour…",
    "Minimalist product shot on black background…",
    "Cinematic portrait with bokeh depth of field…",
    "Abstract digital art with neon accents…",
];

const MANUAL_PLACEHOLDERS = [
    "Write a caption for your upload…",
    "Describe your photo in a few words…",
    "Add context or a story to your post…",
];

const HINTS = ["4K Bokeh", "Cyberpunk", "Cinematic", "Minimalist"];

interface CreateHeroProps {
    onGenerate?: (prompt: string) => void;
    onAttach?: () => void;
    onRequireAuth?: () => void;
    events?: any[];
}

export default function CreateHero({ onGenerate, onAttach, onRequireAuth, events = [] }: CreateHeroProps) {
    const [prompt, setPrompt] = useState("");

    const handleHint = (hint: string) => {
        setPrompt((p) => (p ? `${p}, ${hint}` : hint));
    };

    return (
        <div className="relative w-full rounded-[24px] sm:rounded-[40px] overflow-hidden bg-[#070709] border border-white/[0.06] min-h-[260px] sm:min-h-[320px]">
            {/* Dynamic Stars Background */}
            <StarsBackground
                starDensity={0.0002}
                allStarsTwinkle
                twinkleProbability={0.8}
                minTwinkleSpeed={0.3}
                maxTwinkleSpeed={0.8}
                className="opacity-70 pointer-events-none"
            />

            {/* Extra colour glow layers */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#A78BFA]/8 rounded-full blur-[140px]" />
                <div className="absolute -bottom-16 right-0 w-[400px] h-[400px] bg-orange-500/6 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-lime-400/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 px-4 py-6 sm:px-8 sm:py-8 md:py-12 lg:py-14">
                <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
                    {/* Left column — all existing hero content */}
                    <div className="space-y-5 sm:space-y-8">
                        {/* Heading */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.08 }}
                        >
                            <h1 className="font-display text-3xl sm:text-5xl md:text-[4.5rem] lg:text-[5.5rem] text-white leading-[0.88] uppercase tracking-tight">
                                Bring your
                                <br />
                                <span className="bg-gradient-to-r from-lime-300 via-lime-400 to-green-400 bg-clip-text text-transparent">
                                    Ideas
                                </span>{" "}
                                to life
                            </h1>
                        </motion.div>

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.18 }}
                            className="max-w-3xl space-y-3 sm:space-y-5"
                        >
                            {/* Animated vanish input + action buttons */}
                            <PlaceholdersAndVanishInput
                                placeholders={AI_PLACEHOLDERS}
                                onChange={(e) => setPrompt(e.target.value)}
                                onSubmit={(_, val) => {
                                    if (onRequireAuth) { onRequireAuth(); return; }
                                    if (val.trim() && onGenerate) onGenerate(val.trim());
                                }}
                                className="group focus-within:shadow-[0_0_0_1px_rgba(163,230,53,0.3),0_8px_32px_rgba(163,230,53,0.1)]"
                            >
                                {/* Icon buttons + CTA inside the input row */}
                                <div className="flex items-center gap-1 sm:gap-2 pr-0.5 sm:pr-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onRequireAuth) { onRequireAuth(); return; }
                                            onAttach?.();
                                        }}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md sm:rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all group/btn"
                                    >
                                        <Paperclip className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRequireAuth?.()}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md sm:rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onRequireAuth) { onRequireAuth(); return; }
                                            if (prompt.trim() && onGenerate) onGenerate(prompt.trim());
                                        }}
                                        className="min-h-[44px] px-4 sm:px-7 rounded-md sm:rounded-2xl bg-lime-400 text-black font-black uppercase tracking-wide text-[11px] shadow-[0_4px_24px_rgba(163,230,53,0.3)] hover:bg-lime-300 hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap flex items-center"
                                    >
                                        Gen
                                    </button>
                                </div>
                            </PlaceholdersAndVanishInput>

                            {/* Prompt hints */}
                            <div className="flex gap-1 sm:gap-2">
                                {HINTS.map((hint) => (
                                    <motion.button
                                        key={hint}
                                        type="button"
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => onRequireAuth ? onRequireAuth() : handleHint(hint)}
                                        className="px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11px] font-black uppercase tracking-wide text-white/30 hover:text-white/70 hover:bg-white/[0.08] hover:border-white/[0.14] transition-all"
                                    >
                                        {hint}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right column — preview panel (desktop only) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="hidden lg:block h-full min-h-[280px]"
                        onClick={() => onRequireAuth?.()}
                    >
                        <HeroPreviewPanel events={events} />
                    </motion.div>
                </div>
            </div>

            {/* Watermark */}
            <div className="absolute right-[-4%] bottom-[-8%] opacity-[0.025] pointer-events-none select-none">
                <h1 className="font-display text-[280px] uppercase leading-none tracking-tighter">
                    Studio
                </h1>
            </div>
        </div>
    );
}
