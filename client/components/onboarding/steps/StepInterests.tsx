"use client";

import { useState } from "react";
import { Check, ChevronLeft, ArrowRight, Image, Video, Type, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Art", "Fashion", "Gaming", "Technology", "Photography",
  "Music", "Sports", "Film", "Food", "Travel",
  "Beauty", "Fitness", "Finance", "Education", "Automotive",
];

const CREATOR_TYPES = [
  { id: "creator",    label: "Content Creator", desc: "Videos, blogs, podcasts" },
  { id: "influencer", label: "Influencer",       desc: "Social media presence" },
  { id: "artist",     label: "Artist & Designer",desc: "Visual creative work" },
  { id: "gamer",      label: "Gamer",            desc: "Gaming & streaming" },
  { id: "lifestyle",  label: "Lifestyle",        desc: "Food, travel, wellness" },
  { id: "community",  label: "Community Member", desc: "Discover & engage" },
] as const;

const FORMATS = [
  { id: "image", label: "Image", Icon: Image },
  { id: "video", label: "Video", Icon: Video },
  { id: "text",  label: "Text",  Icon: Type },
  { id: "mixed", label: "Mixed", Icon: LayoutGrid },
] as const;

export interface InterestsData {
  preferredCategories: string[];
  creatorType: string;
  contentFormat: string;
}

interface Props {
  initial: Partial<InterestsData>;
  onNext: (data: InterestsData) => void;
  onBack: () => void;
}

export default function StepInterests({ initial, onNext, onBack }: Props) {
  const [categories, setCategories] = useState<string[]>(initial.preferredCategories || []);
  const [creatorType, setCreatorType] = useState(initial.creatorType || "");
  const [contentFormat, setContentFormat] = useState(initial.contentFormat || "");

  const toggleCat = (cat: string) =>
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );

  const handleNext = () => {
    if (categories.length < 3) { toast.error("Select at least 3 interests"); return; }
    onNext({ preferredCategories: categories, creatorType, contentFormat });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 4 of 8</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Your Interests</h1>
        <p className="text-sm text-foreground/40">
          Personalise your feed and unlock relevant campaigns.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Content Interests <span className="text-red-400/70 normal-case font-normal tracking-normal">min 3</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const active = categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                    : "bg-card text-foreground/50 border-border/40 hover:border-border/70 hover:text-foreground/70"
                }`}
              >
                {active && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                {cat}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(categories.length, 5) }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
            ))}
            {categories.length < 3 && Array.from({ length: 3 - categories.length }).map((_, i) => (
              <div key={`e${i}`} className="w-1.5 h-1.5 rounded-full bg-white/10" />
            ))}
          </div>
          <p className={`text-xs font-medium ${categories.length >= 3 ? "text-emerald-400" : "text-foreground/30"}`}>
            {categories.length} selected{categories.length < 3 && ` — ${3 - categories.length} more needed`}
          </p>
        </div>
      </div>

      {/* Creator type */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          I identify as <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CREATOR_TYPES.map(({ id, label, desc }) => {
            const active = creatorType === id;
            return (
              <button
                key={id}
                onClick={() => setCreatorType(active ? "" : id)}
                className={`flex items-start gap-2.5 p-3 rounded-[12px] border text-left transition-all ${
                  active ? "bg-primary/10 border-primary/40" : "bg-card border-border/40 hover:border-border/60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${active ? "text-foreground" : "text-foreground/60"}`}>{label}</p>
                  <p className="text-[10px] text-foreground/35 leading-tight">{desc}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content format */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Preferred format <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {FORMATS.map(({ id, label, Icon }) => {
            const active = contentFormat === id;
            return (
              <button
                key={id}
                onClick={() => setContentFormat(active ? "" : id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "bg-card border-border/40 text-foreground/50 hover:border-border/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1.5 px-5 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={handleNext}
          disabled={categories.length < 3}
          className="flex-1 py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
