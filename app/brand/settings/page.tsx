"use client";

import { Upload, Lock, Mail, Globe, Save } from "lucide-react";

export default function BrandSettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 md:pb-12">
            <header>
                <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Settings</h1>
                <p className="text-muted-foreground">Manage your brand profile and security.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Section */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
                        <h2 className="text-lg font-bold mb-6">Brand Profile</h2>

                        <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
                            <div className="shrink-0 flex flex-col items-center gap-3">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-black text-white shadow-xl">
                                    N
                                </div>
                                <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                    <Upload className="w-3 h-3" /> Change Logo
                                </button>
                            </div>

                            <div className="flex-1 w-full space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand Name</label>
                                        <input
                                            type="text"
                                            defaultValue="Nike Inc."
                                            className="w-full p-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Industry</label>
                                        <select className="w-full p-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-bold">
                                            <option>Fashion & Apparel</option>
                                            <option>Technology</option>
                                            <option>Automotive</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio / Description</label>
                                    <textarea
                                        defaultValue="Just Do It. Innovation and inspiration for every athlete in the world."
                                        className="w-full p-3 h-24 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold border-b border-border pb-2 mb-4">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            defaultValue="marketing@nike.com"
                                            className="w-full pl-10 pr-4 py-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="url"
                                            defaultValue="https://nike.com"
                                            className="w-full pl-10 pr-4 py-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Security Section */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock className="w-4 h-4 text-primary" />
                            <h2 className="text-lg font-bold">Security</h2>
                        </div>

                        <div className="space-y-4">
                            <button className="w-full p-3 text-left hover:bg-secondary rounded-xl transition-colors border border-transparent hover:border-border">
                                <p className="font-bold text-sm">Change Password</p>
                                <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                            </button>
                            <button className="w-full p-3 text-left hover:bg-secondary rounded-xl transition-colors border border-transparent hover:border-border">
                                <p className="font-bold text-sm">Two-Factor Auth</p>
                                <p className="text-xs text-green-500 font-bold">Enabled</p>
                            </button>
                        </div>
                    </section>

                    <button className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
