"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock, CheckCircle2, Mail, LogOut, RefreshCw,
  ShieldCheck, ArrowRight, Loader2, Lock,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useUser } from "@/context/UserContext";

const TIMELINE = [
  {
    icon: CheckCircle2,
    label: "Application submitted",
    sublabel: "Your brand details have been received",
    state: "done" as const,
  },
  {
    icon: Clock,
    label: "Admin review in progress",
    sublabel: "Our team is reviewing your application (24–48 hrs)",
    state: "active" as const,
  },
  {
    icon: Mail,
    label: "Decision & activation email",
    sublabel: "You'll receive an approval or follow-up at your contact email",
    state: "pending" as const,
  },
  {
    icon: Lock,
    label: "Claim your brand",
    sublabel: "Use the single-use activation link to connect your wallet",
    state: "pending" as const,
  },
  {
    icon: ShieldCheck,
    label: "Brand dashboard unlocked",
    sublabel: "Create campaigns, set rewards, and grow your audience",
    state: "pending" as const,
  },
];

export default function BrandPendingPage() {
  const router = useRouter();
  const { disconnect } = useWallet();
  const { user, refreshUser } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // If brand gets approved and claims, redirect
  useEffect(() => {
    if (user?.ownedBrands?.[0]?.isActive === true) {
      router.replace("/brand/dashboard");
    }
  }, [user, router]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await disconnect();
    router.replace("/register");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5">

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-8 text-center space-y-4"
        >
          <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-4xl font-display uppercase tracking-tight text-foreground mb-2">
              Under <span className="text-amber-400">Review</span>
            </h1>
            <p className="text-sm text-foreground/50 leading-relaxed max-w-xs mx-auto">
              Your brand application has been submitted and is being reviewed by our team.
            </p>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-2xl p-6 space-y-1"
        >
          <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">
            What happens next
          </p>
          {TIMELINE.map(({ icon: Icon, label, sublabel, state }, i) => (
            <div key={label} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={[
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    state === "done" ? "bg-primary border-primary" :
                    state === "active" ? "border-amber-400 bg-amber-400/10" :
                    "border-border/30 bg-transparent",
                  ].join(" ")}>
                    {state === "done" ? (
                      <CheckCircle2 className="w-4 h-4 text-foreground" />
                    ) : state === "active" ? (
                      <Icon className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Icon className="w-4 h-4 text-foreground/20" />
                    )}
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className={[
                      "w-px h-6 mt-1 transition-colors",
                      state === "done" ? "bg-primary/40" : "bg-border/20",
                    ].join(" ")} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={[
                    "text-sm font-bold transition-colors",
                    state === "done" ? "text-foreground" :
                    state === "active" ? "text-foreground" :
                    "text-foreground/30",
                  ].join(" ")}>{label}</p>
                  <p className={[
                    "text-xs mt-0.5 leading-relaxed",
                    state === "pending" ? "text-foreground/20" : "text-foreground/40",
                  ].join(" ")}>{sublabel}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-card border border-border/50 text-foreground/60 hover:text-foreground hover:border-border font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Check Status
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>

        {/* Already have a link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-xs text-foreground/30">
            Already have an activation link?{" "}
            <a
              href="/claim-brand"
              className="text-primary font-bold hover:text-primary/70 transition-colors inline-flex items-center gap-1"
            >
              Activate your brand <ArrowRight className="w-3 h-3" />
            </a>
          </p>
        </motion.div>

      </div>
    </div>
  );
}
