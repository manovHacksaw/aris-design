"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, Globe, Save, Loader2, CheckCircle, AlertCircle, X, Camera, Building2, ChevronRight, Wallet, Check } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { upsertBrandProfile } from "@/services/brand.service";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Fashion & Apparel", "Technology", "Automotive", "Food & Beverage",
  "Health & Wellness", "Entertainment", "Gaming", "Sports & Fitness", "Beauty & Personal Care",
  "Finance & Fintech", "Education", "Travel & Tourism",
];

const SOCIAL_KEYS = [
  { key: "website",   label: "Website",      placeholder: "https://yourbrand.com" },
  { key: "twitter",   label: "Twitter / X",  placeholder: "https://twitter.com/yourbrand" },
  { key: "instagram", label: "Instagram",    placeholder: "https://instagram.com/yourbrand" },
  { key: "linkedin",  label: "LinkedIn",     placeholder: "https://linkedin.com/company/yourbrand" },
];

const SECTIONS = [
  { id: "profile",  label: "Brand Profile",   icon: Building2 },
  { id: "presence", label: "Online Presence", icon: Globe },
  { id: "account",  label: "Account Info",    icon: Lock },
];

export default function BrandSettingsPage() {
  const { user, updateProfile, refreshUser, isLoading: userLoading } = useUser();
  const { onboardingData } = useAuth();
  const seeded = useRef(false);

  const [activeSection, setActiveSection] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const userSocialLinks = (user?.socialLinks ?? {}) as Record<string, string>;

  const [brandName, setBrandName]       = useState("");
  const [tagline, setTagline]           = useState("");
  const [description, setDescription]   = useState("");
  const [categories, setCategories]     = useState<string[]>([]);
  const [socialLinks, setSocialLinks]   = useState<Record<string, string>>({});

  // Logo upload
  const [logoCid, setLogoCid]               = useState<string | null>(null);
  const [logoPreview, setLogoPreview]       = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || seeded.current) return;
    seeded.current = true;

    const sl = (user.socialLinks ?? {}) as Record<string, string>;
    const ob = user.ownedBrands?.[0];
    const obSocials = (ob?.socialLinks as Record<string, string>) ?? {};

    setBrandName(ob?.name ?? user.displayName ?? onboardingData?.brandName ?? "");
    setTagline(ob?.tagline ?? sl.tagline ?? onboardingData?.brandTagline ?? "");
    setDescription(ob?.description ?? user.bio ?? onboardingData?.brandDescription ?? "");
    setCategories(ob?.categories?.length ? ob.categories : (user.preferredCategories?.length ? user.preferredCategories : (onboardingData?.brandCategories ?? [])));
    setSocialLinks({
      website:   obSocials.website   ?? sl.website   ?? onboardingData?.brandWebsite   ?? "",
      twitter:   obSocials.twitter   ?? sl.twitter   ?? onboardingData?.brandTwitter   ?? "",
      instagram: obSocials.instagram ?? sl.instagram ?? onboardingData?.brandInstagram ?? "",
      linkedin:  obSocials.linkedin  ?? sl.linkedin  ?? onboardingData?.brandLinkedin  ?? "",
    });
    if (ob?.logoCid) {
      setLogoCid(ob.logoCid);
      setLogoPreview(`https://gateway.pinata.cloud/ipfs/${ob.logoCid}`);
    } else if (user.avatarUrl) {
      setLogoPreview(user.avatarUrl);
    }
  }, [user]);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { showToast("error", validation.error!); return; }
    setLogoPreview(URL.createObjectURL(file));
    setIsUploadingLogo(true);
    try {
      const { cid, url } = await uploadToPinata(file);
      setLogoCid(cid);
      setLogoPreview(url);
    } catch {
      showToast("error", "Logo upload failed. Try again.");
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await upsertBrandProfile({
        name: brandName,
        tagline,
        description,
        categories,
        ...(logoCid ? { logoCid } : {}),
        socialLinks: {
          website:   socialLinks.website,
          twitter:   socialLinks.twitter,
          instagram: socialLinks.instagram,
          linkedin:  socialLinks.linkedin,
        },
      });
      await updateProfile({
        displayName: brandName,
        bio: description,
        preferredCategories: categories,
        socialLinks: {
          ...userSocialLinks,
          tagline,
          website:   socialLinks.website,
          twitter:   socialLinks.twitter,
          instagram: socialLinks.instagram,
          linkedin:  socialLinks.linkedin,
        },
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast("success", "Brand profile saved.");
    } catch (err: any) {
      showToast("error", err?.message ?? "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  const logoInitial = (brandName || "B")[0].toUpperCase();

  if (userLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-10 pb-32 md:pb-12 font-sans selection:bg-primary/30">

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border-[3px] border-foreground shadow-[4px_4px_0px_#1A1A1A] dark:shadow-[4px_4px_0px_#FDF6E3] text-sm font-black uppercase tracking-widest",
          toast.type === "success" ? "bg-[#00C853] text-white" : "bg-red-500 text-white"
        )}>
          {toast.type === "success"
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {toast.message}
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="border-b-4 border-foreground pb-6">
        <h1 className="text-4xl md:text-5xl font-display text-foreground uppercase tracking-tighter leading-none mb-3">
          <span className="text-primary">Settings</span>
        </h1>
        <p className="text-sm font-bold uppercase tracking-widest border-l-4 border-primary pl-3">
          Manage your brand profile and account preferences
        </p>
      </header>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">

        {/* Sidebar navigation */}
        <aside className="space-y-2">
          {SECTIONS.map((section) => (
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

          {/* Save button in sidebar */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed border-[3px] border-foreground"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : saved ? (
                <><Check className="w-4 h-4" /> Saved!</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>

          {/* Brand Status card */}
          {user && (
            <div className="bg-card border border-border/60 rounded-[24px] p-5 mt-2 space-y-3">
              <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Brand Status</p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 font-bold text-xs uppercase tracking-wide">Account</span>
                  {user.isOnboarded ? (
                    <span className="text-[10px] font-black text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/30 px-2 py-0.5 rounded-full uppercase tracking-wide">Active</span>
                  ) : (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Pending</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 font-bold text-xs uppercase tracking-wide">Role</span>
                  <span className="font-black text-[10px] uppercase tracking-widest">{user.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 font-bold text-xs uppercase tracking-wide">Since</span>
                  <span className="font-black text-[10px]">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content area */}
        <div>

          {/* ── Brand Profile ── */}
          {activeSection === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm"
            >
              <div className="p-8 space-y-10">

                {/* Logo upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div
                    className="relative group cursor-pointer shrink-0"
                    onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                  >
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-background shadow-xl">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-black text-white group-hover:scale-110 transition-transform duration-500">
                          {logoInitial}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploadingLogo
                        ? <Loader2 className="w-8 h-8 text-white animate-spin" />
                        : <Camera className="w-8 h-8 text-white" />
                      }
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-black text-foreground mb-2">Brand Logo</h3>
                    <p className="text-[11px] font-black text-foreground/30 uppercase tracking-widest mb-1">JPEG, PNG, WebP · max 5 MB</p>
                    <p className="text-[10px] text-foreground/25 mb-4">Stored permanently on IPFS via Pinata</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingLogo
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                        : "Upload New Logo"
                      }
                    </button>
                  </div>
                </div>

                <div className="h-[1px] bg-border/40" />

                {/* Brand Name + Tagline */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Brand Name</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Your brand name"
                      className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Tagline</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Just Do It"
                      maxLength={80}
                      className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell creators what your brand is about..."
                      maxLength={200}
                      rows={4}
                      className="w-full bg-secondary/50 border border-border/60 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
                    />
                    <p className="text-xs text-foreground/30 text-right font-bold">{description.length}/200</p>
                  </div>
                </div>

                <div className="h-[1px] bg-border/40" />

                {/* Categories */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-foreground mb-1">Categories</h3>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Select all that apply to your brand</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {CATEGORIES.map((cat) => {
                      const selected = categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            selected
                              ? "bg-foreground text-background border-foreground shadow-[2px_2px_0px_#1A1A1A] dark:shadow-[2px_2px_0px_#FDF6E3]"
                              : "bg-secondary/50 text-foreground border-border/60 hover:border-foreground/40 hover:bg-secondary"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10 disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-400" /> : null}
                    {saved ? "Saved!" : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Online Presence ── */}
          {activeSection === "presence" && (
            <motion.div
              key="presence"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm"
            >
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-xl font-black text-foreground mb-2">Online Presence</h3>
                  <p className="text-sm text-foreground/50">Add your brand's web and social media links to build trust with creators.</p>
                </div>

                <div className="grid gap-6">
                  {SOCIAL_KEYS.map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">{label}</label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none" />
                        <input
                          type="url"
                          value={socialLinks[key] ?? ""}
                          onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full bg-secondary/50 border border-border/60 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors placeholder:text-foreground/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10 disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-400" /> : null}
                    {saved ? "Saved!" : "Update Links"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Account Info ── */}
          {activeSection === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {user && (
                <div className="bg-card border border-border/60 rounded-[32px] p-8 space-y-6 shadow-sm">
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight mb-1">Account Info</h3>
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Read-only — managed by the platform</p>
                  </div>

                  {/* Wallet row */}
                  <div className="flex items-center justify-between p-6 bg-secondary/50 rounded-2xl border border-border/40">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground tracking-tight">Wallet Address</p>
                        <p className="text-[10px] font-bold text-foreground/30 font-mono">
                          {user.walletAddress
                            ? `${user.walletAddress.slice(0, 8)}…${user.walletAddress.slice(-6)}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-foreground/30 border border-border/40 bg-secondary px-3 py-1.5 rounded-xl uppercase tracking-widest">Read-only</span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: "Email",          value: user.email },
                      { label: "Company Size",   value: userSocialLinks.companySize ?? "—" },
                      { label: "Monthly Budget", value: userSocialLinks.monthlyBudget ?? "—" },
                      { label: "Member Since",   value: new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-2">
                        <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">{label}</label>
                        <div className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-4 text-sm font-bold text-foreground/50 break-all cursor-not-allowed">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
