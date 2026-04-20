"use client";

import { useState } from "react";
import { Check, ChevronLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const BRAND_CATEGORIES = [
  "Fashion",
  "Sports",
  "Technology",
  "Food & Beverage",
  "Beauty",
  "Gaming",
  "Entertainment",
  "Automotive",
  "Travel",
  "Finance",
];

const DOMAIN_CATEGORIES = [
  "Design",
  "Photography",
  "Video",
  "Writing",
  "Music",
  "Marketing",
  "Social Media",
  "Web3",
  "AI",
  "Education",
];

export interface InterestsData {
  preferredBrandCategories: string[];
  preferredDomains: string[];
}

interface Props {
  initial: Partial<InterestsData>;
  onNext: (data: InterestsData) => void;
  onBack: () => void;
}

export default function StepInterests({ initial, onNext, onBack }: Props) {
  const [brandCategories, setBrandCategories] = useState<string[]>(initial.preferredBrandCategories || []);
  const [domains, setDomains] = useState<string[]>(initial.preferredDomains || []);

  const toggleBrandCategory = (cat: string) =>
    setBrandCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  const toggleDomain = (domain: string) =>
    setDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );

  const handleNext = () => {
    if (brandCategories.length === 0) {
      toast.error("Select at least one brand category");
      return;
    }
    if (domains.length === 0) {
      toast.error("Select at least one domain");
      return;
    }
    onNext({ preferredBrandCategories: brandCategories, preferredDomains: domains });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 4 of 7</p>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">Brand & Domain Preferences</h1>
        <p className="text-xs sm:text-sm text-foreground/40">
          Choose what you want to see first in your feed.
        </p>
      </div>

      {/* Brand Categories */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Brand Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {BRAND_CATEGORIES.map(cat => {
            const active = brandCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleBrandCategory(cat)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-primary text-black border-primary shadow-sm shadow-primary/20"
                    : "bg-card text-foreground/50 border-border/40 hover:border-border/70 hover:text-foreground/70"
                }`}
              >
                {active && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                {cat}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-medium text-foreground/30 px-1">{brandCategories.length} selected</p>
      </div>

      {/* Domains */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Domain Preferences
        </label>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_CATEGORIES.map(domain => {
            const active = domains.includes(domain);
            return (
              <button
                key={domain}
                onClick={() => toggleDomain(domain)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-primary text-black border-primary shadow-sm shadow-primary/20"
                    : "bg-card text-foreground/50 border-border/40 hover:border-border/70 hover:text-foreground/70"
                }`}
              >
                {active && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                {domain}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-medium text-foreground/30 px-1">{domains.length} selected</p>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-3 sm:px-5 sm:py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={handleNext}
          disabled={brandCategories.length === 0 || domains.length === 0}
          className="flex-1 py-3 sm:py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
