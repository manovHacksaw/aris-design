"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Globe,
  Lock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Camera,
  Copy,
  Check,
  Tag,
  Link as LinkIcon,
  ChevronRight,
  Info,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { upsertBrandProfile } from "@/services/brand.service";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";
import { cn } from "@/lib/utils";

const neuOuter = "bg-card shadow-[8px_8px_16px_rgba(0,0,0,0.03),-8px_-8px_16px_rgba(255,255,255,0.8)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,165,0,0.08)] border border-border/10";
const neuInner = "bg-background shadow-[inset_4px_4px_8px_rgba(0,0,0,0.03),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,165,0,0.06)] border border-border/5";
const neuInput = "bg-background/50 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.04),inset_-2px_-2px_6px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.4),inset_-2px_-2px_6px_rgba(255,165,0,0.05)] border-transparent focus:ring-2 focus:ring-orange-600/20 dark:focus:ring-orange-400/20";
const neuButton = "shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,165,0,0.1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,165,0,0.08)] transition-all duration-300";


const CATEGORIES = [
  "Fashion & Apparel", "Technology", "Automotive", "Food & Beverage",
  "Health & Wellness", "Entertainment", "Gaming", "Sports & Fitness", "Beauty & Personal Care",
  "Finance & Fintech", "Education", "Travel & Tourism",
];

const SOCIAL_KEYS = [
  { key: "website", label: "Website", placeholder: "https://yourbrand.com" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/yourbrand" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbrand" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbrand" },
];

const settingsSections = [
  { id: "brand", label: "Brand Profile", icon: Building2 },
  { id: "socials", label: "Online Presence", icon: LinkIcon },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "account", label: "Account Info", icon: Lock },
];

