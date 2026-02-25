"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Globe, Save, Loader2, CheckCircle, AlertCircle, X, Camera } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { upsertBrandProfile } from "@/services/brand.service";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";

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

export default function BrandSettingsPage() {
  const { user, updateProfile, refreshUser, isLoading: userLoading } = useUser();
  const { onboardingData } = useAuth();
  const seeded = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Brand data lives on the User record (saved via updateProfile during onboarding)
  // socialLinks JSON contains: website, instagram, twitter, linkedin, tagline, companySize
  const userSocialLinks = (user?.socialLinks ?? {}) as Record<string, string>;

  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Logo upload
  const [logoCid, setLogoCid] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed form once user loads (only once, to avoid overwriting in-progress edits)
  useEffect(() => {
    if (!user || seeded.current) return;
    seeded.current = true;

    const sl = (user.socialLinks ?? {}) as Record<string, string>;
    // Prefer ownedBrands[0] for brand-specific fields, fall back to user fields, then localStorage
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
    // Show local preview immediately
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
      // Update the Brand record (creates one if it doesn't exist yet)
      await upsertBrandProfile({
        name: brandName,
        tagline,
        description,
        categories,
        ...(logoCid ? { logoCid } : {}),
        socialLinks: {
          website: socialLinks.website,
          twitter: socialLinks.twitter,
          instagram: socialLinks.instagram,
          linkedin: socialLinks.linkedin,
        },
      });

      // Keep User record in sync (displayName, bio, preferredCategories, socialLinks)
      await updateProfile({
        displayName: brandName,
        bio: description,
        preferredCategories: categories,
        socialLinks: {
          ...userSocialLinks,   // preserve companySize, monthlyBudget, targetAudience, etc.
          tagline,
          website: socialLinks.website,
          twitter: socialLinks.twitter,
          instagram: socialLinks.instagram,
          linkedin: socialLinks.linkedin,
        },
      });

      await refreshUser();
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
    <div className="max-w-4xl mx-auto space-y-8 pb-32 md:pb-12">
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

      <header>
        <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your brand profile.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Brand Profile Card */}
          <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-bold mb-6">Brand Profile</h2>

            <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
              {/* Logo upload */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Brand logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-black text-white">
                      {logoInitial}
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingLogo
                      ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                      : <Camera className="w-6 h-6 text-white" />
                    }
                  </div>
                </button>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {isUploadingLogo ? "Uploading…" : "Click to change"}
                </span>
                <span className="text-[10px] text-muted-foreground/50">JPEG, PNG, WebP · max 5 MB</span>
              </div>

              <div className="flex-1 w-full space-y-4">
                {/* Brand Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Your brand name"
                    className="w-full p-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Just Do It"
                    maxLength={80}
                    className="w-full p-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell creators what your brand is about..."
                    maxLength={200}
                    className="w-full p-3 h-24 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{description.length}/200</p>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const selected = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        selected
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Social Links Card */}
          <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-bold mb-6">Online Presence</h2>
            <div className="space-y-4">
              {SOCIAL_KEYS.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="url"
                      value={socialLinks[key] ?? ""}
                      onChange={(e) =>
                        setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="w-full pl-10 pr-4 py-3 bg-secondary/50 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Account Info (read-only) */}
          {user && (
            <section className="bg-card border border-border rounded-[24px] p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-bold">Account Info</h2>
                <span className="ml-auto text-xs bg-secondary text-muted-foreground border border-border px-2 py-0.5 rounded-full font-bold">
                  Read-only
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Email", value: user.email },
                  { label: "Wallet", value: user.walletAddress ? `${user.walletAddress.slice(0, 8)}…${user.walletAddress.slice(-6)}` : "—" },
                  { label: "Company Size", value: userSocialLinks.companySize ?? "—" },
                  { label: "Monthly Budget", value: userSocialLinks.monthlyBudget ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground/70 bg-secondary/30 rounded-xl px-3 py-2 break-all">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {user && (
            <section className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Brand Status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account</span>
                  {user.isOnboarded ? (
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-bold text-xs uppercase tracking-wide">{user.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-bold text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </section>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
