"use client";

import { motion } from "framer-motion";
import { Sparkles, Paperclip, Pencil, Wand2, Search, Settings2, ImageIcon, PlayCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function CreateHero() {
    const [prompt, setPrompt] = useState("");
    const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');

    return (
        <div className="relative w-full rounded-[40px] overflow-hidden bg-[#0A0A0C] border border-white/5 shadow-2xl">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent opacity-50" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
            </div>

            <div className="relative z-10 p-8 md:p-14 space-y-10">
                {/* Header Section */}
                <div className="space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                        <PlayCircle className="w-3.5 h-3.5 text-primary" />
                        Aris Studio
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] uppercase">
                        Bring your <br />
                        <span className="text-primary">Ideas</span> to life
                    </h1>
                </div>

                {/* Create Panel */}
                <div className="max-w-4xl space-y-6">
                    {/* Mode Toggle */}
                    <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'ai' ? "bg-white text-black" : "text-white/40 hover:text-white"
                            )}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Generation
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'manual' ? "bg-white text-black" : "text-white/40 hover:text-white"
                            )}
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Manual Upload
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-[32px] blur opacity-10 group-focus-within:opacity-30 transition-opacity" />
                        <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[30px] p-2 flex flex-col md:flex-row items-center gap-2">
                            <div className="flex-1 w-full flex items-center px-4">
                                <Search className="w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={activeTab === 'ai' ? "Describe what you want to create..." : "Write a caption for your upload..."}
                                    className="w-full bg-transparent border-none outline-none py-5 px-4 text-sm font-medium text-white placeholder:text-white/20"
                                />
                            </div>

                            <div className="w-full md:w-auto flex items-center gap-2 p-1">
                                <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all group/btn">
                                    <Paperclip className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                                </button>
                                <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all">
                                    <Settings2 className="w-5 h-5" />
                                </button>
                                <button className="flex-1 md:flex-none px-10 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    {activeTab === 'ai' ? 'Generate' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Prompt Hints */}
                    <div className="flex flex-wrap gap-2">
                        {['4K Bokeh', 'Cyberpunk', 'Cinematic', 'Minimalist'].map(hint => (
                            <button key={hint} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase text-white/30 hover:text-white/60 hover:bg-white/10 transition-all tracking-wider">
                                {hint}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Aris Watermark Decor */}
            <div className="absolute right-[-5%] bottom-[-10%] opacity-[0.03] pointer-events-none select-none">
                <h1 className="text-[300px] font-black uppercase italic leading-none">Studio</h1>
            </div>
        </div>
    );
}
