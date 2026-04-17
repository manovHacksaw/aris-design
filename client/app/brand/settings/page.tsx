"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Camera,
  Copy,
  Check,
  Tag,
  Link as LinkIcon,
  Info,
  Sparkles,
  Calendar,
  Mail,
  Wallet,
  Shield,
  Edit3,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { upsertBrandProfile, getCurrentBrand } from "@/services/brand.service";
import type { Brand } from "@/services/brand.service";
import { getBrandEvents } from "@/services/event.service";
import type { Event as BrandEvent } from "@/services/event.service";
import { apiRequest } from "@/services/api";
import { levelToRank } from "@/types/user";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";
import { cn } from "@/lib/utils";
import { BrandImageGeneratorModal } from "@/components/create/BrandImageGeneratorModal";

const CATEGORIES = [
  "Fashion & Apparel", "Technology", "Automotive", "Food & Beverage",
  "Health & Wellness", "Entertainment", "Gaming", "Sports & Fitness",
  "Beauty & Personal Care", "Finance & Fintech", "Education", "Travel & Tourism",
];

const SOCIAL_KEYS = [
  { key: "website", label: "Website", placeholder: "https://yourbrand.com", icon: Globe },
  { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/yourbrand", icon: LinkIcon },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbrand", icon: LinkIcon },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbrand", icon: LinkIcon },
];

