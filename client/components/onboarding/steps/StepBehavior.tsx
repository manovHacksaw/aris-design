"use client";

import { useState } from "react";
import { ChevronLeft, ArrowRight, Check } from "lucide-react";

// Analytics-only step — answers are stored in DB but never shown back to user
export interface BehaviorData {
  adsSeenDaily: string;
  referralSource: string;
  joinMotivation: string[];
  socialPlatforms: string[];
  rewardPreference: string[];
  engagementStyle: string;
}

const ADS_DAILY = ["<5", "5–15", "15–30", "30+"];
const REFERRAL_SOURCES = ["Social media", "Friend/referral", "Search engine", "Brand partnership", "Event/conference", "Other"];
const MOTIVATIONS = ["Curiosity", "Earn money", "Brand fan", "Social interaction", "Experiment with Web3", "Content creation"];
const PLATFORMS = ["Instagram", "TikTok", "Twitter/X", "YouTube", "Reddit", "LinkedIn", "Other"];
const REWARD_TYPES = ["Cash payouts", "Public recognition", "XP & levels", "Perks & discounts", "Mixed"];
const ENGAGEMENT_STYLES = ["I create content", "I vote on content", "I watch/browse", "A bit of everything"];

interface Props {
  initial: Partial<BehaviorData>;
  onNext: (data: BehaviorData) => void;
  onBack: () => void;
}

function PillGroup({ label, options, value, onChange, multi = false }: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const toggle = (opt: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
    } else {
      onChange(value === opt ? "" : opt);
    }
  };
  const isActive = (opt: string) => multi ? (value as string[]).includes(opt) : value === opt;

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              isActive(opt)
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-card border-border/40 text-foreground/50 hover:border-border/60 hover:text-foreground/70"
            }`}
          >
            {isActive(opt) && <Check className="inline w-3 h-3 mr-1" />}
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StepBehavior({ initial, onNext, onBack }: Props) {
  const [data, setData] = useState<BehaviorData>({
    adsSeenDaily: initial.adsSeenDaily || "",
    referralSource: initial.referralSource || "",
    joinMotivation: initial.joinMotivation || [],
    socialPlatforms: initial.socialPlatforms || [],
    rewardPreference: initial.rewardPreference || [],
    engagementStyle: initial.engagementStyle || "",
  });

  const handleNext = () => {
    // All optional — skip is fine
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 5 of 8</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Help Us Improve</h1>
        <p className="text-sm text-foreground/40">
          A few quick questions to help us build a better experience. All answers are anonymous.
        </p>
      </div>

      <PillGroup
        label="How many ads do you see daily?"
        options={ADS_DAILY}
        value={data.adsSeenDaily}
        onChange={v => setData(d => ({ ...d, adsSeenDaily: v as string }))}
      />

      <PillGroup
        label="How did you hear about Aris?"
        options={REFERRAL_SOURCES}
        value={data.referralSource}
        onChange={v => setData(d => ({ ...d, referralSource: v as string }))}
      />

      <PillGroup
        label="Main motivation for joining"
        options={MOTIVATIONS}
        value={data.joinMotivation}
        onChange={v => setData(d => ({ ...d, joinMotivation: v as string[] }))}
        multi
      />

      <PillGroup
        label="Platforms you use most"
        options={PLATFORMS}
        value={data.socialPlatforms}
        onChange={v => setData(d => ({ ...d, socialPlatforms: v as string[] }))}
        multi
      />

      <PillGroup
        label="Preferred reward type"
        options={REWARD_TYPES}
        value={data.rewardPreference}
        onChange={v => setData(d => ({ ...d, rewardPreference: v as string[] }))}
        multi
      />

      <PillGroup
        label="How do you see yourself engaging?"
        options={ENGAGEMENT_STYLES}
        value={data.engagementStyle}
        onChange={v => setData(d => ({ ...d, engagementStyle: v as string }))}
      />

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
