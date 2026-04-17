"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Building2, Mail, Phone, Globe, AtSign,
  FileText, Loader2, CheckCircle2, XCircle, Clock, Copy,
  AlertTriangle, ShieldCheck, Check, Lock, Wallet,
  DollarSign, Calendar, Hash, Target, Megaphone,
  Users, Link2, Instagram, Twitter, Linkedin,
  ClipboardCheck, Info, Send, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "../../layout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

interface BrandApplication {
  id: string;
  brandName: string;
  companyName?: string;
  tagline?: string;
  description?: string;
  categories: string[];
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  contactEmail: string;
  contactPersonName: string;
  contactRole: string;
  phoneNumber?: string;
  telegramHandle?: string;
  gstNumber?: string;
  panNumber?: string;
  platformUsageReason?: string;
  agreementAuthorized: boolean;
  agreementAccurate: boolean;
  documents?: Record<string, any>;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  claimToken?: string;
  claimTokenExpiry?: string;
  brandId?: string;
}

// ─── Field Label Maps ─────────────────────────────────────────────────────────

const USAGE_LABELS: Record<string, string> = {
  campaigns: "Content Campaigns",
  surveys: "Surveys & Polls",
  competitions: "Content Competitions",
  community: "Community Building",
  ads: "Branded Advertising",
  creator_discovery: "Creator Discovery",
  market_research: "Market Research",
  product_launch: "Product Launch Events",
};

const DOC_LABELS: Record<string, string> = {
  business_reg: "Business Registration Certificate",
  gst_tax: "GST / Tax Documents",
  pan_id: "PAN / Legal ID",
  trademark: "Trademark / Brand Ownership Proof",
  incorporation: "Company Incorporation Documents",
  website_proof: "Brand Website Proof",
  campaign_portfolio: "Previous Campaign Portfolio",
};

