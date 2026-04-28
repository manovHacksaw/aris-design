"use client";

import { useState } from "react";
import { ChevronLeft, ArrowRight, Check } from "lucide-react";
import { useTheme } from "next-themes";

export interface BehaviorData {
  referralSource: string;
  themePreference: "light" | "dark" | "";
}

const REFERRAL_SOURCES = [
  "Twitter",
  "Google",
  "Instagram",
  "WhatsApp",
  "Telegram",
  "Friend",
  "Other",
] as const;

interface Props {
  initial: Partial<BehaviorData>;
  onNext: (data: BehaviorData) => void;
  onBack: () => void;
}

export default function StepBehavior({ initial, onNext, onBack }: Props) {
  const { setTheme, theme } = useTheme();
  const [referralSource, setReferralSource] = useState(initial.referralSource || "");
  const [themePreference, setThemePreference] = useState<BehaviorData["themePreference"]>(
    initial.themePreference || (theme === "light" || theme === "dark" ? theme : "")
  );

  const chooseTheme = (value: "light" | "dark") => {
    setThemePreference(value);
    setTheme(value);
  };

  const handleNext = () => {
    onNext({
      referralSource,
      themePreference,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 5 of 7</p>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">How Did You Hear About Us?</h1>
        <p className="text-xs sm:text-sm text-foreground/40">Choose your source and preferred mode.</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Source</label>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_SOURCES.map((source) => {
            const active = referralSource === source;
            return (
              <button
                key={source}
                onClick={() => setReferralSource(source)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "bg-card border-border/40 text-foreground/50 hover:border-border/60 hover:text-foreground/70"
                }`}
              >
                {active && <Check className="inline w-3 h-3 mr-1" />}
                {source}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">App Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => chooseTheme("light")}
            className={`px-4 py-3 rounded-[12px] border text-xs font-bold transition-all ${
              themePreference === "light"
                ? "bg-primary/10 border-primary/50 text-foreground"
                : "bg-card border-border/40 text-foreground/50 hover:border-border/60"
            }`}
          >
            Bright Mode
          </button>
          <button
            type="button"
            onClick={() => chooseTheme("dark")}
            className={`px-4 py-3 rounded-[12px] border text-xs font-bold transition-all ${
              themePreference === "dark"
                ? "bg-primary/10 border-primary/50 text-foreground"
                : "bg-card border-border/40 text-foreground/50 hover:border-border/60"
            }`}
          >
            Dark Mode
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-3 sm:px-5 sm:py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 sm:py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
