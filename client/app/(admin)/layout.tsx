"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, BarChart3, LogOut, Loader2,
  ShieldCheck, ChevronRight, Users, Building2, Ticket, ShieldAlert,
  Wallet, LineChart, Settings
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePrivy } from "@privy-io/react-auth";
import { ApiError } from "@/services/api";

// ─── Context ──────────────────────────────────────────────────────────────────

interface AdminAuthCtx {
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthCtx>({ logout: () => {} });

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { href: "/admin", icon: BarChart3, label: "Dashboard", desc: "Platform stats" },
  { href: "/admin/users", icon: Users, label: "Users", desc: "Manage accounts" },
  { href: "/admin/brands", icon: Building2, label: "Brands", desc: "Review & manage" },
  { href: "/admin/events", icon: Ticket, label: "Events", desc: "Campaigns & challenges" },
  { href: "/admin/moderation", icon: ShieldAlert, label: "Moderation", desc: "Content & reports" },
  { href: "/admin/finance", icon: Wallet, label: "Finance", desc: "Rewards & payouts" },
  { href: "/admin/analytics", icon: LineChart, label: "Analytics", desc: "Platform insights" },
  { href: "/admin/settings", icon: Settings, label: "Settings", desc: "Platform configs" },
];

// ─── Admin Layout ─────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      router.replace("/explore");
      return;
    }

    // Get token directly from Privy — bypasses the UserContext token getter
    // which may not be initialised yet when this layout first renders.
    getAccessToken().then(async (token) => {
      if (!token) { router.replace("/explore"); return; }
      try {
        const res = await fetch(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { router.replace("/explore"); return; }
        setAllowed(true);
        setChecking(false);
      } catch {
        router.replace("/explore");
      }
    });
  }, [ready, authenticated]);

  const logout = async () => {
    await privyLogout();
    router.replace("/explore");
  };

  if (!ready || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <AdminAuthContext.Provider value={{ logout }}>
      <div className="min-h-screen bg-background text-foreground flex">

        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-border/30 flex flex-col sticky top-0 h-screen">
          {/* Brand */}
          <div className="px-5 py-6 border-b border-border/30">
            <p className="text-2xl font-display uppercase tracking-widest text-foreground leading-none">
              Aris
            </p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Admin Panel</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 pt-4">
            {NAV.map(({ href, icon: Icon, label, desc }) => {
              const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-[14px] transition-all group",
                    active
                      ? "bg-primary/10 border border-primary/20 text-primary"
                      : "text-foreground/40 hover:text-foreground hover:bg-card border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    active ? "bg-primary/20" : "bg-foreground/5 group-hover:bg-foreground/10"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest truncate">{label}</p>
                    <p className={cn("text-[10px] truncate mt-0.5", active ? "text-primary/60" : "text-foreground/25")}>{desc}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-border/30">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] text-foreground/30 hover:text-red-400 hover:bg-red-500/5 transition-all group border border-transparent"
            >
              <div className="w-8 h-8 rounded-xl bg-foreground/5 group-hover:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">Sign Out</p>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </AdminAuthContext.Provider>
  );
}