const STATUS_CONFIG: Record<ApplicationStatus, {
  label: string; color: string; bg: string; borderColor: string; icon: any;
}> = {
  PENDING:   { label: "Pending Review", color: "text-amber-400",  bg: "bg-amber-500/10",  borderColor: "border-amber-500/30",  icon: Clock },
  APPROVED:  { label: "Approved",       color: "text-green-400",  bg: "bg-green-500/10",  borderColor: "border-green-500/30",  icon: CheckCircle2 },
  REJECTED:  { label: "Rejected",       color: "text-red-400",    bg: "bg-red-500/10",    borderColor: "border-red-500/30",    icon: XCircle },
  COMPLETED: { label: "Brand Claimed",  color: "text-primary",    bg: "bg-primary/10",    borderColor: "border-primary/30",    icon: ShieldCheck },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ step, label, icon: Icon }: { step: number; label: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-black text-primary">{step}</span>
      </div>
      <Icon className="w-4 h-4 text-foreground/30" />
      <p className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function FieldBlock({ label, value, mono, multiline, accent }: {
  label: string;
  value?: string | null;
  mono?: boolean;
  multiline?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">{label}</p>
      {value ? (
        <p className={cn(
          "leading-relaxed",
          multiline ? "text-sm text-foreground/70" : "text-sm text-foreground",
          mono && "font-mono text-xs bg-background/50 border border-border/30 rounded-[10px] px-3 py-2",
          accent && "text-primary font-bold",
        )}>
          {value}
        </p>
      ) : (
        <p className="text-sm text-foreground/20 italic">Not provided</p>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/20 -mx-6" />;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-foreground/50">{label}</p>
        <p className={cn("text-xs font-black", color)}>{score}%</p>
      </div>
      <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={cn("h-full rounded-full", color.replace("text-", "bg-"))}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { credentials } = useAdminAuth();

  const [app, setApp] = useState<BrandApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchApplication = async () => {
    if (!credentials || !params.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin/applications/${params.id}`, {
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (!res.ok) throw new Error("Application not found");
      const data = await res.json();
      setApp(data);
      if (data.claimToken) {
        setClaimLink(`${window.location.origin}/claim-brand?token=${data.claimToken}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplication(); }, [params.id, credentials]);

  const handleApprove = async () => {
    if (!credentials || !app) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/applications/${app.id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: adminNote }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Approval failed");
      toast.success("Application approved — claim token generated");
      setShowApproveModal(false);
      await fetchApplication();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!credentials || !app) return;
    if (!rejectReason.trim()) { toast.error("Rejection reason is required"); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/applications/${app.id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Rejection failed");
      toast.success("Application rejected");
      setShowRejectModal(false);
      await fetchApplication();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyClaimLink = () => {
    if (!claimLink) return;
    navigator.clipboard.writeText(claimLink);
    setLinkCopied(true);
    toast.success("Claim link copied to clipboard");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="p-12 text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-foreground/60">{error || "Application not found"}</p>
        <Link href="/admin/applications" className="text-primary text-sm font-bold hover:text-primary/70 transition-colors">
          ← Back to Applications
        </Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[app.status];
  const StatusIcon = sc.icon;
  const docs = app.documents ?? {};
  const availableDocs = (docs.availableDocuments as string[] ?? []);
  const intendedUsage = (docs.intendedUsage as string[] ?? []);

  // ── Score Computation ──────────────────────────────────────────────────────
  const identityScore = Math.round(([
    app.tagline, app.description, docs.whatBrandDoes,
    docs.brandGoals, intendedUsage.length > 0, docs.whyJoinAris, docs.engagementStrategy,
  ].filter(Boolean).length / 7) * 100);

  const contactScore = Math.round(([
    app.phoneNumber, app.telegramHandle,
    app.socialLinks?.instagram, app.socialLinks?.twitter, app.socialLinks?.linkedin,
  ].filter(Boolean).length / 5) * 100);

  const legalScore = Math.round(([
    app.companyName, app.gstNumber, app.panNumber,
    availableDocs.length > 0,
  ].filter(Boolean).length / 4) * 100);

  const rewardsScore = Math.round(([
    docs.expectedBudget, docs.campaignFrequency,
    docs.rewardApproach, docs.walletAddress,
  ].filter(Boolean).length / 4) * 100);

  const overallScore = Math.round(identityScore * 0.35 + contactScore * 0.15 + legalScore * 0.35 + rewardsScore * 0.15);

  const scoreColor = overallScore >= 70 ? "text-green-400" : overallScore >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen">

      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/30 px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin/applications"
              className="flex items-center gap-1.5 text-foreground/40 hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Back</span>
            </Link>
            <div className="w-px h-5 bg-border/40" />
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-display uppercase tracking-tight text-foreground leading-none truncate">
                  {app.brandName}
                </h1>
                {app.tagline && (
                  <p className="text-xs text-foreground/30 italic hidden md:block truncate">"{app.tagline}"</p>
                )}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0",
                  sc.bg, sc.borderColor, sc.color
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </div>
              </div>
            </div>
          </div>

          {/* Actions in top bar for PENDING */}
          {app.status === "PENDING" && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-black text-[11px] uppercase tracking-widest transition-all"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-green-500 text-white hover:bg-green-600 font-black text-[11px] uppercase tracking-widest transition-all shadow-md shadow-green-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex gap-0 min-h-[calc(100vh-65px)]">

        {/* ── Left: Full Application Data ── */}
        <div className="flex-1 min-w-0 px-8 py-7 space-y-0 divide-y divide-border/20">

          {/* Section 1: Brand Identity */}
          <div className="pb-8">
            <SectionHeader step={1} label="Brand Identity" icon={Building2} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <FieldBlock label="Brand Name" value={app.brandName} />
              <FieldBlock label="Tagline" value={app.tagline} />
              <div className="md:col-span-2">
                <FieldBlock label="Brand Description" value={app.description} multiline />
              </div>
              <div className="md:col-span-2">
                <FieldBlock label="What the Brand Does" value={docs.whatBrandDoes} multiline />
              </div>
              <FieldBlock label="Website URL" value={app.websiteUrl} accent />

              {/* Categories */}
              <div className="md:col-span-2 space-y-1">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Categories</p>
                {app.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {app.categories.map((c) => (
                      <span key={c} className="px-3 py-1.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full border border-primary/20">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/20 italic">Not provided</p>
                )}
              </div>

              <div className="md:col-span-2">
                <FieldBlock label="Brand Goals on Aris" value={docs.brandGoals} multiline />
              </div>

              {/* Intended Usage */}
              <div className="md:col-span-2 space-y-1">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Intended Usage</p>
                {intendedUsage.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intendedUsage.map((u) => (
                      <span key={u} className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 border border-border/30 text-foreground/60 text-[11px] font-bold rounded-full">
                        <Check className="w-3 h-3 text-primary" />
                        {USAGE_LABELS[u] ?? u}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/20 italic">Not provided</p>
                )}
              </div>

              <div className="md:col-span-2">
                <FieldBlock label="Why They Want to Join Aris" value={docs.whyJoinAris} multiline />
              </div>
              <div className="md:col-span-2">
                <FieldBlock label="Expected Engagement Strategy" value={docs.engagementStrategy} multiline />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Ownership */}
          <div className="py-8">
            <SectionHeader step={2} label="Contact & Ownership" icon={Users} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <FieldBlock label="Contact Person" value={app.contactPersonName} />
              <FieldBlock label="Role / Title" value={app.contactRole} />

              {/* Email — highlighted */}
              <div className="md:col-span-2 space-y-1">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest flex items-center gap-2">
                  Work Email
                  <span className="text-primary normal-case font-normal tracking-normal text-[10px]">· Claim link destination</span>
                </p>
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-[12px] px-4 py-3">
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm font-bold text-primary">{app.contactEmail}</p>
                </div>
              </div>

              <FieldBlock label="Phone Number" value={app.phoneNumber} />
              <FieldBlock label="Telegram Handle" value={app.telegramHandle ? `@${app.telegramHandle}` : null} />

              {/* Social Links */}
              <div className="md:col-span-2 space-y-2">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Social Links</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: "instagram", icon: Instagram, label: "Instagram", prefix: "instagram.com/" },
                    { key: "twitter", icon: Twitter, label: "Twitter / X", prefix: "x.com/" },
                    { key: "linkedin", icon: Linkedin, label: "LinkedIn", prefix: "linkedin.com/company/" },
                  ].map(({ key, icon: Icon, label, prefix }) => {
                    const val = app.socialLinks?.[key];
                    return (
                      <div key={key} className={cn(
                        "flex items-center gap-2.5 px-3.5 py-3 rounded-[12px] border",
                        val ? "bg-card border-border/40" : "bg-card/30 border-border/20"
                      )}>
                        <Icon className={cn("w-4 h-4 shrink-0", val ? "text-foreground/50" : "text-foreground/15")} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-foreground/30 font-bold">{label}</p>
                          <p className={cn("text-xs truncate", val ? "text-foreground/70" : "text-foreground/20 italic")}>
                            {val ? `${prefix}${val}` : "Not provided"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Legal & Documents */}
          <div className="py-8">
            <SectionHeader step={3} label="Legal & Documents" icon={FileText} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <FieldBlock label="Company / Legal Entity Name" value={app.companyName} />
              <div /> {/* spacer */}
              <FieldBlock label="GST Number" value={app.gstNumber} mono />
              <FieldBlock label="PAN Number" value={app.panNumber} mono />

              {/* Available Documents */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">
                    Available Verification Documents
                  </p>
                  <p className="text-[11px] font-bold text-foreground/30">
                    {availableDocs.length} / {Object.keys(DOC_LABELS).length} indicated
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(DOC_LABELS).map(([id, label]) => {
                    const has = availableDocs.includes(id);
                    return (
                      <div key={id} className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] border",
                        has ? "bg-green-500/5 border-green-500/20" : "bg-card/30 border-border/20"
                      )}>
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                          has ? "bg-green-500 border-green-500" : "border-border/30"
                        )}>
                          {has && <Check className="w-3 h-3 text-foreground" />}
                        </div>
                        <p className={cn("text-xs font-semibold", has ? "text-foreground/70" : "text-foreground/25")}>
                          {label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {availableDocs.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(availableDocs.length / Object.keys(DOC_LABELS).length) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full bg-green-500 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <FieldBlock label="Platform Usage Plans" value={app.platformUsageReason} multiline />
              </div>

              {/* Agreements */}
              <div className="md:col-span-2 space-y-2">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Agreements</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: app.agreementAuthorized, label: "Authorized representative" },
                    { key: app.agreementAccurate, label: "Information is accurate and true" },
                  ].map(({ key, label }) => (
                    <div key={label} className={cn(
                      "flex items-center gap-2.5 px-3.5 py-3 rounded-[12px] border",
                      key ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                    )}>
                      {key
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      <p className={cn("text-xs font-semibold", key ? "text-foreground/70" : "text-red-400")}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Wallet & Rewards Intent */}
          <div className="py-8">
            <SectionHeader step={4} label="Wallet & Rewards Intent" icon={Wallet} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <div className="md:col-span-2">
                <FieldBlock label="Wallet Address (Polygon)" value={docs.walletAddress} mono />
              </div>
              <FieldBlock label="Expected Monthly Reward Budget" value={docs.expectedBudget} />
              <FieldBlock label="Campaign Frequency Expectation" value={docs.campaignFrequency} />
              <div className="md:col-span-2">
                <FieldBlock label="Reward Distribution Approach" value={docs.rewardApproach} multiline />
              </div>
            </div>
          </div>

          {/* Rejection reason block */}
          {app.status === "REJECTED" && app.rejectionReason && (
            <div className="py-8">
              <SectionHeader step={0} label="Admin Decision" icon={ClipboardCheck} />
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-bold text-red-400">Rejection Reason</p>
                  {app.reviewedAt && (
                    <p className="text-xs text-foreground/30 ml-auto">
                      {new Date(app.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed pl-6">{app.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar: Meta + Scores + Actions ── */}
        <div className="w-72 shrink-0 border-l border-border/30 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Application Meta */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Application Info</p>
              <div className="space-y-2">
                {[
                  { icon: Hash, label: "ID", value: app.id.slice(0, 12) + "…" },
                  {
                    icon: Calendar, label: "Submitted",
                    value: new Date(app.submittedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    }),
                  },
                  app.reviewedAt ? {
                    icon: Clock, label: "Reviewed",
                    value: new Date(app.reviewedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    }),
                  } : null,
                ].filter(Boolean).map((item) => {
                  const { icon: Icon, label, value } = item!;
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-foreground/25 shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-foreground/35">{label}</p>
                        <p className="text-[11px] font-bold text-foreground/60 truncate">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border/20" />

            {/* Application Score Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Application Score</p>
                <p className={cn("text-2xl font-display", scoreColor)}>{overallScore}%</p>
              </div>
              <div className="space-y-3">
                <ScoreBar label="Brand Identity Depth" score={identityScore}
                  color={identityScore >= 70 ? "text-green-400" : identityScore >= 40 ? "text-amber-400" : "text-red-400"} />
                <ScoreBar label="Legal & Verification" score={legalScore}
                  color={legalScore >= 70 ? "text-green-400" : legalScore >= 40 ? "text-amber-400" : "text-red-400"} />
                <ScoreBar label="Contact Completeness" score={contactScore}
                  color={contactScore >= 70 ? "text-green-400" : contactScore >= 40 ? "text-amber-400" : "text-red-400"} />
                <ScoreBar label="Rewards Readiness" score={rewardsScore}
                  color={rewardsScore >= 70 ? "text-green-400" : rewardsScore >= 40 ? "text-amber-400" : "text-red-400"} />
              </div>
              <p className="text-[10px] text-foreground/25 leading-relaxed">
                Score reflects application completeness, not approval decision.
              </p>
            </div>

            <div className="h-px bg-border/20" />

            {/* Claim Link Section */}
            {(app.status === "APPROVED" || app.status === "COMPLETED") && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                  {app.status === "COMPLETED" ? "Claim Token Used" : "Activation Link"}
                </p>

                {claimLink ? (
                  <div className="space-y-2">
                    <div className="bg-background/60 border border-border/30 rounded-[12px] p-3 space-y-2">
                      <p className="text-[10px] font-mono text-foreground/50 break-all leading-relaxed">
                        {claimLink}
                      </p>
                      <button
                        onClick={copyClaimLink}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-2 rounded-[10px] font-black text-[11px] uppercase tracking-wider transition-all",
                          linkCopied
                            ? "bg-green-500/20 border border-green-500/30 text-green-400"
                            : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                        )}
                      >
                        {linkCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                      </button>
                    </div>
                    {app.claimTokenExpiry && (
                      <p className="text-[10px] text-foreground/30 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(app.claimTokenExpiry).toLocaleString()}
                      </p>
                    )}
                    <div className="bg-primary/5 border border-primary/15 rounded-[12px] p-3">
                      <p className="text-[11px] text-foreground/50 leading-relaxed">
                        Send to <span className="font-bold text-primary">{app.contactEmail}</span>. Single-use, enforced by Privy email identity.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/30 italic">Token not available</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {app.status === "PENDING" && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Decision</p>
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-green-500 text-foreground font-black text-xs uppercase tracking-widest hover:bg-green-600 active:scale-[0.98] transition-all shadow-md shadow-green-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Application
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-black text-xs uppercase tracking-widest transition-all"
                >
                  <XCircle className="w-4 h-4" /> Reject Application
                </button>
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={fetchApplication}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] border border-border/30 text-foreground/30 hover:text-foreground hover:border-border font-bold text-[11px] uppercase tracking-widest transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>

          </div>
        </div>
      </div>

      {/* ── Approve Modal ── */}
      <AnimatePresence>
        {showApproveModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border/50 rounded-2xl p-7 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-display uppercase tracking-tight text-foreground">Approve</h2>
                  <p className="text-sm text-foreground/40 mt-0.5">{app.brandName}</p>
                </div>
              </div>

              <div className="bg-green-500/5 border border-green-500/20 rounded-[14px] p-4 space-y-2">
                <p className="text-[11px] font-black text-green-400 uppercase tracking-widest">What this will do</p>
                {[
                  "Generate a single-use, time-limited claim token",
                  "Make the claim link available in the sidebar",
                  "Set application status to APPROVED",
                  "Brand can be claimed only via the registered email",
                ].map((pt) => (
                  <div key={pt} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground/60">{pt}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">
                  Internal Note <span className="normal-case font-normal text-foreground/20">optional</span>
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Any notes about this approval for the team…"
                  rows={3}
                  className="w-full bg-background border border-border/50 rounded-[14px] px-4 py-3 text-sm placeholder:text-foreground/20 focus:outline-none focus:border-green-500/40 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 py-3.5 rounded-[14px] border border-border/50 text-foreground/50 font-bold text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 rounded-[14px] bg-green-500 text-foreground font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Confirm Approval
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Reject Modal ── */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border/50 rounded-2xl p-7 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-display uppercase tracking-tight text-foreground">Reject</h2>
                  <p className="text-sm text-foreground/40 mt-0.5">{app.brandName}</p>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-[14px] p-4 flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Provide a clear reason. The applicant may use this to improve a future re-application.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">
                  Rejection Reason <span className="text-red-400/70">required</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this application is being rejected. Be specific and constructive…"
                  rows={5}
                  className="w-full bg-background border border-border/50 rounded-[14px] px-4 py-3 text-sm placeholder:text-foreground/20 focus:outline-none focus:border-red-500/40 transition-colors resize-none"
                />
                <p className="text-[11px] text-foreground/25 text-right">{rejectReason.length} chars</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3.5 rounded-[14px] border border-border/50 text-foreground/50 font-bold text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 py-3.5 rounded-[14px] bg-red-500 text-foreground font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
