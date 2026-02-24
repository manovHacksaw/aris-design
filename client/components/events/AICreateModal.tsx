"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AICreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: { text: string; isAiAssisted: boolean }) => void;
    eventTitle: string;
}

type AIStep = "input" | "generating" | "preview";

export default function AICreateModal({ isOpen, onClose, onSubmit, eventTitle }: AICreateModalProps) {
    const [step, setStep] = useState<AIStep>("input");
    const [prompt, setPrompt] = useState("");
    const [generatedText, setGeneratedText] = useState("");
    const [editableText, setEditableText] = useState("");

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        setStep("generating");

        // Simulate AI generation
        setTimeout(() => {
            const generated = `AI-generated concept for "${eventTitle}" based on: ${prompt}. This is a creative interpretation that blends the theme with modern aesthetics and bold visual language.`;
            setGeneratedText(generated);
            setEditableText(generated);
            setStep("preview");
        }, 2000);
    };

    const handleSubmit = () => {
        onSubmit({ text: editableText, isAiAssisted: true });
        handleReset();
        onClose();
    };

    const handleReset = () => {
        setStep("input");
        setPrompt("");
        setGeneratedText("");
        setEditableText("");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50"
                    >
                        <div className="bg-card border border-border/60 rounded-[28px] shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-foreground tracking-tight">Generate with AI</h3>
                                        <p className="text-[10px] text-foreground/40 font-bold">{eventTitle}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center hover:bg-foreground/10 transition-colors"
                                >
                                    <X className="w-4 h-4 text-foreground/40" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {step === "input" && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-foreground/50 font-medium leading-relaxed">
                                            Describe your idea or theme. AI will generate content that you can edit before submitting.
                                        </p>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="e.g., A futuristic sneaker with holographic elements..."
                                            className="w-full h-32 bg-secondary border border-border/40 rounded-[16px] p-4 text-sm text-foreground placeholder:text-foreground/30 resize-none focus:outline-none focus:border-primary/40 transition-colors"
                                        />
                                        <button
                                            onClick={handleGenerate}
                                            disabled={!prompt.trim()}
                                            className={cn(
                                                "w-full py-3.5 rounded-[14px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                                                prompt.trim()
                                                    ? "bg-primary text-white hover:bg-primary-dark active:scale-[0.98]"
                                                    : "bg-secondary text-foreground/30 cursor-not-allowed"
                                            )}
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Generate
                                        </button>
                                    </div>
                                )}

                                {step === "generating" && (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <p className="text-xs font-bold text-foreground/40">Generating your content...</p>
                                    </div>
                                )}

                                {step === "preview" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-3 h-3 text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Generated</span>
                                        </div>
                                        <textarea
                                            value={editableText}
                                            onChange={(e) => setEditableText(e.target.value)}
                                            className="w-full h-40 bg-secondary border border-primary/20 rounded-[16px] p-4 text-sm text-foreground resize-none focus:outline-none focus:border-primary/40 transition-colors"
                                        />
                                        <p className="text-[10px] text-foreground/30 font-medium">
                                            Edit the generated content above before submitting.
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleReset}
                                                className="flex-1 py-3 rounded-[14px] text-xs font-black uppercase tracking-widest bg-secondary text-foreground/60 hover:bg-foreground/10 transition-colors"
                                            >
                                                Regenerate
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                className="flex-1 py-3 rounded-[14px] text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                Submit
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
