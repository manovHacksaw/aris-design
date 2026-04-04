"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Trophy, Zap, ImagePlus, ArrowRight } from "lucide-react";
import { useLoginModal } from "@/context/LoginModalContext";
import { useWallet } from "@/context/WalletContext";

const BENEFITS = [
  {
    icon: <Coins className="w-4 h-4 text-lime-400" />,
    title: "Earn real USDC",
    desc: "Get paid for every vote you cast. No likes, no points — actual money.",
  },
  {
    icon: <ImagePlus className="w-4 h-4 text-blue-400" />,
    title: "Submit to brand challenges",
    desc: "Compete in creative events from real brands with prize pools.",
  },
  {
    icon: <Trophy className="w-4 h-4 text-amber-400" />,
    title: "Climb the leaderboard",
    desc: "Level up, earn XP, and get recognised as a top creator.",
  },
  {
    icon: <Zap className="w-4 h-4 text-violet-400" />,
    title: "Build your portfolio",
    desc: "Your submissions, wins, and reputation live on-chain — forever.",
  },
];

export default function LoginModal() {
  const { isOpen, closeLoginModal } = useLoginModal();
  const { connect, isLoading } = useWallet();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLoginModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeLoginModal]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSignIn = async () => {
    closeLoginModal();
    await connect();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={closeLoginModal}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

              {/* Close */}
              <button
                onClick={closeLoginModal}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Top gradient bar */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-lime-400" />

              <div className="p-7 pt-8">
                {/* Brand mark */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
                      <path d="M12 4L4 18H20L12 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">Aris</p>
                    <p className="text-base font-black text-foreground leading-tight">Turn Attention Into Money</p>
                  </div>
                </div>

                {/* Headline */}
                <h2 className="font-display text-3xl uppercase leading-[0.92] tracking-tight text-foreground mb-1">
                  Join the<br />
                  <span className="text-primary">Creator Economy</span>
                </h2>
                <p className="text-sm text-foreground/50 mb-6">
                  Free to join. Start earning from day one.
                </p>

                {/* Benefits grid */}
                <div className="grid grid-cols-2 gap-3 mb-7">
                  {BENEFITS.map((b) => (
                    <div
                      key={b.title}
                      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {b.icon}
                        <span className="text-[11px] font-black text-foreground/80">{b.title}</span>
                      </div>
                      <p className="text-[10px] text-foreground/40 leading-relaxed">{b.desc}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-black rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_24px_rgba(59,130,246,0.25)]"
                >
                  {isLoading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      Sign in / Create account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-foreground/25 mt-4">
                  By signing in you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
