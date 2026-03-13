"use client";

import { motion } from "framer-motion";
import { Sparkles, Paperclip, ImageIcon, PlayCircle, Settings2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

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

export default function CreateHero() {
    const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
    const [prompt, setPrompt] = useState("");

    const handleHint = (hint: string) => {
        setPrompt((p) => (p ? `${p}, ${hint}` : hint));
    };

    return (
        <div className="relative w-full rounded-[40px] overflow-hidden bg-[#070709] border border-white/[0.06] min-h-[320px]">
            {/* Aceternity Background Beams */}
            <BackgroundBeams className="opacity-60" />

            {/* Extra colour glow layers */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#A78BFA]/8 rounded-full blur-[140px]" />
                <div className="absolute -bottom-16 right-0 w-[400px] h-[400px] bg-orange-500/6 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-lime-400/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-8 md:p-12 lg:p-14 space-y-8">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-black uppercase tracking-widest text-white/50"
                >
                    <PlayCircle className="w-3.5 h-3.5 text-lime-400" />
                    Aris Studio
                </motion.div>

                {/* Heading */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08 }}
                >
                    <h1 className="font-display text-5xl md:text-[4.5rem] lg:text-[5.5rem] text-white leading-[0.88] uppercase tracking-tight">
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
                    className="max-w-3xl space-y-5"
                >
                    {/* Mode Toggle */}
                    <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl w-fit">
                        {(["ai", "manual"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                                    activeTab === tab
                                        ? "bg-white text-black shadow-lg"
                                        : "text-white/35 hover:text-white/70"
                                )}
                            >
                                {tab === "ai"
                                    ? <Sparkles className="w-3.5 h-3.5" />
                                    : <ImageIcon className="w-3.5 h-3.5" />
                                }
                                {tab === "ai" ? "AI Generation" : "Manual Upload"}
                            </button>
                        ))}
                    </div>

                    {/* Animated vanish input + action buttons */}
                    <PlaceholdersAndVanishInput
                        placeholders={activeTab === "ai" ? AI_PLACEHOLDERS : MANUAL_PLACEHOLDERS}
                        onChange={(e) => setPrompt(e.target.value)}
                        onSubmit={(_, val) => setPrompt(val)}
                        className="group focus-within:shadow-[0_0_0_1px_rgba(163,230,53,0.3),0_8px_32px_rgba(163,230,53,0.1)]"
                    >
                        {/* Icon buttons + CTA inside the input row */}
                        <div className="flex items-center gap-2 pr-1 shrink-0">
                            <button
                                type="button"
                                className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all group/btn"
                            >
                                <Paperclip className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                            </button>
                            <button
                                type="button"
                                className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all"
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>
                            <button
                                type="submit"
                                className="px-7 py-3 rounded-2xl bg-lime-400 text-black font-black uppercase tracking-widest text-[11px] shadow-[0_4px_24px_rgba(163,230,53,0.3)] hover:bg-lime-300 hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                            >
                                {activeTab === "ai" ? "Generate" : "Continue"}
                            </button>
                        </div>
                    </PlaceholdersAndVanishInput>

                    {/* Prompt hints */}
                    <div className="flex flex-wrap gap-2">
                        {HINTS.map((hint) => (
                            <motion.button
                                key={hint}
                                type="button"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleHint(hint)}
                                className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white/70 hover:bg-white/[0.08] hover:border-white/[0.14] transition-all"
                            >
                                {hint}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
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
