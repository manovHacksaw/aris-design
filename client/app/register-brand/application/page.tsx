"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ArrowRight, ChevronLeft, Building2, Mail, Phone,
  Globe, AtSign, FileText, Loader2, CheckCircle2, AlertTriangle,
  Wallet, DollarSign, Zap, Upload, Info, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTOSAVE_KEY = "aris_brand_app_draft";

const BRAND_CATEGORIES = [
  "Fashion & Apparel", "Technology", "Gaming", "Entertainment",
  "Sports & Fitness", "Food & Beverage", "Travel & Tourism",
  "Beauty & Personal Care", "Automotive", "Finance & Fintech",
  "Health & Wellness", "Education", "Real Estate", "Media", "Other",
];

const USAGE_OPTIONS = [
  { id: "campaigns", label: "Content Campaigns" },
  { id: "surveys", label: "Surveys & Polls" },
  { id: "competitions", label: "Content Competitions" },
  { id: "community", label: "Community Building" },
  { id: "ads", label: "Branded Advertising" },
  { id: "creator_discovery", label: "Creator Discovery" },
  { id: "market_research", label: "Market Research" },
  { id: "product_launch", label: "Product Launch Events" },
];

const BUDGET_OPTIONS = [
  "Under $500/month",
  "$500 – $2,000/month",
  "$2,000 – $10,000/month",
  "$10,000+/month",
  "Not sure yet",
];

const FREQUENCY_OPTIONS = [
  "One-off / Test campaign",
  "1–2 campaigns/month",
  "3–5 campaigns/month",
  "Weekly campaigns",
  "Daily / Ongoing",
];

const REWARD_APPROACH_OPTIONS = [
  "Equal distribution to all participants",
  "Performance-based (top voters & creators)",
  "Leaderboard-only (top 3 creators)",
  "Flat base rewards + leaderboard bonus",
  "Custom (describe in strategy field)",
];

const DOC_TYPES = [
  { id: "business_reg", label: "Business Registration Certificate" },
  { id: "gst_tax", label: "GST / Tax Documents" },
  { id: "pan_id", label: "PAN / Legal ID" },
  { id: "trademark", label: "Trademark / Brand Ownership Proof" },
  { id: "incorporation", label: "Company Incorporation Documents" },
  { id: "website_proof", label: "Brand Website Proof" },
  { id: "campaign_portfolio", label: "Previous Campaign Portfolio" },
];

const STEPS = [
  { id: 1, label: "Brand Identity" },
  { id: 2, label: "Contact" },
  { id: 3, label: "Legal & Docs" },
  { id: 4, label: "Rewards" },
  { id: 5, label: "Review" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  // Step 1 — Brand Identity
  brandName: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  categories: string[];
  whatBrandDoes: string;
  brandGoals: string;
  intendedUsage: string[];
  whyJoinAris: string;
  engagementStrategy: string;

  // Step 2 — Contact & Ownership
  contactPersonName: string;
  contactRole: string;
  contactEmail: string;
  phoneNumber: string;
  telegramHandle: string;
  instagram: string;
  twitter: string;
  linkedin: string;

  // Step 3 — Legal & Documents
  companyName: string;
  gstNumber: string;
  panNumber: string;
  platformUsageReason: string;
  availableDocuments: string[];
  agreementAuthorized: boolean;
  agreementAccurate: boolean;

  // Step 4 — Wallet & Rewards
  walletAddress: string;
  expectedBudget: string;
  campaignFrequency: string;
  rewardApproach: string;
};

const INITIAL_FORM: FormState = {
  brandName: "", tagline: "", description: "", websiteUrl: "",
  categories: [], whatBrandDoes: "", brandGoals: "",
  intendedUsage: [], whyJoinAris: "", engagementStrategy: "",
  contactPersonName: "", contactRole: "", contactEmail: "",
  phoneNumber: "", telegramHandle: "", instagram: "", twitter: "", linkedin: "",
  companyName: "", gstNumber: "", panNumber: "", platformUsageReason: "",
  availableDocuments: [], agreementAuthorized: false, agreementAccurate: false,
  walletAddress: "", expectedBudget: "", campaignFrequency: "", rewardApproach: "",
};

// ─── Helper Components ────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-card border border-border/50 rounded-[14px] px-4 py-3.5 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors";

const textareaClass = cn(inputClass, "resize-none");

function Field({
  label, required, optional, note, hint, children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  note?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest flex items-center gap-2 flex-wrap">
        {label}
        {required && <span className="text-red-400/70 normal-case font-semibold tracking-normal">required</span>}
        {optional && <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>}
        {note && <span className="text-foreground/25 normal-case font-normal tracking-normal">· {note}</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-foreground/30 leading-relaxed">{hint}</p>}
    </div>
  );
}

function InputWithIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border/50 rounded-[14px] px-4 py-3.5 focus-within:border-primary/50 transition-colors">
      <span className="text-foreground/30 shrink-0">{icon}</span>
      {children}
    </div>
  );
}