export default function BrandSettingsPage() {
  const { user, updateProfile, refreshUser, isLoading: userLoading } = useUser();
  const { onboardingData } = useAuth();
  const seeded = useRef(false);

  const [activeSection, setActiveSection] = useState("brand");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const userSocialLinks = (user?.socialLinks ?? {}) as Record<string, string>;

  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Logo upload
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
      website: obSocials.website ?? sl.website ?? onboardingData?.brandWebsite ?? "",
      twitter: obSocials.twitter ?? sl.twitter ?? onboardingData?.brandTwitter ?? "",
      instagram: obSocials.instagram ?? sl.instagram ?? onboardingData?.brandInstagram ?? "",
      linkedin: obSocials.linkedin ?? sl.linkedin ?? onboardingData?.brandLinkedin ?? "",
    });
    if (ob?.logoUrl || ob?.logoCid) {
      const resolvedLogo = ob.logoUrl || (ob.logoCid ? `https://gateway.pinata.cloud/ipfs/${ob.logoCid}` : null);
      setLogoUrl(resolvedLogo);
      setLogoPreview(resolvedLogo);
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
      const { imageUrl: uploadedLogoUrl } = await uploadToPinata(file);
      setLogoUrl(uploadedLogoUrl);
      setLogoPreview(uploadedLogoUrl);
    } catch {
      showToast("error", "Logo upload failed. Try again.");
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function copyWallet() {
    if (!user?.walletAddress) return;
    navigator.clipboard.writeText(user.walletAddress);
    setWalletCopied(true);
    setTimeout(() => setWalletCopied(false), 2000);
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
        ...(logoUrl ? { logoUrl } : {}),
        socialLinks: {
          website: socialLinks.website,
          twitter: socialLinks.twitter,
          instagram: socialLinks.instagram,
          linkedin: socialLinks.linkedin,
        },
      });

      await updateProfile({
        displayName: brandName,
        bio: description,
        preferredCategories: categories,
        socialLinks: {
          ...userSocialLinks,
          tagline,
          website: socialLinks.website,
          twitter: socialLinks.twitter,
          instagram: socialLinks.instagram,
          linkedin: socialLinks.linkedin,
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
      <div className="max-w-[1200px] mx-auto py-8 space-y-10 pb-24 animate-pulse">
        {/* Header Skeleton */}
        <div className="px-4 md:px-0 space-y-3">
          <div className="h-10 bg-secondary border border-border/40 rounded-xl w-48" />
          <div className="h-4 bg-secondary border border-border/40 rounded-lg w-64" />
        </div>

        <div className="px-4 md:px-0 mt-6">
          {/* Navigation Grid Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("p-5 md:p-6 flex flex-col items-start gap-4 rounded-[32px]", neuOuter)}>
                <div className={cn("w-14 h-14 rounded-[20px] bg-secondary", neuInner)} />
                <div className="h-4 bg-secondary rounded-lg w-24 mt-2" />
              </div>
            ))}
          </div>

          {/* Content Area Skeleton */}
          <div className="max-w-[800px] mx-auto space-y-8">
            <div className={cn("rounded-[32px] overflow-hidden", neuOuter)}>
              <div className="p-8 space-y-10">
                {/* Logo Section */}
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className={cn("w-32 h-32 rounded-[32px] bg-secondary shrink-0", neuInner)} />
                  <div className="space-y-3 w-full max-w-[200px] flex flex-col items-center sm:items-start">
                    <div className="h-6 bg-secondary rounded-lg w-32" />
                    <div className="h-3 bg-secondary rounded-lg w-full" />
                    <div className="h-3 bg-secondary rounded-lg w-40" />
                    <div className="h-10 bg-secondary rounded-xl w-32 mt-4" />
                  </div>
                </div>

                <div className="h-[1px] bg-border/40" />

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <div className="h-3 bg-secondary rounded-lg w-20 ml-1" />
                    <div className={cn("h-14 rounded-2xl w-full", neuInput)} />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-secondary rounded-lg w-20 ml-1" />
                    <div className={cn("h-14 rounded-2xl w-full", neuInput)} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <div className="h-3 bg-secondary rounded-lg w-24 ml-1" />
                    <div className={cn("h-32 rounded-2xl w-full", neuInput)} />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <div className={cn("h-12 w-40 rounded-2xl", neuButton, "bg-secondary")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-8 space-y-10 pb-24">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${
            toast.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 md:px-0">
        <h1 className="text-4xl font-black text-foreground tracking-tighter mb-2">Settings</h1>
        <p className="text-[11px] font-black text-foreground/30 uppercase tracking-[0.2em]">
          Manage your brand profile and account
        </p>
      </div>

      <div className="px-4 md:px-0 mt-6">
        {/* Navigation Grid Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "p-5 md:p-6 flex flex-col items-start gap-4 rounded-[32px] transition-all duration-300",
                activeSection === section.id
                  ? cn("text-orange-600 dark:text-orange-400", neuInner)
                  : cn("text-foreground/40 hover:text-foreground", neuOuter, "hover:-translate-y-1")
              )}
            >
              <div
                className={cn(
                  "p-4 rounded-[20px] transition-all duration-300",
                  activeSection === section.id
                    ? cn("bg-background text-orange-600 dark:text-orange-400", neuOuter)
                    : cn("bg-transparent", neuInner)
                )}
              >
                <section.icon className="w-7 h-7" />
              </div>
              <span className="text-[14px] font-black tracking-wide ml-1 mt-2">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="max-w-[800px] mx-auto space-y-8">

          {/* Brand Profile Section */}
          {activeSection === "brand" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("rounded-[32px] overflow-hidden", neuOuter)}
            >
              <div className="p-8 space-y-10">
                {/* Logo Upload */}
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
                    <div className={cn("w-32 h-32 rounded-[32px] flex items-center justify-center p-2", neuOuter)}>
                      <div className={cn("w-full h-full rounded-[24px] overflow-hidden", neuInner)}>
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Brand logo"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-600/20 to-accent/20 dark:from-orange-400/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <span className="text-orange-600 dark:text-orange-400 text-4xl font-black uppercase">{logoInitial}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploadingLogo
                        ? <Loader2 className="w-8 h-8 text-white animate-spin" />
                        : <Camera className="w-8 h-8 text-white" />
                      }
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-black text-foreground mb-2">Brand Logo</h3>
                    <p className="text-[11px] font-black text-foreground/30 uppercase tracking-widest mb-1">
                      JPEG, PNG, WebP — max 5 MB
                    </p>
                    <p className="text-[10px] text-foreground/25 mb-4">Stored permanently on IPFS via Pinata</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-2 bg-orange-600 dark:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingLogo ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : "Upload Logo"}
                    </button>
                  </div>
                </div>

                <div className="h-[1px] bg-border/40" />

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Your brand name"
                      className={cn("w-full rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none transition-colors", neuInput)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Just Do It"
                      maxLength={80}
                      className={cn("w-full rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none transition-colors", neuInput)}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell creators what your brand is about..."
                      maxLength={200}
                      rows={4}
                      className={cn("w-full rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none transition-colors resize-none", neuInput)}
                    />
                    <p className="text-xs text-foreground/30 text-right font-bold">{description.length}/200</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 disabled:opacity-60",
                      neuButton
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saved ? "Saved!" : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Online Presence Section */}
          {activeSection === "socials" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("rounded-[32px] overflow-hidden", neuOuter)}
            >
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-xl font-black text-foreground mb-2">Online Presence</h3>
                  <p className="text-sm text-foreground/50">
                    Add your brand's social media and website links to build creator trust.
                  </p>
                </div>

                <div className="grid gap-6">
                  {SOCIAL_KEYS.map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">
                        {label}
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 pointer-events-none" />
                        <input
                          type="url"
                          value={socialLinks[key] ?? ""}
                          onChange={(e) =>
                            setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={placeholder}
                          className={cn("w-full pl-12 pr-5 rounded-2xl py-4 text-sm font-bold text-foreground focus:outline-none transition-colors placeholder:text-foreground/20", neuInput)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 disabled:opacity-60",
                      neuButton
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : null}
                    {saved ? "Saved!" : "Update Links"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Categories Section */}
          {activeSection === "categories" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("rounded-[32px] overflow-hidden", neuOuter)}
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600/10 dark:bg-orange-400/10 rounded-xl flex items-center justify-center">
                    <Tag className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground">Brand Categories</h3>
                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                      What industries does your brand operate in?
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {CATEGORIES.map((cat) => {
                    const selected = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border-none",
                          selected
                            ? cn("text-orange-600 dark:text-orange-400", neuInner)
                            : cn("text-foreground/60 hover:text-foreground", neuOuter, "hover:-translate-y-0.5")
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {categories.length > 0 && (
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">
                    {categories.length} categor{categories.length !== 1 ? "ies" : "y"} selected
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-foreground/90 disabled:opacity-60",
                      neuButton
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : null}
                    {saved ? "Saved!" : "Save Preferences"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Account Info Section */}
          {activeSection === "account" && user && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className={cn("rounded-[32px] p-8 space-y-6 container border-none", neuOuter)}>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-foreground tracking-tight">Account Info</h3>
                  <span className="ml-2 text-[10px] bg-secondary text-foreground/40 border border-border/60 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                    Read-only
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Email", value: user.email },
                    { label: "Company Size", value: userSocialLinks.companySize ?? "—" },
                    { label: "Monthly Budget", value: userSocialLinks.monthlyBudget ?? "—" },
                    { label: "Account Status", value: user.isOnboarded ? "Active" : "Pending" },
                    { label: "Role", value: user.role },
                    { label: "Member Since", value: new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-2">
                      <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">
                        {label}
                      </label>
                      <div className={cn("w-full rounded-2xl px-5 py-4 text-sm font-bold text-foreground/50 cursor-not-allowed break-all", neuInput)}>
                        {value}
                      </div>
                    </div>
                  ))}

                  {/* Wallet — with copy */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">
                      Wallet Address
                    </label>
                    <div className={cn("flex items-center gap-3 rounded-2xl px-5 py-4", neuInput)}>
                      <span className="flex-1 text-sm font-bold text-foreground/50 font-mono break-all">
                        {user.walletAddress
                          ? `${user.walletAddress.slice(0, 8)}…${user.walletAddress.slice(-6)}`
                          : "—"}
                      </span>
                      {user.walletAddress && (
                        <button
                          type="button"
                          onClick={copyWallet}
                          className="shrink-0 text-foreground/30 hover:text-foreground transition-colors"
                          title="Copy wallet address"
                        >
                          {walletCopied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={cn("flex items-start gap-3 p-4 rounded-2xl", neuInner)}>
                  <Info className="w-4 h-4 text-foreground/30 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-foreground/40 font-medium leading-relaxed">
                    Account details are managed by your authentication provider and cannot be changed here.
                    Contact support if you need to update your email or wallet.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
