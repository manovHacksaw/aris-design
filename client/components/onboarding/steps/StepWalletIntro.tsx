"use client";

import { Wallet, Zap, Gift, ChevronLeft, ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

const CARDS = [
  {
    Icon: Gift,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    title: "How rewards work",
    desc: "Vote on campaigns, create content, and complete challenges to earn USDC directly to your wallet.",
  },
  {
    Icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    title: "XP & Streaks",
    desc: "Earn XP for every action. Log in daily to maintain streaks and unlock higher reward multipliers.",
  },
  {
    Icon: Wallet,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    title: "Your wallet is ready",
    desc: "A gasless smart account was automatically created for you. No seed phrase — secured by your login.",
  },
];

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function StepWalletIntro({ onNext, onBack }: Props) {
  const { address, eoaAddress } = useWallet();
  const [copied, setCopied] = useState(false);

  const displayAddr = address || eoaAddress;
  const shortAddr = displayAddr
    ? `${displayAddr.slice(0, 6)}…${displayAddr.slice(-4)}`
    : null;

  const copy = () => {
    if (!displayAddr) return;
    navigator.clipboard.writeText(displayAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 7 of 8</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Your Wallet</h1>
        <p className="text-sm text-foreground/40">
          Everything you need to know about earning on Aris.
        </p>
      </div>

      {/* Wallet address card */}
      {displayAddr && (
        <div className="flex items-center gap-3 p-4 rounded-[14px] bg-card border border-border/40">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider mb-0.5">Smart Account</p>
            <p className="text-sm font-mono font-bold text-foreground/80 truncate">{shortAddr}</p>
          </div>
          <button
            onClick={copy}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-foreground/40" />}
          </button>
        </div>
      )}

      {/* Info cards */}
      <div className="space-y-3">
        {CARDS.map(({ Icon, color, bg, border, title, desc }) => (
          <div key={title} className={`flex items-start gap-3 p-4 rounded-[14px] border ${border} ${bg}`}>
            <div className={`p-2 rounded-lg shrink-0 ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${color} mb-1`}>{title}</p>
              <p className="text-xs text-foreground/50 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1.5 px-5 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
        >
          Got it, continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
