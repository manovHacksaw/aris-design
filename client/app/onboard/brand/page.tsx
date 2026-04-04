"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import {
  Loader2, ArrowRight, Check, Building2, FileText, Tag,
  Globe, AtSign, Users, ChevronLeft, Target,
} from "lucide-react";
import { toast } from "sonner";
import { AppSkeleton } from "@/components/auth/AuthGuard";
import OnboardingShell, { type StepMeta } from "@/components/onboarding/OnboardingShell";
import { apiRequest } from "@/services/api";

// ─── Data ────────────────────────────────────────────────────────────────────

const BRAND_CATEGORIES = [
  "Fashion & Apparel", "Technology", "Gaming", "Entertainment", "Sports & Fitness",
  "Food & Beverage", "Travel & Tourism", "Beauty & Personal Care", "Automotive",
  "Finance & Fintech", "Health & Wellness", "Education", "Real Estate", "Media",
];

const COMPANY_SIZES = [
  { id: "solo", label: "Solo Creator", desc: "Just you" },
  { id: "startup", label: "Startup", desc: "2 – 10 people" },
  { id: "small", label: "Small", desc: "11 – 50 people" },
  { id: "medium", label: "Mid-size", desc: "51 – 200 people" },
  { id: "enterprise", label: "Enterprise", desc: "200+ people" },
] as const;

const BUDGET_RANGES = [
  { id: "micro", label: "Under $1K", desc: "Testing the waters" },
  { id: "small", label: "$1K – $10K", desc: "Early campaigns" },
  { id: "medium", label: "$10K – $50K", desc: "Growing spend" },
  { id: "large", label: "$50K – $100K", desc: "Established brand" },
  { id: "enterprise", label: "$100K+", desc: "Enterprise scale" },
] as const;

const TARGET_AUDIENCES = [
  { id: "genz", label: "Gen Z (18–24)" },
  { id: "millennials", label: "Millennials (25–34)" },
  { id: "genx", label: "Gen X (35–44)" },
  { id: "boomers", label: "Boomers (45+)" },
  { id: "all", label: "All Ages" },
] as const;

