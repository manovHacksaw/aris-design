"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, BarChart3, LogOut, Loader2, Lock, Eye, EyeOff,
  ShieldCheck, ChevronRight, Users, Building2, Ticket, ShieldAlert,
  Wallet, LineChart, Settings
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Context ──────────────────────────────────────────────────────────────────

const ADMIN_AUTH_KEY = "aris_admin_auth";

interface AdminAuthCtx {
  credentials: string | null;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthCtx>({ credentials: null, logout: () => { } });

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

// ─── Login Gate ───────────────────────────────────────────────────────────────

function AdminLoginGate({ onLogin }: { onLogin: (creds: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError("Enter both fields"); return; }
    setLoading(true);
    setError("");
    const encoded = btoa(`${username}:${password}`);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Basic ${encoded}` },
      });
      if (!res.ok) { setError("Invalid credentials"); return; }
      localStorage.setItem(ADMIN_AUTH_KEY, encoded);
      onLogin(encoded);
    } catch {
      setError("Cannot reach server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 relative bg-card/40 border-r border-border/30 flex-col items-center justify-center p-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-primary to-transparent" />
        <div className="relative text-center space-y-6 max-w-sm">
          <h1 className="text-7xl font-display uppercase tracking-tight leading-none">
            Aris<br /><span className="text-primary">Admin</span>
          </h1>
          <p className="text-foreground/40 text-sm leading-relaxed">
            Internal brand management portal. Review brand applications, approve or reject submissions, and issue claim tokens to verified brands.
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {["Applications", "Verification", "Claim Tokens", "Analytics"].map((t) => (
              <span key={t} className="px-3 py-1.5 bg-foreground/5 border border-border/30 rounded-full text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-7"
        >
          <div className="space-y-2">
            <div className="w-12 h-12 bg-primary/10 border-2 border-primary/30 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-4xl font-display uppercase tracking-tight">Sign In</h2>
            <p className="text-sm text-foreground/40">Admin access only.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="admin"
                autoComplete="username"
                className="w-full bg-card border border-border/50 rounded-[14px] px-4 py-3.5 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-card border border-border/50 rounded-[14px] px-4 py-3.5 pr-12 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-[12px] px-3.5 py-3"
                >
                  <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 rounded-[14px] bg-primary text-foreground font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign In <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>

          <p className="text-center text-[11px] text-foreground/20">
            Access restricted to Aris administrators only
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Admin Layout ─────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [credentials, setCredentials] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_AUTH_KEY);
    if (stored) setCredentials(stored);
    setChecking(false);
  }, []);

  const logout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    setCredentials(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!credentials) return <AdminLoginGate onLogin={setCredentials} />;

  return (
    <AdminAuthContext.Provider value={{ credentials, logout }}>
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