export default function BrandSettingsPage() {
  const { user, updateProfile, refreshUser, isLoading: userLoading } = useUser();
  const { onboardingData } = useAuth();
  const seeded = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const userSocialLinks = (user?.socialLinks ?? {}) as Record<string, string>;

  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [brandData, setBrandData] = useState<Brand | null>(null);
  const [tokensMinted, setTokensMinted] = useState<number | null>(null);
  const [brandEvents, setBrandEvents] = useState<BrandEvent[]>([]);
  const [showcaseTab, setShowcaseTab] = useState<"events" | "creations">("events");
  const [eventTypeTab, setEventTypeTab] = useState<"vote" | "post">("vote");

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      getCurrentBrand(),
      apiRequest<{ success: boolean; usdcDistributed: number }>("/brands/milestones", { method: "GET" }),
      getBrandEvents(),
    ]).then(([brandRes, milestonesRes, eventsRes]) => {
      if (brandRes.status === "fulfilled") setBrandData(brandRes.value);
      if (milestonesRes.status === "fulfilled") setTokensMinted(milestonesRes.value.usdcDistributed);
      if (eventsRes.status === "fulfilled") {
        setBrandEvents(eventsRes.value.filter((ev) => ev.status !== "draft"));
      }
    });
  }, [user]);

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
    const obAny = ob as any;
    if (obAny?.logoUrl || ob?.logoCid) {
      const resolvedLogo = obAny.logoUrl || (ob?.logoCid ? `https://gateway.pinata.cloud/ipfs/${ob.logoCid}` : null);
      setLogoUrl(resolvedLogo);
      setLogoPreview(resolvedLogo);
    } else if (user.avatarUrl) {
      setLogoPreview(user.avatarUrl);
    }
  }, [user]);

  async function handleAiLogoGenerated(file: File, preview: string) {
    setLogoPreview(preview);
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
    }
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { showToast("error", validation.error!); return; }

    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setIsUploadingLogo(true);

    try {
      const { imageUrl: uploadedLogoUrl } = await uploadToPinata(file);
      setLogoUrl(uploadedLogoUrl);
      setLogoPreview(uploadedLogoUrl);
      showToast("success", "Logo uploaded successfully!");
    } catch {
      showToast("error", "Logo upload failed. Try again.");
      setLogoPreview(user?.avatarUrl || null);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    setLogoUrl(null);
    try {
      await upsertBrandProfile({ logoUrl: "" });
      showToast("success", "Brand logo removed.");
    } catch {
      setLogoPreview(logoUrl);
    }
  };

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
        ...((logoUrl ? { logoUrl } : {}) as any),
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
      setIsEditing(false);
    } catch (err: any) {
      showToast("error", err?.message ?? "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  const logoInitial = (brandName || "B")[0].toUpperCase();

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;


  if (userLoading && !user) {
    return (
      <div className="w-full pt-6 lg:pt-10 pb-24 space-y-6 animate-pulse text-white">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] h-48" />
            ))}
          </div>
          <div className="lg:w-[300px] space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-6 lg:pt-10 pb-24 md:pb-12 space-y-6 text-white">
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

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left / Main ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── Identity Card ── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 md:p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleLogoSelect}
            />
            <div className="flex flex-wrap items-start gap-5">

              {/* Logo */}
              <div className="relative shrink-0">
                <div
                  className="relative group cursor-pointer w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 border-white/[0.1] bg-white/[0.05]"
                  onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <span className="font-display text-4xl text-white/30 uppercase">{logoInitial}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingLogo
                      ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                      : <Camera className="w-6 h-6 text-white" />
                    }
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </div>

              {/* Brand Info */}
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight mb-1">
                  {brandName || "Your Brand"}
                </h1>
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em] mb-3">
                  {tagline || (user?.username ? `@${user.username}` : "@brand")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {user?.walletAddress && (
                    <button
                      onClick={copyWallet}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.2] rounded-full transition-colors group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[10px] font-black text-white/40 font-mono group-hover:text-white/70 transition-colors">
                        {walletCopied ? "Copied!" : truncateAddress(user.walletAddress)}
                      </span>
                      <Copy className="w-2.5 h-2.5 text-white/20 group-hover:text-white/50 transition-colors" />
                    </button>
                  )}
                  {joinDate && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full">
                      <Calendar className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">Joined {joinDate}</span>
                    </div>
                  )}
                  {user?.ownedBrands?.[0]?.id && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full">
                      <Tag className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wide font-mono">ID: {user.ownedBrands[0].id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Profile Button */}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => setIsEditing((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.2] rounded-xl text-[11px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* ── Edit Profile Modal ── */}
          <AnimatePresence>
            {isEditing && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="edit-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                  onClick={() => setIsEditing(false)}
                />
                {/* Modal */}
                <motion.div
                  key="edit-panel"
                  initial={{ opacity: 0, scale: 0.96, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 16 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                >
                  <div
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d0d0f] border border-white/[0.08] rounded-[28px] p-6 md:p-8 space-y-6 pointer-events-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-2xl text-white uppercase tracking-tight">Edit Brand Profile</h3>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">Update your brand settings</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {/* Logo actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.2] rounded-xl text-[10px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-all disabled:opacity-40"
                  >
                    {isUploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    {isUploadingLogo ? "Uploading…" : "Change Logo"}
                  </button>
                  {logoPreview && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[10px] font-black text-white/40 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 uppercase tracking-widest transition-all disabled:opacity-40"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                  <button
                    onClick={() => setAiModalOpen(true)}
                    disabled={isUploadingLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-40"
                  >
                    <Sparkles className="w-3 h-3" /> Generate with AI
                  </button>
                </div>

                <div className="h-[1px] bg-white/[0.04]" />

                {/* Brand Name, Tagline, Description */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Brand Name</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Your brand name"
                      className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.2] rounded-2xl px-5 py-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Tagline</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Just Do It"
                      maxLength={80}
                      className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.2] rounded-2xl px-5 py-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between ml-1 mr-1">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Description</label>
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{description.length}/200</span>
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell creators what your brand is about..."
                      maxLength={200}
                      rows={4}
                      className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.2] rounded-2xl px-5 py-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="h-[1px] bg-white/[0.04]" />

                {/* Categories */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Brand Categories</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                      const selected = categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                            selected
                              ? "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                              : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:bg-white/[0.07] hover:border-white/[0.12] hover:text-white"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  {categories.length > 0 && (
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                      {categories.length} categor{categories.length !== 1 ? "ies" : "y"} selected
                    </p>
                  )}
                </div>

                <div className="h-[1px] bg-white/[0.04]" />

                {/* Social Links */}
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Online Presence</label>
                  <div className="grid gap-4">
                    {SOCIAL_KEYS.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">{label}</label>
                        <div className="relative">
                          <input
                            type="url"
                            value={socialLinks[key] ?? ""}
                            onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.2] rounded-2xl px-5 py-3.5 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors"
                          />
                          <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save / Cancel */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-xl text-[11px] font-black text-white/40 hover:text-white/70 uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-white hover:bg-white/90 text-black px-7 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-600" /> : null}
                    {saved ? "Saved!" : "Save Changes"}
                  </button>
                </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-primary">Milestone</p>
              <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">
                {brandData ? levelToRank(brandData.level) : "—"}
              </p>
              <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">
                Level {brandData?.level ?? "—"}
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-lime-400">Events</p>
              <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">{brandData ? brandEvents.length : "—"}</p>
              <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">Created</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-blue-400">Followers</p>
              <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">{brandData?.followerCount ?? "—"}</p>
              <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">Subscribers</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] rounded-[20px] px-5 py-4 transition-all">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-yellow-400">Participants</p>
              <p className="font-display text-4xl text-white uppercase tracking-tight leading-none">{brandData?.uniqueParticipants ?? "—"}</p>
              <p className="text-[10px] font-black text-white/30 mt-1 uppercase tracking-wide">Across Events</p>
            </div>
          </div>

          {/* ── About ── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 md:p-8 space-y-5">
            <h2 className="font-display text-2xl text-white uppercase tracking-tight">
              About {(brandName || "Brand").split(" ")[0]}
            </h2>
            {description ? (
              <p className="text-sm font-medium text-white/50 leading-relaxed">{description}</p>
            ) : (
              <p className="text-sm font-black text-white/20 uppercase tracking-wide">No description yet.</p>
            )}

            {/* Socials */}
            {Object.values(socialLinks).some(Boolean) && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.04]">
                {SOCIAL_KEYS.map(({ key, label, icon: Icon }) =>
                  socialLinks[key] ? (
                    <a
                      key={key}
                      href={socialLinks[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[10px] font-black text-white/40 hover:text-white hover:border-white/[0.15] uppercase tracking-widest transition-all"
                    >
                      <Icon className="w-3 h-3" /> {label}
                    </a>
                  ) : null
                )}
              </div>
            )}

            {/* Categories + Tokens Minted — same layout as user panel stat counters */}
            <div className="pt-4 border-t border-white/4">
              {/* Categories pills */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Stat counters row */}
              <div className="flex items-center gap-8">
                <div>
                  <p className="font-display text-3xl text-white uppercase tracking-tight leading-none">
                    {categories.length}
                  </p>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mt-1">Categories</p>
                </div>
                <div className="w-px h-8 bg-white/6" />
                <div>
                  <p className="font-display text-3xl text-white uppercase tracking-tight leading-none">
                    {tokensMinted !== null ? `$${tokensMinted.toLocaleString(undefined, { maximumFractionDigits: 1 })}` : "—"}
                  </p>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mt-1">Tokens Minted</p>
                </div>
              </div>
            </div>
          </div>
        {/* ── Showcase ── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 md:p-8 space-y-5">
            {/* Header */}
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl text-white uppercase tracking-tight">Showcase</h2>
              {/* Top-level tabs */}
              <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
                {(["events", "creations"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setShowcaseTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      showcaseTab === tab
                        ? "bg-white text-black"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    {tab === "events" ? "Events" : "Creations"}
                  </button>
                ))}
              </div>
            </div>

            {showcaseTab === "events" && (
              <>
                {/* Vote / Post sub-tabs */}
                <div className="flex items-center gap-4 border-b border-white/[0.06] pb-0">
                  {(["vote", "post"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEventTypeTab(t)}
                      className={cn(
                        "pb-3 text-[11px] font-black uppercase tracking-widest transition-colors border-b-2 -mb-px",
                        eventTypeTab === t
                          ? "text-primary border-primary"
                          : "text-white/30 border-transparent hover:text-white/60"
                      )}
                    >
                      {t === "vote" ? "Vote Only" : "Post & Vote"}
                    </button>
                  ))}
                </div>

                {/* Event list */}
                {(() => {
                  const filtered = brandEvents.filter((ev) =>
                    eventTypeTab === "vote" ? ev.eventType === "vote_only" : ev.eventType === "post_and_vote"
                  );
                  if (filtered.length === 0) {
                    return (
                      <p className="text-sm font-black text-white/20 uppercase tracking-wide py-4">
                        No {eventTypeTab === "vote" ? "vote" : "post"} events yet.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {filtered.map((ev) => {
                        const statusColors: Record<string, string> = {
                          posting: "text-lime-400",
                          voting: "text-lavender",
                          scheduled: "text-blue-400",
                          draft: "text-yellow-400",
                          completed: "text-white/30",
                          cancelled: "text-pink-400",
                        };
                        const statusLabels: Record<string, string> = {
                          posting: "Active", voting: "Voting", scheduled: "Scheduled",
                          draft: "Draft", completed: "Completed", cancelled: "Cancelled",
                        };
                        const thumb = ev.imageUrl || (ev.imageCid ? `https://gateway.pinata.cloud/ipfs/${ev.imageCid}` : null);
                        const date = new Date(ev.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        return (
                          <div key={ev.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
                            {/* Thumb */}
                            <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                              {thumb
                                ? <img src={thumb} alt={ev.title} className="w-full h-full object-cover" />
                                : <span className="text-[10px] font-black text-white/20">{ev.title[0]}</span>
                              }
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">
                                {brandName} <span className="mx-1">·</span>
                                <span className={statusColors[ev.status] ?? "text-white/30"}>{statusLabels[ev.status] ?? ev.status}</span>
                              </p>
                              <p className="text-sm font-black text-white truncate">{ev.title}</p>
                            </div>
                            {/* Date */}
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-wide shrink-0">{date}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}

            {showcaseTab === "creations" && (
              <>
                {(() => {
                  // Use only what the list endpoint reliably returns:
                  // 1. sampleUrls — images brand uploaded as vote options / post samples
                  // 2. imageUrl / imageCid — event cover image
                  const images: { src: string; label: string }[] = [];
                  brandEvents.forEach((ev) => {
                    // Sample images uploaded by brand (vote options / post samples)
                    if (ev.sampleUrls?.length) {
                      ev.sampleUrls.forEach((s) => {
                        const src = s.urls?.medium || s.urls?.thumbnail || s.urls?.full;
                        if (src) images.push({ src, label: ev.title });
                      });
                    }
                    // Fallback: event cover
                    const cover = ev.imageUrl || (ev.imageCid ? `https://gateway.pinata.cloud/ipfs/${ev.imageCid}` : null);
                    if (cover && !ev.sampleUrls?.length) {
                      images.push({ src: cover, label: ev.title });
                    }
                  });

                  if (images.length === 0) {
                    return (
                      <p className="text-sm font-black text-white/20 uppercase tracking-wide py-4">
                        No uploaded images yet.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map((img, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] group relative">
                          <img src={img.src} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <p className="text-[9px] font-black text-white uppercase tracking-wide line-clamp-2">{img.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-6">
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 space-y-4"
            >
              <div>
                <h3 className="font-display text-xl text-white uppercase tracking-tight">Account Info</h3>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">Read-only</p>
              </div>

              <div className="space-y-2">
                {/* Email */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-black text-white truncate">{user.email || "—"}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-wide">Role</p>
                    <p className="text-sm font-black text-white">{user.role || "—"}</p>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest shrink-0",
                    user.isOnboarded
                      ? "bg-green-500/10 border-green-500/20 text-green-400"
                      : "bg-white/[0.04] border-white/[0.08] text-white/30"
                  )}>
                    {user.isOnboarded ? "Active" : "Pending"}
                  </span>
                </div>

                {/* Member since */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-wide">Member Since</p>
                    <p className="text-sm font-black text-white">
                      {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Company size */}
                {userSocialLinks.companySize && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-wide">Company Size</p>
                      <p className="text-sm font-black text-white">{userSocialLinks.companySize}</p>
                    </div>
                  </div>
                )}

                {/* Wallet */}
                {user.walletAddress && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-all">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-wide">Wallet</p>
                      <p className="text-[11px] font-bold text-white/60 font-mono">
                        {`${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                      </p>
                    </div>
                    <button
                      onClick={copyWallet}
                      className="shrink-0 text-white/20 hover:text-white/60 transition-colors"
                      title="Copy wallet address"
                    >
                      {walletCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                <Info className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                <p className="text-[10px] text-white/30 font-medium leading-relaxed">
                  Account details are managed by your auth provider and cannot be changed here.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Logo Generator Modal */}
      <BrandImageGeneratorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onAddToOption={handleAiLogoGenerated}
        brandId={user?.ownedBrands?.[0]?.id ?? ""}
      />
    </div>
  );
}
