"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Building2, ClipboardList, Activity,
  RefreshCw, Loader2, ChevronRight, TrendingUp,
  ShieldAlert, Wallet
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "./layout";
import { mockAdminService } from "@/services/mockAdminService";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface AdminStats {
  totalUsers: number;
  totalBrands: number;
  pendingApplications: number;
  activeSessions: number;
  totalEvents: number;
  moderationQueueCount: number;
  totalUSDCDistributed: number;
}

const STAT_CARDS = (s: AdminStats) => [
  {
    icon: Users,
    label: "Total Users",
    value: s.totalUsers,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    iconBg: "bg-blue-500/15",
  },
  {
    icon: Building2,
    label: "Active Brands",
    value: s.totalBrands,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    iconBg: "bg-purple-500/15",
  },
  {
    icon: ClipboardList,
    label: "Pending Applications",
    value: s.pendingApplications,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    iconBg: "bg-amber-500/15",
    urgent: s.pendingApplications > 0,
  },
  {
    icon: Activity,
    label: "Active Sessions",
    value: s.activeSessions,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    iconBg: "bg-green-500/15",
  },
  {
    icon: TrendingUp,
    label: "Total Events",
    value: s.totalEvents,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    iconBg: "bg-cyan-500/15",
  },
  {
    icon: ShieldAlert,
    label: "Moderation Queue",
    value: s.moderationQueueCount,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    iconBg: "bg-rose-500/15",
    urgent: s.moderationQueueCount > 0,
  },
  {
    icon: Wallet,
    label: "USDC Distributed",
    value: s.totalUSDCDistributed,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    iconBg: "bg-emerald-500/15",
  },
];

export default function AdminDashboardPage() {
  const { logout } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await mockAdminService.getPlatformStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="min-h-screen">

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-tight text-foreground leading-none">
            Admin <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-xs text-foreground/40 mt-1 font-medium">Platform overview</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/50 rounded-[12px] text-xs font-bold text-foreground/50 hover:text-foreground transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      <div className="px-8 py-8 space-y-7 max-w-4xl">

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400">{error}</div>
        )}

        {/* Stats Grid */}
        {loading && !stats ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {STAT_CARDS(stats).map(({ icon: Icon, label, value, color, bg, iconBg, urgent }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className={cn(
                  "bg-card border rounded-2xl p-5 space-y-4",
                  urgent ? "border-amber-500/30" : "border-border/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
                    <Icon className={cn("w-4.5 h-4.5", color)} />
                  </div>
                  {urgent && (
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest animate-pulse">
                      Review
                    </span>
                  )}
                </div>
                <div>
                  <p className={cn("text-4xl font-display leading-none", color)}>
                    {value?.toLocaleString() ?? "—"}
                  </p>
                  <p className="text-[11px] text-foreground/40 font-bold uppercase tracking-widest mt-1.5">
                    {label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-1">Quick Actions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                href: "/admin/applications?status=PENDING",
                icon: ClipboardList,
                label: "Review Pending Applications",
                sub: stats?.pendingApplications
                  ? `${stats.pendingApplications} awaiting decision`
                  : "Check for new submissions",
                accent: "amber",
              },
              {
                href: "/admin/applications",
                icon: Building2,
                label: "All Brand Applications",
                sub: "View, approve, or reject submissions",
                accent: "blue",
              },
              {
                href: "/admin/moderation",
                icon: ShieldAlert,
                label: "Moderation Queue",
                sub: stats?.moderationQueueCount
                  ? `${stats.moderationQueueCount} items need review`
                  : "Queue is empty",
                accent: "rose",
              },
              {
                href: "/admin/finance",
                icon: Wallet,
                label: "Finance & Payouts",
                sub: "Manage reward distribution",
                accent: "emerald",
              },
            ].map(({ href, icon: Icon, label, sub, accent }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-2xl border transition-all group",
                  accent === "amber"
                    ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                    : "bg-primary/5 border-primary/20 hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  accent === "amber" ? "bg-amber-500/10" : "bg-primary/10"
                )}>
                  <Icon className={cn("w-5 h-5", accent === "amber" ? "text-amber-400" : "text-primary")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-black transition-colors",
                    accent === "amber"
                      ? "text-foreground group-hover:text-amber-400"
                      : "text-foreground group-hover:text-primary"
                  )}>
                    {label}
                  </p>
                  <p className="text-xs text-foreground/40 mt-0.5">{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
