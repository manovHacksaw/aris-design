"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Wand2, ArrowRight, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AIGeneratorPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

type GenerationStep = "idle" | "prompt" | "generating" | "result";
type StyleOption = "Cyberpunk" | "Minimalist" | "Bold" | "Abstract";
type RatioOption = "1:1" | "16:9" | "9:16" | "4:3";

export default function AIGeneratorPanel({ isOpen, onClose }: AIGeneratorPanelProps) {
    const [step, setStep] = useState<GenerationStep>("idle");
    const [prompt, setPrompt] = useState("");
    const [selectedStyle, setSelectedStyle] = useState<StyleOption>("Cyberpunk");
    const [selectedRatio, setSelectedRatio] = useState<RatioOption>("1:1");
    const [result, setResult] = useState("");

    const styleOptions: StyleOption[] = ["Cyberpunk", "Minimalist", "Bold", "Abstract"];
    const ratioOptions: RatioOption[] = ["1:1", "16:9", "9:16", "4:3"];

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        setStep("generating");

        // Simulate AI generation
        setTimeout(() => {
            setResult(`Generated artwork: "${prompt}" in ${selectedStyle} style (${selectedRatio})`);
            setStep("result");
        }, 2000);
    };

    const handleClose = () => {
        setStep("idle");
        setPrompt("");
        setResult("");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
                        onClick={handleClose}
                    />

                    {/* Floating Glass Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed inset-x-4 bottom-8 md:bottom-12 md:right-8 md:inset-x-auto md:w-96 z-50"
                    >
                        {/* Main Panel - Glass Morphism */}
                        <div className="glass-card border border-neon-blue/60 rounded-[32px] shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-neon-blue/10 to-neon-cyan/10 px-6 py-5 border-b border-neon-blue/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center glow-cyan">
                                        <Wand2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white tracking-tight">AI Creator</h3>
                                        <p className="text-xs text-neon-cyan font-bold">Web3 Generation</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-lg bg-neon-blue/20 hover:bg-neon-blue/40 flex items-center justify-center transition-all hover:glow-blue"
                                >
                                    <X className="w-4 h-4 text-neon-cyan" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {step === "idle" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            Describe what you want to create. Our AI will generate unique content tailored to your vision.
                                        </p>
                                        <button
                                            onClick={() => setStep("prompt")}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan/30 to-neon-blue/30 hover:from-neon-cyan/50 hover:to-neon-blue/50 border border-neon-cyan/60 text-white font-bold uppercase tracking-wider transition-all hover:glow-cyan flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Start Creating
                                        </button>
                                    </motion.div>
                                )}

                                {step === "prompt" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-wider">Your Idea</label>
                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="Describe your creative vision..."
                                                className="w-full h-20 bg-background/40 border border-neon-blue/40 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan/80 focus:glow-cyan transition-all resize-none"
                                            />
                                        </div>

                                        {/* Style Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-wider">Style</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {styleOptions.map((style) => (
                                                    <button
                                                        key={style}
                                                        onClick={() => setSelectedStyle(style)}
                                                        className={cn(
                                                            "py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                                                            selectedStyle === style
                                                                ? "bg-gradient-to-r from-neon-blue to-neon-cyan border-neon-cyan text-white glow-cyan"
                                                                : "bg-secondary/30 border-neon-blue/30 text-gray-400 hover:border-neon-blue/60 hover:text-neon-cyan"
                                                        )}
                                                    >
                                                        {style}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Ratio Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-wider">Ratio</label>
                                            <div className="flex gap-2">
                                                {ratioOptions.map((ratio) => (
                                                    <button
                                                        key={ratio}
                                                        onClick={() => setSelectedRatio(ratio)}
                                                        className={cn(
                                                            "flex-1 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                                                            selectedRatio === ratio
                                                                ? "bg-gradient-to-r from-neon-magenta to-neon-violet border-neon-magenta text-white glow-magenta"
                                                                : "bg-secondary/30 border-neon-blue/30 text-gray-400 hover:border-neon-blue/60 hover:text-neon-magenta"
                                                        )}
                                                    >
                                                        {ratio}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGenerate}
                                            disabled={!prompt.trim()}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/80 hover:to-neon-blue/80 disabled:opacity-50 disabled:cursor-not-allowed border border-neon-cyan text-white font-bold uppercase tracking-wider transition-all hover:glow-cyan flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Generate
                                        </button>
                                    </motion.div>
                                )}

                                {step === "generating" && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-8 space-y-4"
                                    >
                                        <div className="relative w-12 h-12">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 border-2 border-transparent border-t-neon-cyan border-r-neon-blue rounded-full glow-cyan"
                                            />
                                        </div>
                                        <p className="text-sm text-gray-300 font-bold">Creating your vision...</p>
                                    </motion.div>
                                )}

                                {step === "result" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="bg-background/50 border border-neon-blue/30 rounded-xl p-4 space-y-2">
                                            <p className="text-xs text-neon-cyan font-bold uppercase tracking-wider">Generated</p>
                                            <p className="text-sm text-white">{result}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setStep("prompt")}
                                                className="flex-1 py-2 px-3 rounded-lg border border-neon-blue/60 text-neon-cyan font-bold uppercase text-xs tracking-wider hover:bg-neon-blue/20 transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={handleClose}
                                                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-blue border border-neon-cyan text-white font-bold uppercase text-xs tracking-wider hover:glow-cyan transition-all flex items-center justify-center gap-1"
                                            >
                                                Use <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Neon accent glow effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-magenta rounded-[32px] opacity-0 blur-xl group-hover:opacity-20 transition-opacity -z-10" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
