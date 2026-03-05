"use client";

import { motion } from "framer-motion";
import { Camera, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingProfile } from "@/types/onboarding";

interface StepProfileProps {
    profile: OnboardingProfile;
    onProfileChange: (profile: OnboardingProfile) => void;
}

export default function StepProfile({ profile, onProfileChange }: StepProfileProps) {
    const update = (field: keyof OnboardingProfile, value: string) => {
        onProfileChange({ ...profile, [field]: value });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-foreground tracking-tighter"
                >
                    Set Up Your Profile
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs text-foreground/40 font-bold"
                >
                    This is how others will see you on Aris.
                </motion.p>
            </div>

            <div className="grid md:grid-cols-[1fr_200px] gap-8">
                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-4"
                >
                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/40 flex items-center justify-center overflow-hidden relative group cursor-pointer">
                            {profile.avatar ? (
                                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="w-5 h-5 text-foreground/30" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-black text-foreground">Upload Avatar</p>
                            <p className="text-[10px] text-foreground/30 font-bold">JPG, PNG. Max 2MB.</p>
                        </div>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                            Display Name <span className="text-accent">*</span>
                        </label>
                        <input
                            type="text"
                            value={profile.displayName}
                            onChange={(e) => update("displayName", e.target.value)}
                            placeholder="Jon Doe"
                            className="w-full bg-secondary border border-border/40 rounded-[14px] px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 transition-colors"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                            Username <span className="text-accent">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 text-sm font-bold">@</span>
                            <input
                                type="text"
                                value={profile.username}
                                onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                placeholder="username"
                                className="w-full bg-secondary border border-border/40 rounded-[14px] pl-8 pr-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                            Short Bio
                        </label>
                        <textarea
                            value={profile.bio}
                            onChange={(e) => update("bio", e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={3}
                            className="w-full bg-secondary border border-border/40 rounded-[14px] px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 transition-colors resize-none"
                        />
                    </div>

                    {/* Gender + DOB row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                                Gender
                            </label>
                            <select
                                value={profile.gender}
                                onChange={(e) => update("gender", e.target.value)}
                                className="w-full bg-secondary border border-border/40 rounded-[14px] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors appearance-none"
                            >
                                <option value="">Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer_not">Prefer not to say</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={profile.dateOfBirth}
                                onChange={(e) => update("dateOfBirth", e.target.value)}
                                className="w-full bg-secondary border border-border/40 rounded-[14px] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Live Preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="hidden md:block"
                >
                    <div className="bg-card border border-border/40 rounded-[20px] p-5 sticky top-6">
                        <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-4">Preview</p>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-secondary border border-border/40 overflow-hidden mb-3">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-foreground/20 text-lg font-black">
                                        {profile.displayName?.[0]?.toUpperCase() || "?"}
                                    </div>
                                )}
                            </div>
                            <p className="text-sm font-black text-foreground tracking-tight">
                                {profile.displayName || "Your Name"}
                            </p>
                            <p className="text-[10px] text-foreground/40 font-bold">
                                @{profile.username || "username"}
                            </p>
                            {profile.bio && (
                                <p className="text-[10px] text-foreground/30 mt-2 leading-relaxed line-clamp-3">
                                    {profile.bio}
                                </p>
                            )}
                            <div className="flex items-center gap-1 mt-3">
                                <CheckCircle className="w-3 h-3 text-primary" />
                                <span className="text-[9px] font-bold text-primary">Verified</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
