"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search, RefreshCw, Loader2, Building2, Mail, Calendar,
  ChevronRight, Clock, CheckCircle2, XCircle, SlidersHorizontal,
  User, Tag, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/services/api";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

interface BrandApplication {
  id: string;
  brandName: string;
  companyName?: string;
  tagline?: string;
  description?: string;
  categories: string[];
  contactEmail: string;
  contactPersonName: string;
  contactRole: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, {
  label: string; color: string; bg: string; dot: string; icon: any;
}> = {
  PENDING:   { label: "Pending",  color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30",  dot: "bg-amber-400",  icon: Clock },
  APPROVED:  { label: "Approved", color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",  dot: "bg-green-400",  icon: CheckCircle2 },
  REJECTED:  { label: "Rejected", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30",      dot: "bg-red-400",    icon: XCircle },
  COMPLETED: { label: "Claimed",  color: "text-primary",    bg: "bg-primary/10 border-primary/30",      dot: "bg-primary",    icon: CheckCircle2 },
};

const TABS: { label: string; value: ApplicationStatus | "" }[] = [
  { label: "All",      value: "" },
  { label: "Pending",  value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Claimed",  value: "COMPLETED" },
];

// ─── Content ──────────────────────────────────────────────────────────────────

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [applications, setApplications] = useState<BrandApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ApplicationStatus | "">(
    (searchParams.get("status") as ApplicationStatus | null) ?? ""
  );

  const fetchApplications = async (status?: string) => {
    setLoading(true);
    setError("");
    try {
      const qs = status ? `?status=${status}&limit=100` : "?limit=100";
      const data = await apiRequest<any>(`/admin/applications${qs}`);
      setApplications(Array.isArray(data) ? data : (data.applications ?? []));
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) { router.replace("/explore"); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(activeTab || undefined); }, [activeTab]);

  const handleTabChange = (tab: ApplicationStatus | "") => {
    setActiveTab(tab);
    router.replace(tab ? `/admin/applications?status=${tab}` : "/admin/applications");
  };

  const filtered = applications.filter((app) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      app.brandName.toLowerCase().includes(q) ||
      app.contactEmail.toLowerCase().includes(q) ||
      app.contactPersonName?.toLowerCase().includes(q) ||
      app.companyName?.toLowerCase().includes(q)
    );
  });

  // Counts per status
  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen">

      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
            Brand <span className="text-primary">Applications</span>
          </h1>
          <p className="text-xs text-foreground/40 mt-1 font-medium">
            {loading ? "Loading…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
            {activeTab ? ` · ${STATUS_CONFIG[activeTab]?.label}` : " · All statuses"}
          </p>
        </div>
        <button
          onClick={() => fetchApplications(activeTab || undefined)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/50 rounded-[12px] text-xs font-bold text-foreground/50 hover:text-foreground transition-colors disabled:opacity-40 shrink-0"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      <div className="px-8 py-6 space-y-5 max-w-5xl">

        {/* Status Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            {(["PENDING", "APPROVED", "REJECTED", "COMPLETED"] as ApplicationStatus[]).map((s) => {
              const sc = STATUS_CONFIG[s];
              const Icon = sc.icon;
              return (
                <button
                  key={s}
                  onClick={() => handleTabChange(activeTab === s ? "" : s)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                    activeTab === s ? `${sc.bg} ${sc.color}` : "bg-card border-border/40 hover:border-border"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    activeTab === s ? "bg-current/10" : "bg-foreground/5"
                  )}>
                    <Icon className={cn("w-4 h-4", activeTab === s ? "" : "text-foreground/30")} />
                  </div>
                  <div>
                    <p className={cn("text-xl font-display leading-none", activeTab !== s && "text-foreground")}>
                      {counts[s] ?? 0}
                    </p>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                      activeTab === s ? "opacity-70" : "text-foreground/30"
                    )}>{sc.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Tabs + Search */}
        <div className="flex gap-3 items-center">
          <div className="flex gap-1 bg-card/50 border border-border/30 rounded-[14px] p-1">
            {TABS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleTabChange(value)}
                className={cn(
                  "px-4 py-2 rounded-[10px] text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                  activeTab === value
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground/40 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2 bg-card border border-border/50 rounded-[14px] px-4 py-2.5">
            <Search className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, email, company…"
              className="flex-1 bg-transparent text-sm placeholder:text-foreground/20 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-foreground/30 hover:text-foreground text-[11px] font-bold transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400">{error}</div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <SlidersHorizontal className="w-10 h-10 text-foreground/15 mx-auto" />
            <p className="text-foreground/40 font-bold text-sm">No applications found</p>
            {search && <p className="text-xs text-foreground/25">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((app, i) => {
              const sc = STATUS_CONFIG[app.status];
              const StatusIcon = sc.icon;
              const initials = app.brandName.slice(0, 2).toUpperCase();
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3) }}
                >
                  <Link
                    href={`/admin/applications/${app.id}`}
                    className="block bg-card border border-border/40 hover:border-border rounded-2xl p-5 transition-all group"
                  >
                    <div className="flex items-start gap-4">

                      {/* Brand Initial Avatar */}
                      <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0 font-display text-primary text-lg">
                        {initials}
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base font-black text-foreground truncate">{app.brandName}</p>
                              {app.companyName && (
                                <p className="text-xs text-foreground/35 truncate">({app.companyName})</p>
                              )}
                            </div>
                            {app.tagline && (
                              <p className="text-xs text-foreground/40 italic mt-0.5 truncate">"{app.tagline}"</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold",
                              sc.bg, sc.color
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                              {sc.label}
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        <div className="flex items-center gap-5 flex-wrap text-xs text-foreground/40">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 shrink-0" />
                            {app.contactPersonName}
                            {app.contactRole && <span className="text-foreground/25">· {app.contactRole}</span>}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 shrink-0" />
                            {app.contactEmail}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {new Date(app.submittedAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </span>
                        </div>

                        {app.categories.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="w-3 h-3 text-foreground/25 shrink-0" />
                            {app.categories.slice(0, 4).map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-foreground/5 border border-border/30 text-foreground/40 text-[10px] font-bold rounded-full">
                                {c}
                              </span>
                            ))}
                            {app.categories.length > 4 && (
                              <span className="text-[10px] text-foreground/25 font-bold">+{app.categories.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ApplicationsContent />
    </Suspense>
  );
}