function SelectField({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputClass, "cursor-pointer appearance-none")}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o} className="bg-zinc-900">
          {o}
        </option>
      ))}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandApplicationPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // ── Autosave: Load draft on mount ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const { form: savedForm, step: savedStep } = JSON.parse(raw);
        if (savedForm?.brandName) {
          setHasDraft(true);
          setForm((prev) => ({ ...prev, ...savedForm }));
          setStep(savedStep ?? 1);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Autosave: Save on form change ─────────────────────────────────────────
  useEffect(() => {
    if (submitted) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ form, step }));
    } catch {
      // ignore
    }
  }, [form, step, submitted]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key: keyof FormState, value: string) =>
    setForm((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });

  const clearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setForm(INITIAL_FORM);
    setStep(1);
    setHasDraft(false);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.brandName.trim()) { toast.error("Brand name is required"); return false; }
      if (form.categories.length === 0) { toast.error("Select at least one category"); return false; }
      if (!form.whatBrandDoes.trim()) { toast.error("Please describe what your brand does"); return false; }
    }
    if (s === 2) {
      if (!form.contactPersonName.trim()) { toast.error("Contact person name is required"); return false; }
      if (!form.contactRole.trim()) { toast.error("Contact role is required"); return false; }
      if (!form.contactEmail.trim() || !/\S+@\S+\.\S+/.test(form.contactEmail)) {
        toast.error("A valid work email is required"); return false;
      }
    }
    if (s === 3) {
      if (!form.platformUsageReason.trim()) {
        toast.error("Please explain your platform usage plans"); return false;
      }
      if (!form.agreementAuthorized || !form.agreementAccurate) {
        toast.error("You must accept both agreements"); return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${API_URL}/brand-application/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: form.brandName,
          tagline: form.tagline,
          description: form.description,
          categories: form.categories,
          websiteUrl: form.websiteUrl,
          socialLinks: {
            website: form.websiteUrl,
            instagram: form.instagram,
            twitter: form.twitter,
            linkedin: form.linkedin,
          },
          contactEmail: form.contactEmail,
          contactPersonName: form.contactPersonName,
          contactRole: form.contactRole,
          phoneNumber: form.phoneNumber,
          telegramHandle: form.telegramHandle,
          companyName: form.companyName,
          gstNumber: form.gstNumber,
          panNumber: form.panNumber,
          platformUsageReason: form.platformUsageReason,
          agreementAuthorized: form.agreementAuthorized,
          agreementAccurate: form.agreementAccurate,
          // Extended fields stored in documents JSON
          documents: {
            whatBrandDoes: form.whatBrandDoes,
            brandGoals: form.brandGoals,
            intendedUsage: form.intendedUsage,
            whyJoinAris: form.whyJoinAris,
            engagementStrategy: form.engagementStrategy,
            availableDocuments: form.availableDocuments,
            walletAddress: form.walletAddress,
            expectedBudget: form.expectedBudget,
            campaignFrequency: form.campaignFrequency,
            rewardApproach: form.rewardApproach,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Submission failed");
      }

      localStorage.removeItem(AUTOSAVE_KEY);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success State ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center space-y-5 sm:space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 border-[3px] border-primary rounded-2xl flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-3xl sm:text-5xl font-display text-foreground uppercase tracking-tight mb-2 sm:mb-3">
              Application <span className="text-primary">Submitted!</span>
            </h1>
            <p className="text-foreground/50 text-sm leading-relaxed">
              We've received your brand application for{" "}
              <span className="text-foreground font-bold">{form.brandName}</span>. Our team will
              review it and contact you at{" "}
              <span className="text-primary font-bold">{form.contactEmail}</span> within 24–48 hours.
            </p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3 text-left">
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">What happens next</p>
            {[
              { label: "Application submitted", done: true },
              { label: "Admin review (24–48 hours)", done: false, active: true },
              { label: "Decision sent to your email", done: false },
              { label: "Brand activation link emailed", done: false },
              { label: "Connect wallet & claim brand", done: false },
            ].map(({ label, done, active }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  done ? "bg-primary border-primary" : active ? "border-primary" : "border-border/40"
                )}>
                  {done && <Check className="w-3 h-3 text-black" />}
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  done || active ? "text-foreground" : "text-foreground/30"
                )}>{label}</span>
              </div>
            ))}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left space-y-1">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Important
            </p>
            <p className="text-xs text-foreground/60 leading-relaxed">
              Your activation link will be sent exclusively to{" "}
              <span className="text-primary font-bold">{form.contactEmail}</span>. Make sure this
              email is accessible by the team members who will manage your brand account.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/register"
              className="flex-1 py-3.5 rounded-[14px] border border-border/50 text-foreground/50 hover:text-foreground font-bold text-xs uppercase tracking-widest text-center transition-colors"
            >
              Back to Register
            </Link>
            <Link
              href="/claim-brand"
              className="flex-1 py-3.5 rounded-[14px] bg-primary text-black font-black text-xs uppercase tracking-widest text-center hover:bg-primary/90 transition-colors"
            >
              Already Approved?
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────────────────
  const completeness = (() => {
    let filled = 0;
    const checks = [
      form.brandName, form.categories.length > 0, form.whatBrandDoes,
      form.contactPersonName, form.contactRole, form.contactEmail,
      form.platformUsageReason, form.agreementAuthorized && form.agreementAccurate,
    ];
    checks.forEach((c) => { if (c) filled++; });
    return Math.round((filled / checks.length) * 100);
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link
          href="/register-brand"
          className="flex items-center gap-1.5 text-foreground/40 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Back</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {hasDraft && (
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest hidden sm:block">
              Draft saved
            </span>
          )}
          <span className="text-[10px] sm:text-xs font-bold text-foreground/25 uppercase tracking-widest">Brand Application</span>
        </div>
        <div className="w-10 sm:w-16" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-32">

        {/* Resume Draft Banner */}
        {hasDraft && step === 1 && form.brandName && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 sm:mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-foreground/70">
                <span className="font-bold text-foreground">Draft resumed</span> — continuing from where you left off.
              </p>
            </div>
            <button
              onClick={clearDraft}
              className="text-[11px] font-bold text-foreground/30 hover:text-red-400 uppercase tracking-wider transition-colors shrink-0"
            >
              Start fresh
            </button>
          </motion.div>
        )}

        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-display text-foreground uppercase tracking-tight leading-none mb-2 sm:mb-3">
            Apply as a <span className="text-primary">Brand</span>
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="text-foreground/40 text-xs sm:text-sm leading-relaxed flex-1">
              Fill out your application — our team reviews and approves within 24–48 hours.
            </p>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Completeness</p>
              <p className="text-base sm:text-lg font-display text-primary">{completeness}%</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-8 sm:mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all",
                  step > s.id
                    ? "bg-primary border-primary text-black"
                    : step === s.id
                    ? "border-primary text-primary"
                    : "border-border/30 text-foreground/25"
                )}>
                  {step > s.id ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : s.id}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-colors",
                  step >= s.id ? "text-foreground" : "text-foreground/25"
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-1.5 sm:mx-2 transition-colors",
                  step > s.id ? "bg-primary" : "bg-border/30"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── Step 1: Brand Identity ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-1">Step 1 of 5</p>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Brand Identity</h2>
                  <p className="text-sm text-foreground/40 mt-1">
                    Tell us about your brand. This information forms your public profile.
                  </p>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    <span className="font-bold text-foreground">Brand name is immutable</span> after approval.
                    Choose carefully — it cannot be changed once your brand is activated.
                  </p>
                </div>

                <Field label="Brand Name" required>
                  <InputWithIcon icon={<Building2 className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={form.brandName}
                      onChange={(e) => update("brandName", e.target.value)}
                      placeholder="e.g. Nike"
                      className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-foreground/20"
                    />
                  </InputWithIcon>
                </Field>

                <Field label="Tagline" optional>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => update("tagline", e.target.value.slice(0, 80))}
                    placeholder='e.g. "Just Do It"'
                    className={inputClass}
                  />
                  <p className="text-[11px] text-foreground/25 text-right mt-1">{form.tagline.length}/80</p>
                </Field>

                <Field label="Brand Description" optional>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value.slice(0, 500))}
                    placeholder="Describe your brand, mission, and what makes you unique..."
                    rows={3}
                    className={textareaClass}
                  />
                  <p className="text-[11px] text-foreground/25 text-right mt-1">{form.description.length}/500</p>
                </Field>

                <Field label="What does your brand do?" required
                  hint="Be specific. What products or services do you offer? What problem do you solve?">
                  <textarea
                    value={form.whatBrandDoes}
                    onChange={(e) => update("whatBrandDoes", e.target.value)}
                    placeholder="Describe your products/services, target audience, and value proposition..."
                    rows={3}
                    className={textareaClass}
                  />
                </Field>

                <Field label="Brand Goals on Aris" optional
                  hint="What do you want to achieve through your presence on this platform?">
                  <textarea
                    value={form.brandGoals}
                    onChange={(e) => update("brandGoals", e.target.value)}
                    placeholder="e.g. Build brand awareness, run product feedback campaigns, grow a creator network..."
                    rows={3}
                    className={textareaClass}
                  />
                </Field>

                <Field label="Website URL" optional>
                  <InputWithIcon icon={<Globe className="w-4 h-4" />}>
                    <input
                      type="url"
                      value={form.websiteUrl}
                      onChange={(e) => update("websiteUrl", e.target.value)}
                      placeholder="https://yourbrand.com"
                      className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-foreground/20"
                    />
                  </InputWithIcon>
                </Field>

                <Field label="Brand Categories" required note="Select at least one">
                  <div className="flex flex-wrap gap-2">
                    {BRAND_CATEGORIES.map((cat) => {
                      const selected = form.categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleArray("categories", cat)}
                          className={cn(
                            "px-3.5 py-2 rounded-full text-xs font-bold border transition-all",
                            selected
                              ? "bg-primary text-black border-primary shadow-sm shadow-primary/20"
                              : "bg-card text-foreground/50 border-border/40 hover:border-border hover:text-foreground/70"
                          )}
                        >
                          {selected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Intended Usage" optional note="Select all that apply">
                  <div className="grid grid-cols-2 gap-2">
                    {USAGE_OPTIONS.map(({ id, label }) => {
                      const selected = form.intendedUsage.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleArray("intendedUsage", id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-[12px] border text-left text-xs font-semibold transition-all",
                            selected
                              ? "bg-primary/10 border-primary/40 text-primary"
                              : "bg-card border-border/40 text-foreground/50 hover:border-border hover:text-foreground/70"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                            selected ? "bg-primary border-primary" : "border-border/50"
                          )}>
                            {selected && <Check className="w-2.5 h-2.5 text-black" />}
                          </div>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Why do you want to join Aris?" optional
                  hint="What specifically attracted you to this platform? Long-form answer welcome.">
                  <textarea
                    value={form.whyJoinAris}
                    onChange={(e) => update("whyJoinAris", e.target.value)}
                    placeholder="Share your motivation, what aligns with your brand strategy, and what you hope to find here..."
                    rows={4}
                    className={textareaClass}
                  />
                </Field>

                <Field label="Expected Engagement Strategy" optional
                  hint="How do you plan to engage with the Aris community? Content types, frequency, tone?">
                  <textarea
                    value={form.engagementStrategy}
                    onChange={(e) => update("engagementStrategy", e.target.value)}
                    placeholder="Describe how you'll create campaigns, interact with creators, and build your community presence..."
                    rows={3}
                    className={textareaClass}
                  />
                </Field>
              </div>
            )}

            {/* ── Step 2: Contact & Ownership ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-1">Step 2 of 5</p>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Contact & Ownership</h2>
                  <p className="text-sm text-foreground/40 mt-1">Who represents this brand?</p>
                </div>

                {/* Critical Email Enforcement Banner */}
                <div className="bg-primary/8 border-2 border-primary/30 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-foreground">Email Identity Enforcement</p>
                      <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
                        The contact email you provide is critical. Your brand activation link will be sent
                        <span className="font-bold text-foreground"> exclusively to this email</span>, and
                        your brand account can only be claimed by authenticating with this exact email identity
                        through Privy.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:pl-11">
                    {[
                      "Ensure this email is accessible by team members who will manage the brand account",
                      "The activation link is single-use and expires after 48 hours",
                      "Privy authentication must match this email during claim",
                    ].map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-foreground/50">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label="Contact Person Name" required>
                    <input
                      type="text"
                      value={form.contactPersonName}
                      onChange={(e) => update("contactPersonName", e.target.value)}
                      placeholder="Full name"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Role / Title" required>
                    <input
                      type="text"
                      value={form.contactRole}
                      onChange={(e) => update("contactRole", e.target.value)}
                      placeholder='e.g. "Marketing Manager"'
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field
                  label="Work Email"
                  required
                  note="Claim link will be sent here"
                  hint="Use a team-accessible email. This email cannot be changed after submission."
                >
                  <InputWithIcon icon={<Mail className="w-4 h-4" />}>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => update("contactEmail", e.target.value)}
                      placeholder="brand@yourcompany.com"
                      className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-foreground/20"
                    />
                  </InputWithIcon>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label="Phone Number" optional>
                    <InputWithIcon icon={<Phone className="w-4 h-4" />}>
                      <input
                        type="tel"
                        value={form.phoneNumber}
                        onChange={(e) => update("phoneNumber", e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-foreground/20"
                      />
                    </InputWithIcon>
                  </Field>
                  <Field label="Telegram Handle" optional>
                    <InputWithIcon icon={<AtSign className="w-4 h-4" />}>
                      <input
                        type="text"
                        value={form.telegramHandle}
                        onChange={(e) => update("telegramHandle", e.target.value.replace(/^@/, ""))}
                        placeholder="telegram_handle"
                        className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-foreground/20"
                      />
                    </InputWithIcon>
                  </Field>
                </div>

                <Field label="Social Links" optional>
                  <div className="space-y-2">
                    {([
                      { key: "instagram", prefix: "instagram.com/", placeholder: "Instagram handle" },
                      { key: "twitter", prefix: "x.com/", placeholder: "Twitter / X handle" },
                      { key: "linkedin", prefix: "linkedin.com/company/", placeholder: "LinkedIn company slug" },
                    ] as const).map(({ key, prefix, placeholder }) => (
                      <div
                        key={key}
                        className="flex rounded-[14px] overflow-hidden border border-border/50 focus-within:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center px-2.5 sm:px-3 py-3 bg-white/[0.03] border-r border-border/30 text-[10px] sm:text-[11px] text-foreground/30 font-medium shrink-0 max-w-[100px] sm:max-w-none overflow-hidden">
                          <AtSign className="w-3 h-3 mr-1 shrink-0" /><span className="truncate">{prefix}</span>
                        </div>
                        <input
                          type="text"
                          value={form[key]}
                          onChange={(e) => update(key, e.target.value.replace(/^@/, ""))}
                          placeholder={placeholder}
                          className="flex-1 bg-card px-3 py-3 text-sm font-medium placeholder:text-foreground/20 focus:outline-none min-w-0"
                        />
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {/* ── Step 3: Legal & Documents ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-1">Step 3 of 5</p>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Legal & Documents</h2>
                  <p className="text-sm text-foreground/40 mt-1">Legal details and platform agreements.</p>
                </div>

                <div className="bg-card/50 border border-border/40 rounded-2xl p-4 flex gap-3">
                  <Info className="w-4 h-4 text-foreground/40 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/50 leading-relaxed">
                    Documents are <span className="font-bold text-foreground">optional but recommended</span>.
                    Providing verification documents increases your brand credibility score and can speed up the
                    review process. Documents can be submitted after approval if needed.
                  </p>
                </div>

                <Field label="Company / Legal Entity Name" optional>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    placeholder="Registered company name"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label="GST Number" optional note="India only">
                    <input
                      type="text"
                      value={form.gstNumber}
                      onChange={(e) => update("gstNumber", e.target.value)}
                      placeholder="GST registration number"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="PAN Number" optional note="India only">
                    <input
                      type="text"
                      value={form.panNumber}
                      onChange={(e) => update("panNumber", e.target.value)}
                      placeholder="PAN number"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Available Verification Documents" optional
                  hint="Indicate which documents you can provide. Our team may request these during review.">
                  <div className="space-y-2">
                    {DOC_TYPES.map(({ id, label }) => {
                      const selected = form.availableDocuments.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleArray("availableDocuments", id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-[14px] border text-left transition-all",
                            selected
                              ? "bg-primary/10 border-primary/30 text-foreground"
                              : "bg-card border-border/40 text-foreground/50 hover:border-border hover:text-foreground/70"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            selected ? "bg-primary border-primary" : "border-border/50"
                          )}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="text-xs font-semibold flex-1">{label}</span>
                          {selected && (
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Available</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {form.availableDocuments.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-1.5 flex-1 bg-border/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(form.availableDocuments.length / DOC_TYPES.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-primary">
                        {form.availableDocuments.length}/{DOC_TYPES.length} verified
                      </span>
                    </div>
                  )}
                </Field>

                <Field label="Platform Usage Plans" required
                  hint="Describe your goals, what campaigns you plan to run, and how Aris fits your strategy.">
                  <textarea
                    value={form.platformUsageReason}
                    onChange={(e) => update("platformUsageReason", e.target.value)}
                    placeholder="Describe your planned campaigns, target audience, content formats, and how you'll use Aris to achieve your marketing objectives..."
                    rows={5}
                    className={textareaClass}
                  />
                </Field>

                {/* Agreements */}
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">Agreements</p>
                  {([
                    {
                      key: "agreementAuthorized" as const,
                      label: "I confirm that I am authorized to represent this brand and submit this application on its behalf.",
                    },
                    {
                      key: "agreementAccurate" as const,
                      label: "I certify that all information provided in this application is accurate and true to the best of my knowledge.",
                    },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => update(key, !form[key])}
                      className={cn(
                        "w-full flex items-start gap-3 p-4 rounded-[14px] border text-left transition-all",
                        form[key]
                          ? "bg-primary/10 border-primary/40"
                          : "bg-card border-border/40 hover:border-border"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                        form[key] ? "bg-primary border-primary" : "border-border/50"
                      )}>
                        {form[key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-foreground/60 leading-relaxed">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 4: Wallet & Rewards ── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-1">Step 4 of 5</p>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Wallet & Rewards Intent</h2>
                  <p className="text-sm text-foreground/40 mt-1">
                    Optional financial context. Helps us prepare your reward infrastructure.
                  </p>
                </div>

                <div className="bg-card/50 border border-border/40 rounded-2xl p-4 flex gap-3">
                  <Info className="w-4 h-4 text-foreground/40 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/50 leading-relaxed">
                    All fields in this section are <span className="font-bold text-foreground">optional</span>.
                    This information is used internally for campaign readiness analytics and to better support
                    your onboarding. It does not affect your application approval.
                  </p>
                </div>

                <Field label="Wallet Address" optional
                  hint="Your Polygon wallet for funding reward pools. You can connect your wallet after approval.">
                  <InputWithIcon icon={<Wallet className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={form.walletAddress}
                      onChange={(e) => update("walletAddress", e.target.value)}
                      placeholder="0x... (Polygon / EVM-compatible)"
                      className="w-full bg-transparent outline-none text-sm font-mono placeholder:text-foreground/20 placeholder:font-sans"
                    />
                  </InputWithIcon>
                </Field>

                <Field label="Expected Monthly Reward Budget" optional>
                  <SelectField
                    value={form.expectedBudget}
                    onChange={(v) => update("expectedBudget", v)}
                    options={BUDGET_OPTIONS}
                    placeholder="Select a range..."
                  />
                </Field>

                <Field label="Campaign Frequency Expectation" optional>
                  <SelectField
                    value={form.campaignFrequency}
                    onChange={(v) => update("campaignFrequency", v)}
                    options={FREQUENCY_OPTIONS}
                    placeholder="How often do you plan to run campaigns?"
                  />
                </Field>

                <Field label="Reward Distribution Approach" optional
                  hint="How do you prefer to distribute rewards to participants?">
                  <div className="space-y-2">
                    {REWARD_APPROACH_OPTIONS.map((option) => {
                      const selected = form.rewardApproach === option;
                      return (
                        <button
                          key={option}
                          onClick={() => update("rewardApproach", selected ? "" : option)}
                          className={cn(
                            "w-full flex items-start gap-3 px-4 py-3.5 rounded-[14px] border text-left transition-all",
                            selected
                              ? "bg-primary/10 border-primary/40"
                              : "bg-card border-border/40 hover:border-border"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            selected ? "border-primary" : "border-border/50"
                          )}>
                            {selected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </div>
                          <span className="text-xs text-foreground/70 leading-relaxed">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}

            {/* ── Step 5: Review & Submit ── */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-black text-primary/70 uppercase tracking-widest mb-1">Step 5 of 5</p>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Review & Submit</h2>
                  <p className="text-sm text-foreground/40 mt-1">Everything looks good? Submit your application.</p>
                </div>

                {/* Brand Identity Card */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Brand Identity</p>
                    <button onClick={() => setStep(1)} className="text-[11px] text-primary font-black uppercase tracking-wider hover:text-primary/70 transition-colors">
                      Edit
                    </button>
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">{form.brandName}</p>
                    {form.tagline && <p className="text-xs text-foreground/40 italic mt-0.5">"{form.tagline}"</p>}
                    {form.description && <p className="text-xs text-foreground/50 mt-1.5 line-clamp-2">{form.description}</p>}
                    {form.websiteUrl && <p className="text-xs text-primary mt-1">{form.websiteUrl}</p>}
                  </div>
                  {form.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.categories.map((c) => (
                        <span key={c} className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {form.intendedUsage.length > 0 && (
                    <p className="text-[11px] text-foreground/40">
                      Usage: {form.intendedUsage.join(" · ")}
                    </p>
                  )}
                </div>

                {/* Contact Card */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Contact & Ownership</p>
                    <button onClick={() => setStep(2)} className="text-[11px] text-primary font-black uppercase tracking-wider hover:text-primary/70 transition-colors">
                      Edit
                    </button>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {form.contactPersonName}{" "}
                    <span className="text-foreground/40 font-normal">({form.contactRole})</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3 text-primary shrink-0" />
                    <p className="text-xs text-primary font-bold">{form.contactEmail}</p>
                  </div>
                  {form.phoneNumber && <p className="text-xs text-foreground/50">{form.phoneNumber}</p>}
                </div>

                {/* Legal Card */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Legal & Documents</p>
                    <button onClick={() => setStep(3)} className="text-[11px] text-primary font-black uppercase tracking-wider hover:text-primary/70 transition-colors">
                      Edit
                    </button>
                  </div>
                  {form.companyName && <p className="text-sm font-bold text-foreground">{form.companyName}</p>}
                  <p className="text-xs text-foreground/50 line-clamp-2">{form.platformUsageReason}</p>
                  {form.availableDocuments.length > 0 && (
                    <p className="text-[11px] text-foreground/40">
                      {form.availableDocuments.length} document type(s) available
                    </p>
                  )}
                  <div className="flex items-center gap-4 pt-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                      <Check className="w-3 h-3" /> Authorized
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                      <Check className="w-3 h-3" /> Accuracy confirmed
                    </span>
                  </div>
                </div>

                {/* Rewards Card */}
                {(form.expectedBudget || form.campaignFrequency || form.rewardApproach) && (
                  <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Rewards Intent</p>
                      <button onClick={() => setStep(4)} className="text-[11px] text-primary font-black uppercase tracking-wider hover:text-primary/70 transition-colors">
                        Edit
                      </button>
                    </div>
                    {form.expectedBudget && <p className="text-xs text-foreground/60">{form.expectedBudget}</p>}
                    {form.campaignFrequency && <p className="text-xs text-foreground/60">{form.campaignFrequency}</p>}
                    {form.rewardApproach && <p className="text-xs text-foreground/50 line-clamp-1">{form.rewardApproach}</p>}
                  </div>
                )}

                {/* Completeness Score */}
                <div className="bg-card/50 border border-border/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">Application Completeness</p>
                    <p className="text-sm font-display text-primary">{completeness}%</p>
                  </div>
                  <div className="h-2 bg-border/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-foreground/30">
                    {completeness >= 80
                      ? "Excellent! Your application is well-detailed."
                      : completeness >= 50
                      ? "Good start. Consider adding more details to improve your chances."
                      : "Add more information to strengthen your application."}
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-[16px] bg-primary text-black font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...</>
                  ) : (
                    <><FileText className="w-4 h-4" /> Submit Application</>
                  )}
                </button>

                <p className="text-center text-xs text-foreground/30 leading-relaxed">
                  By submitting you agree to our Terms of Service and Privacy Policy.
                  We'll review your application within 24–48 hours.
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 5 && (
          <div className="flex gap-2 sm:gap-3 mt-6 sm:mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-3.5 sm:py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3.5 sm:py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 5 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-foreground/30 hover:text-foreground/60 font-bold text-xs uppercase tracking-widest transition-colors mt-3 sm:mt-4"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
        )}

      </div>
    </div>
  );
}
