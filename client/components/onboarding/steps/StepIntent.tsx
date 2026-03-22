"use client";

import { useState } from "react";
import {
  Vote, PenTool, Blocks, Compass, ChevronLeft, ArrowRight, Check,
} from "lucide-react";
import { toast } from "sonner";

const GOALS = [
  { id: "voter", label: "Voter", desc: "Vote on submissions and shape rankings", Icon: Vote },
  { id: "creator", label: "Creator", desc: "Create and submit content to campaigns", Icon: PenTool },
  { id: "web3_enthusiast", label: "Web3 Enthusiast", desc: "Explore on-chain rewards and wallet features", Icon: Blocks },
  { id: "explorer", label: "Explorer", desc: "Discover brands, domains, and creators", Icon: Compass },
] as const;

export interface IntentData {
  intentGoals: string[];
}

interface Props {
  initial: IntentData;
  onNext: (data: IntentData) => void;
  onBack: () => void;
}

export default function StepIntent({ initial, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string[]>(initial.intentGoals || []);

  const toggle = (id: string) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );

  const handleNext = () => {
    if (selected.length === 0) { toast.error("Pick at least one goal"); return; }
    onNext({ intentGoals: selected });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 3 of 7</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">What Is Your Interest?</h1>
        <p className="text-sm text-foreground/40">
          Pick one or more options so we can tailor your onboarding.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {GOALS.map(({ id, label, desc, Icon }) => {
          const active = selected.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border text-left transition-all ${
                active
                  ? "bg-primary/10 border-primary/50"
                  : "bg-card border-border/40 hover:border-border/70"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${active ? "bg-primary/20" : "bg-white/5"}`}>
                <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-foreground/40"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${active ? "text-foreground" : "text-foreground/60"}`}>{label}</p>
                <p className="text-[11px] text-foreground/35 leading-tight">{desc}</p>
              </div>
              {active && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-foreground/30 text-center">
        {selected.length === 0 ? "Select at least one" : `${selected.length} selected`}
      </p>

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
