"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import { motion } from "framer-motion";
import {
    User,
    Bell,
    Lock,
    Shield,
    Wallet,
    ChevronRight,
    Camera,
    ToggleLeft as Toggle,
    ExternalLink,
    Calendar,
    Link as LinkIcon,
    Hash,
    Tag
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const settingsSections = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'socials', label: 'Social Links', icon: LinkIcon },
    { id: 'preferences', label: 'Preferences', icon: Hash },
    { id: 'account', label: 'Account & Wallet', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');

    return (
        <SidebarLayout>
            <main className="max-w-[1200px] mx-auto py-8 space-y-10 pb-24">
                {/* Header */}
                <div className="px-4 md:px-0">
                    <h1 className="text-4xl font-black text-foreground tracking-tighter mb-2">Settings</h1>
                    <p className="text-[11px] font-black text-foreground/30 uppercase tracking-[0.2em]">Manage your profile and account preferences</p>
                </div>

                <div className="grid lg:grid-cols-[280px_1fr] gap-8 px-4 md:px-0">
                    {/* Navigation Sidebar */}
                    <aside className="space-y-2">
                        {settingsSections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={cn(
                                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black transition-all group",
                                    activeSection === section.id
                                        ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                        : "bg-card/50 text-foreground/40 hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <section.icon className={cn("w-5 h-5", activeSection === section.id ? "" : "opacity-40")} />
                                <span className="flex-1 text-left">{section.label}</span>
                                <ChevronRight className={cn("w-4 h-4 transition-transform", activeSection === section.id ? "translate-x-1" : "opacity-0")} />
                            </button>
                        ))}
                    </aside>

                    {/* Content Area */}
                    <div className="space-y-8">
                        {/* Profile Section */}
                        {activeSection === 'profile' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm"
                            >
                                <div className="p-8 space-y-10">
                                    {/* Avatar Upload */}
                                    <div className="flex flex-col sm:flex-row items-center gap-8">
                                        <div className="relative group cursor-pointer">
                                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-background shadow-xl">
                                                <img
                                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6sD8shcEbuD1sEWqq_k9nBz6jYqCaILxk058kBiCwlwVdu9qFIfZxlQnh5BDwQhyeNNMD8zPG6w5PZNz5SW2R1GOlu3Zmh6hUYGMxRRQOuSWRiPcTG8n5eOb03VlvlW27x-HnAdO-0MWUmldh-SIDwr6fw_J2CRzUpPr-TtHAl-NTFI7tZEvP_ts4aOpuQKxH92CjPdAXUV8Opd5SOHIXZB8fr-rU9B9-DRUgY51RYxnY0cAyhSkZXheEfrkR4KWzScuV5TQQuA5s"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    alt="Avatar"
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h3 className="text-xl font-black text-foreground mb-2">Profile Picture</h3>
                                            <p className="text-[11px] font-black text-foreground/30 uppercase tracking-widest mb-4">JPG, PNG or WEBP. Max 2MB.</p>
                                            <div className="flex gap-3 justify-center sm:justify-start">
                                                <button className="bg-primary text-background px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-colors">Upload New</button>
                                                <button className="bg-secondary text-foreground/60 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-border transition-colors">Remove</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[1px] bg-border/40" />

                                    {/* Form Fields */}
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Username</label>
                                            <input
                                                type="text"
                                                defaultValue="Manov"
                                                className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                disabled
                                                defaultValue="manov@example.com"
                                                className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-4 text-sm font-bold text-foreground/40 cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors appearance-none"
                                                />
                                                <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Bio</label>
                                            <textarea
                                                rows={4}
                                                defaultValue="Digital artist and technology enthusiast. Building the future of Aris."
                                                className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button className="bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10">Save Changes</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Social Links Section */}
                        {activeSection === 'socials' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm"
                            >
                                <div className="p-8 space-y-8">
                                    <div>
                                        <h3 className="text-xl font-black text-foreground mb-2">Social Connections</h3>
                                        <p className="text-sm text-foreground/50">Add your social media profiles to gain trust and display them on your profile.</p>
                                    </div>

                                    <div className="grid gap-6">
                                        {[
                                            { label: "Twitter / X", placeholder: "https://x.com/username" },
                                            { label: "Instagram", placeholder: "https://instagram.com/username" },
                                            { label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
                                            { label: "Website", placeholder: "https://yourwebsite.com" },
                                            { label: "Discord", placeholder: "Discord Username#0000" }
                                        ].map((social) => (
                                            <div key={social.label} className="space-y-2">
                                                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">{social.label}</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={social.placeholder}
                                                        className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors placeholder:text-foreground/20"
                                                    />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                        <ExternalLink className="w-4 h-4 text-foreground/20" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button className="bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10">Update Links</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Preferences Section */}
                        {activeSection === 'preferences' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm"
                            >
                                <div className="p-8 space-y-10">
                                    {/* Brand Preferences */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Tag className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-foreground">Brand Preferences</h3>
                                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">What brands do you like?</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {["Nike", "Adidas", "Apple", "Samsung", "Gucci", "Tesla", "Red Bull", "Spotify", "Netflix"].map((brand) => (
                                                <button key={brand} className="px-4 py-2 bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 border border-border/60 rounded-xl text-xs font-bold text-foreground transition-all">
                                                    {brand}
                                                </button>
                                            ))}
                                            <button className="px-4 py-2 border border-dashed border-border hover:border-foreground/40 rounded-xl text-xs font-bold text-foreground/40 hover:text-foreground transition-all">
                                                + Add Custom
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-[1px] bg-border/40" />

                                    {/* Content Preferences */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                                                <Hash className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-foreground">Content Feed</h3>
                                                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Customize your discovery</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {["Technology", "Fashion", "Gaming", "Music", "Sports", "Art & Design", "Crypto", "Food", "Travel"].map((topic) => (
                                                <div key={topic} className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/40 cursor-pointer hover:bg-secondary/60 transition-colors">
                                                    <span className="text-xs font-bold text-foreground">{topic}</span>
                                                    <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button className="bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10">Save Preferences</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                        {activeSection === 'account' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="bg-card border border-border/60 rounded-[32px] p-8 space-y-6 shadow-sm">
                                    <h3 className="text-xl font-black text-foreground tracking-tight">Wallet Connection</h3>
                                    <div className="flex items-center justify-between p-6 bg-secondary/50 rounded-2xl border border-border/40">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Wallet className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground tracking-tight">MetaMask</p>
                                                <p className="text-[10px] font-bold text-foreground/30 truncate max-w-[120px] sm:max-w-none">0x71C...4f3E</p>
                                            </div>
                                        </div>
                                        <button className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 bg-primary/5 px-4 py-2.5 rounded-xl hover:bg-primary hover:text-white transition-all">Disconnect</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Other sections placeholders for now */}
                        {(activeSection === 'notifications' || activeSection === 'privacy') && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-card border border-border/60 rounded-[32px] p-12 flex flex-col items-center text-center shadow-sm"
                            >
                                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                                    <Lock className="w-8 h-8 text-foreground/20" />
                                </div>
                                <h3 className="text-lg font-black text-foreground mb-2">Coming Soon</h3>
                                <p className="text-sm text-foreground/40 max-w-xs font-medium">We're finalizing the advanced {activeSection} controls. Stay tuned for updates.</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>
        </SidebarLayout>
    );
}
