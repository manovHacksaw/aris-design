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
    Tag,
    Loader2,
    Check,
    X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";

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
    const { user, updateProfile } = useUser();
    const { address, eoaAddress, disconnect } = useWallet();

    // Avatar state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Profile form state
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Social links form state
    const [twitter, setTwitter] = useState("");
    const [instagram, setInstagram] = useState("");
    const [website, setWebsite] = useState("");
    const [isSavingSocials, setIsSavingSocials] = useState(false);
    const [savedSocials, setSavedSocials] = useState(false);

    // Sync form with user data when it loads
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
            setUsername(user.username || "");
            setBio(user.bio || "");
            setTwitter(user.socialLinks?.twitter || "");
            setInstagram(user.socialLinks?.instagram || "");
            setWebsite(user.socialLinks?.website || "");
            setAvatarPreview(user.avatarUrl || null);
        }
    }, [user]);

    const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validation = validateImageFile(file);
        if (!validation.valid) { toast.error(validation.error); return; }

        // Show local preview immediately
        const localUrl = URL.createObjectURL(file);
        setAvatarPreview(localUrl);
        setIsUploadingAvatar(true);

        try {
            const { url } = await uploadToPinata(file);
            setAvatarPreview(url);
            await updateProfile({ avatarUrl: url });
            toast.success("Profile photo updated!");
        } catch (err: any) {
            toast.error(err?.message || "Upload failed. Try again.");
            setAvatarPreview(user?.avatarUrl || null);
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveAvatar = async () => {
        setAvatarPreview(null);
        try {
            await updateProfile({ avatarUrl: "" });
            toast.success("Profile photo removed.");
        } catch {
            setAvatarPreview(user?.avatarUrl || null);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await updateProfile({ displayName, username, bio });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            // ignore — error is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSocials = async () => {
        setIsSavingSocials(true);
        try {
            await updateProfile({
                socialLinks: { twitter, instagram, website },
            });
            setSavedSocials(true);
            setTimeout(() => setSavedSocials(false), 2500);
        } catch (e) {
            // ignore
        } finally {
            setIsSavingSocials(false);
        }
    };

    const walletDisplay = address
        ? `${address.slice(0, 8)}...${address.slice(-6)}`
        : eoaAddress
            ? `${eoaAddress.slice(0, 8)}...${eoaAddress.slice(-6)}`
            : "Not connected";

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
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarSelect}
                                    />
                                    <div className="flex flex-col sm:flex-row items-center gap-8">
                                        <div
                                            className="relative group cursor-pointer"
                                            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                        >
                                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-background shadow-xl">
                                                {avatarPreview ? (
                                                    <img
                                                        src={avatarPreview}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        alt="Avatar"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                                        <span className="text-primary text-4xl font-black uppercase">
                                                            {(user?.displayName || "?").charAt(0)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isUploadingAvatar
                                                    ? <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                    : <Camera className="w-8 h-8 text-white" />
                                                }
                                            </div>
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h3 className="text-xl font-black text-foreground mb-2">Profile Picture</h3>
                                            <p className="text-[11px] font-black text-foreground/30 uppercase tracking-widest mb-1">JPEG, PNG, GIF or WebP — max 5 MB</p>
                                            <p className="text-[10px] text-foreground/25 mb-4">Stored permanently on IPFS via Pinata</p>
                                            <div className="flex gap-3 justify-center sm:justify-start">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingAvatar}
                                                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isUploadingAvatar ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : "Upload New"}
                                                </button>
                                                {avatarPreview && (
                                                    <button
                                                        onClick={handleRemoveAvatar}
                                                        disabled={isUploadingAvatar}
                                                        className="flex items-center gap-1.5 bg-secondary text-foreground/60 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                                                    >
                                                        <X className="w-3 h-3" /> Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[1px] bg-border/40" />

                                    {/* Form Fields */}
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Display Name</label>
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Your display name"
                                                className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Username</label>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                                                placeholder="your_username"
                                                className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                disabled
                                                value={user?.email || "—"}
                                                className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-4 text-sm font-bold text-foreground/40 cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Bio</label>
                                            <textarea
                                                rows={4}
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                placeholder="Tell people about yourself..."
                                                className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10 disabled:opacity-60"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : saved ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : null}
                                            {saved ? "Saved!" : "Save Changes"}
                                        </button>
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
                                            { label: "Twitter / X", placeholder: "https://x.com/username", value: twitter, onChange: setTwitter },
                                            { label: "Instagram", placeholder: "https://instagram.com/username", value: instagram, onChange: setInstagram },
                                            { label: "Website", placeholder: "https://yourwebsite.com", value: website, onChange: setWebsite },
                                        ].map((social) => (
                                            <div key={social.label} className="space-y-2">
                                                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">{social.label}</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={social.value}
                                                        onChange={(e) => social.onChange(e.target.value)}
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
                                        <button
                                            onClick={handleSaveSocials}
                                            disabled={isSavingSocials}
                                            className="flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10 disabled:opacity-60"
                                        >
                                            {isSavingSocials ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : savedSocials ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : null}
                                            {savedSocials ? "Saved!" : "Update Links"}
                                        </button>
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

                        {/* Account & Wallet Section */}
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
                                                <p className="text-sm font-black text-foreground tracking-tight">
                                                    {address ? "Smart Wallet" : "Embedded Wallet"}
                                                </p>
                                                <p className="text-[10px] font-bold text-foreground/30 font-mono truncate max-w-[160px] sm:max-w-none">
                                                    {walletDisplay}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={disconnect}
                                            className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 bg-primary/5 px-4 py-2.5 rounded-xl hover:bg-primary hover:text-white transition-all"
                                        >
                                            Disconnect
                                        </button>
                                    </div>

                                    {/* EOA Address */}
                                    {eoaAddress && (
                                        <div className="p-6 bg-secondary/30 rounded-2xl border border-border/30">
                                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-2">Embedded Wallet (EOA)</p>
                                            <p className="text-xs font-mono text-foreground/60 break-all">{eoaAddress}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Other sections placeholders */}
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
