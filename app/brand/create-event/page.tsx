"use client";

import { useState } from "react";
import { ChevronLeft, Upload, CheckCircle2, DollarSign, Image as ImageIcon, Layout, Rocket } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CreateCampaignPage() {
    const [formData, setFormData] = useState({
        title: "",
        type: "post",
        budget: "",
        description: ""
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 md:pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/brand/dashboard" className="p-2 rounded-full hover:bg-secondary transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Create Campaign</h1>
                    <p className="text-sm text-muted-foreground">Launch a new campaign in minutes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Content */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Section 1: Campaign Details */}
                    <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Layout className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold">Campaign Details</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Summer Photo Contest"
                                    className="w-full p-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    className={cn(
                                        "p-4 rounded-xl border-2 text-center transition-all",
                                        formData.type === "post" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-foreground/20"
                                    )}
                                    onClick={() => setFormData({ ...formData, type: "post" })}
                                >
                                    <span className="block text-lg font-black mb-1">Social Post</span>
                                    <span className="text-xs opacity-60">Text & Media content</span>
                                </button>
                                <button
                                    className={cn(
                                        "p-4 rounded-xl border-2 text-center transition-all",
                                        formData.type === "vote" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-foreground/20"
                                    )}
                                    onClick={() => setFormData({ ...formData, type: "vote" })}
                                >
                                    <span className="block text-lg font-black mb-1">Vote Event</span>
                                    <span className="text-xs opacity-60">Community voting</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                                <textarea
                                    placeholder="Describe your campaign goals and requirements..."
                                    className="w-full p-4 h-32 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Visuals */}
                    <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold">Creative Assets</h2>
                        </div>

                        <div className="border-3 border-dashed border-border rounded-[24px] p-8 md:p-12 hover:bg-secondary/20 transition-colors cursor-pointer group text-center">
                            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg mb-1">Upload Campaign Visuals</h3>
                            <p className="text-muted-foreground text-sm">Drag & drop or click to browse</p>
                        </div>
                    </section>
                </div>

                {/* Sidebar: Budget & Summary - Sticky on Desktop */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        {/* Budget Section */}
                        <section className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold">Budget</h2>
                            </div>

                            <div className="relative mb-4">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">$</span>
                                <input
                                    type="number"
                                    placeholder="5000"
                                    className="w-full pl-8 pr-4 py-4 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold text-lg"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                />
                            </div>

                            <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold">Estimated Reach</span>
                                    <span className="font-black text-primary">~32k</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Users in your target demographic.</p>
                            </div>
                        </section>

                        {/* Summary & Launch */}
                        <section className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Type</span>
                                    <span className="font-bold uppercase">{formData.type}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Budget</span>
                                    <span className="font-bold font-mono">${formData.budget || "0"}</span>
                                </div>
                            </div>

                            <button className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group">
                                <Rocket className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                Launch Campaign
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