const STEP_META: StepMeta[] = [
  {
    Icon: Building2,
    title: "Register Your\nBrand",
    subtitle: "Create your brand identity on Aris to start launching campaigns and reaching authentic audiences.",
    hints: [
      "Your brand name will be publicly visible to creators",
      "A clear tagline helps creators remember your brand",
      "Describe your mission, values, and what makes you unique",
    ],
    bg: "https://images.unsplash.com/photo-1599658880436-c61792e70672?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Globe,
    title: "Establish Your\nPresence",
    subtitle: "Connect your online presence so creators can discover and trust your brand.",
    hints: [
      "Your website URL builds credibility with creators",
      "Social links help creators research your brand",
      "Company size helps us tailor campaign recommendations",
    ],
    bg: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Target,
    title: "Define Your\nGoals",
    subtitle: "Tell us what you're looking for so we can match you with the right creators and audiences.",
    hints: [
      "Select all categories that apply to your brand",
      "Budget range helps set realistic campaign expectations",
      "Target audience improves creator matching accuracy",
    ],
    bg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1170&auto=format&fit=crop",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function BrandSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const { isConnected, isInitialized, isLoading: walletLoading, userInfo } = useWallet();
  const { completeOnboarding, isOnboarded: authIsOnboarded, isLoading: authLoading } = useAuth();
  const { updateProfile, user, isLoading: userLoading } = useUser();

  const isOnboarded = user?.isOnboarded || authIsOnboarded;

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    // Step 1
    brandName: "",
    tagline: "",
    description: "",
    // Step 2
    website: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    companySize: "",
    // Step 3
    categories: [] as string[],
    monthlyBudget: "",
    targetAudience: [] as string[],
  });

  useEffect(() => {
    if (!isInitialized || walletLoading) return;
    if (!isConnected) router.replace("/register");
  }, [isConnected, isInitialized, walletLoading, router]);

  useEffect(() => {
    if (!authLoading && !userLoading && isOnboarded) {
      router.replace(redirectPath || "/brand/pending");
    }
  }, [isOnboarded, authLoading, userLoading, router, redirectPath]);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const toggleAudience = (id: string) => {
    setForm((f) => ({
      ...f,
      targetAudience: f.targetAudience.includes(id)
        ? f.targetAudience.filter((a) => a !== id)
        : [...f.targetAudience, id],
    }));
  };

  const handleNextStep1 = () => {
    if (!form.brandName.trim()) {
      toast.error("Brand name is required");
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!form.companySize) {
      toast.error("Please select your company size");
      return;
    }
    setStep(3);
  };

  const handleComplete = async () => {
    if (form.categories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }
    setIsSaving(true);
    try {
      // Submit a brand application for admin approval
      await apiRequest("/brand-application/register", {
        method: "POST",
        body: JSON.stringify({
          brandName: form.brandName,
          tagline: form.tagline,
          description: form.description,
          categories: form.categories,
          websiteUrl: form.website,
          socialLinks: {
            website: form.website,
            instagram: form.instagram,
            twitter: form.twitter,
            linkedin: form.linkedin,
          },
          contactEmail: userInfo?.email || user?.email || "",
          contactPersonName: userInfo?.name || user?.displayName || user?.walletAddress || "",
          contactRole: "Brand Owner",
          platformUsageReason: "Brand campaigns on Aris",
          agreementAuthorized: true,
          agreementAccurate: true,
        }),
      });

      // Mark as onboarded in localStorage so AuthGuard won't loop back to /onboard/brand
      completeOnboarding({
        role: "brand",
        brandName: form.brandName,
        brandTagline: form.tagline,
        brandDescription: form.description,
        brandWebsite: form.website,
        brandInstagram: form.instagram,
        brandTwitter: form.twitter,
        brandLinkedin: form.linkedin,
        companySize: form.companySize,
        brandCategories: form.categories,
        monthlyBudget: form.monthlyBudget,
        targetAudience: form.targetAudience,
        isOnboarded: true,
      });

      // Also update user profile so backend reflects isOnboarded
      await updateProfile({ isOnboarded: true });

      toast.success("Application submitted! Awaiting admin approval.");
      router.push(redirectPath || "/brand/pending");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isInitialized || walletLoading || authLoading || userLoading) {
    return <AppSkeleton />;
  }

  if (isOnboarded) return null;

  const descLength = form.description.length;

  return (
    <OnboardingShell step={step} total={3} meta={STEP_META[step - 1]}>

      {/* Signed-in user pill */}
      {userInfo && (
        <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
          {userInfo.profileImage ? (
            <img src={userInfo.profileImage} alt="" className="w-9 h-9 rounded-full" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{userInfo.name}</p>
            <p className="text-xs text-foreground/40 truncate">{userInfo.email}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Signed in
          </div>
        </div>
      )}

      {/* ─── Step 1: Brand Identity ─── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 1 of 3</p>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">Brand Identity</h1>
            <p className="text-sm text-foreground/40">Tell us about your brand.</p>
          </div>

          {/* Brand Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Brand Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                type="text"
                value={form.brandName}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                placeholder="Your brand name"
                className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Tagline <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. Just Do It"
                maxLength={80}
                className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                Description <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
              </label>
              <span className={`text-[11px] font-medium tabular-nums ${descLength > 270 ? "text-amber-400" : "text-foreground/25"}`}>
                {descLength}/300
              </span>
            </div>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-foreground/30" />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 300) }))}
                placeholder="Describe your brand, mission, and what you stand for..."
                rows={4}
                className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleNextStep1}
            className="w-full py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Step 2: Presence ─── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 2 of 3</p>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">Brand Presence</h1>
            <p className="text-sm text-foreground/40">Connect your online presence.</p>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Website <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://yourbrand.com"
                className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-3.5 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Social Links <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
            </label>
            <div className="space-y-2">
              {[
                { key: "instagram" as const, prefix: "instagram.com/", placeholder: "Instagram handle" },
                { key: "twitter" as const, prefix: "x.com/", placeholder: "Twitter / X handle" },
                { key: "linkedin" as const, prefix: "linkedin.com/company/", placeholder: "LinkedIn company slug" },
              ].map(({ key, prefix, placeholder }) => (
                <div key={key} className="flex rounded-[14px] overflow-hidden border border-border/50 focus-within:border-primary/50 transition-colors">
                  <div className="flex items-center px-3 py-3 bg-white/[0.03] border-r border-border/30 text-[11px] text-foreground/30 font-medium whitespace-nowrap shrink-0">
                    <AtSign className="w-3.5 h-3.5 mr-1.5" />
                    {prefix}
                  </div>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/^@/, "") }))}
                    placeholder={placeholder}
                    className="flex-1 bg-card px-3 py-3 text-sm font-medium placeholder:text-foreground/20 focus:outline-none min-w-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Company Size */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Company Size <span className="text-red-400/70 normal-case font-normal tracking-normal">required</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {COMPANY_SIZES.map(({ id, label, desc }) => {
                const selected = form.companySize === id;
                return (
                  <button
                    key={id}
                    onClick={() => setForm((f) => ({ ...f, companySize: id }))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border text-left transition-all ${selected
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card border-border/40 hover:border-border/70"
                      }`}
                  >
                    <Users className={`w-4 h-4 shrink-0 ${selected ? "text-primary" : "text-foreground/30"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-bold ${selected ? "text-foreground" : "text-foreground/60"}`}>{label}</span>
                      <span className={`text-xs ml-2 ${selected ? "text-foreground/50" : "text-foreground/30"}`}>{desc}</span>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-5 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              onClick={handleNextStep2}
              className="flex-1 py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Campaign Goals ─── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 3 of 3</p>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">Campaign Goals</h1>
            <p className="text-sm text-foreground/40">Define your targeting to find the right creators.</p>
          </div>

          {/* Brand Categories */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Brand Categories <span className="text-red-400/70 normal-case font-normal tracking-normal">at least 1</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {BRAND_CATEGORIES.map((cat) => {
                const selected = form.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${selected
                      ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                      : "bg-card text-foreground/50 border-border/40 hover:border-border/70 hover:text-foreground/70"
                      }`}
                  >
                    {selected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Budget */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Monthly Campaign Budget <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {BUDGET_RANGES.map(({ id, label, desc }) => {
                const selected = form.monthlyBudget === id;
                return (
                  <button
                    key={id}
                    onClick={() => setForm((f) => ({ ...f, monthlyBudget: selected ? "" : id }))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border text-left transition-all ${selected
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card border-border/40 hover:border-border/70"
                      }`}
                  >
                    <div className="flex-1">
                      <span className={`text-sm font-bold ${selected ? "text-foreground" : "text-foreground/60"}`}>{label}</span>
                      <span className={`text-xs ml-2 ${selected ? "text-foreground/50" : "text-foreground/30"}`}>{desc}</span>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
              Target Audience <span className="text-foreground/20 normal-case font-normal tracking-normal">optional · multi-select</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TARGET_AUDIENCES.map(({ id, label }) => {
                const selected = form.targetAudience.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleAudience(id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selected
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "bg-card border-border/40 text-foreground/50 hover:border-border/70"
                      }`}
                  >
                    {selected && <Check className="inline w-3 h-3 mr-1" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-5 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              onClick={handleComplete}
              disabled={isSaving || form.categories.length === 0}
              className="flex-1 py-4 rounded-[16px] bg-primary text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Launch Brand
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </OnboardingShell>
  );
}
