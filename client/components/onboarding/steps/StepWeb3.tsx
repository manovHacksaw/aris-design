"use client";

import { useState } from "react";
import { Sprout, Zap, Layers, Code2, ChevronLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

const LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    tagline: "Brand new to crypto",
    desc: "You've never used a crypto wallet or Web3 app before.",
    Icon: Sprout,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  {
    id: "basic",
    label: "Basic",
    tagline: "Wallet + simple transactions",
    desc: "You've used MetaMask or similar, bought or sent crypto.",
    Icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    tagline: "DeFi / NFTs / multi-chain",
    desc: "You interact with DeFi protocols, trade NFTs, bridge between chains.",
    Icon: Layers,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
  },
  {
    id: "advanced",
    label: "Advanced",
    tagline: "Power user / developer",
    desc: "You build on-chain, read smart contract code, or manage multiple wallets.",
    Icon: Code2,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
] as const;

export type Web3Level = "beginner" | "basic" | "intermediate" | "advanced";

export interface Web3Data {
  web3Level: Web3Level;
}

interface Props {
  initial: Partial<Web3Data>;
  onNext: (data: Web3Data) => void;
  onBack: () => void;
}

export default function StepWeb3({ initial, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Web3Level | null>(
    (initial.web3Level as Web3Level) || null
  );

  const handleNext = () => {
    if (!selected) { toast.error("Please pick your level"); return; }
    onNext({ web3Level: selected });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 3 of 8</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Web3 Comfort Level</h1>
        <p className="text-sm text-foreground/40">
          This helps us tailor hints and features to your experience.
        </p>
      </div>

      <div className="space-y-2">
        {LEVELS.map(({ id, label, tagline, desc, Icon, color, bg, border }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`w-full flex items-start gap-4 px-4 py-4 rounded-[16px] border text-left transition-all ${
                active
                  ? `${bg} ${border} border`
                  : "bg-card border-border/40 hover:border-border/70"
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-colors ${active ? bg : "bg-white/5"}`}>
                <Icon className={`w-5 h-5 ${active ? color : "text-foreground/30"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-black ${active ? "text-foreground" : "text-foreground/70"}`}>{label}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${active ? `${color} ${bg} ${border}` : "text-foreground/30 bg-white/5 border-white/10"}`}>
                    {tagline}
                  </span>
                </div>
                <p className="text-xs text-foreground/40 leading-relaxed">{desc}</p>
              </div>
              {active && <Check className={`w-4 h-4 ${color} shrink-0 mt-1`} />}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1.5 px-5 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
