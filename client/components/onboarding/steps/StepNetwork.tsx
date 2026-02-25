"use client";

import { useState } from "react";
import { Check, ChevronLeft, ArrowRight } from "lucide-react";

const MOCK_BRANDS = [
  { id: "nike",    name: "Nike",        category: "Sports",       avatar: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" },
  { id: "spotify", name: "Spotify",     category: "Music",        avatar: "https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg" },
  { id: "netflix", name: "Netflix",     category: "Entertainment",avatar: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" },
  { id: "redbull", name: "Red Bull",    category: "Sports",       avatar: "https://upload.wikimedia.org/wikipedia/en/4/49/Red_Bull_Logo.svg" },
  { id: "apple",   name: "Apple",       category: "Technology",   avatar: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { id: "gucci",   name: "Gucci",       category: "Fashion",      avatar: "https://upload.wikimedia.org/wikipedia/commons/5/57/Gucci_logo.svg" },
];

const MOCK_CREATORS = [
  { id: "c1", name: "Maya Chen",     handle: "@mayavisuals",  category: "Photography",  avatar: "https://i.pravatar.cc/80?img=1" },
  { id: "c2", name: "Kai Studios",   handle: "@kaistudios",   category: "Art & Design", avatar: "https://i.pravatar.cc/80?img=2" },
  { id: "c3", name: "Alex Nova",     handle: "@alexnova",     category: "Gaming",       avatar: "https://i.pravatar.cc/80?img=3" },
  { id: "c4", name: "Sofia Ray",     handle: "@sofiaray",     category: "Lifestyle",    avatar: "https://i.pravatar.cc/80?img=4" },
  { id: "c5", name: "Jamal Beats",   handle: "@jamalbeats",   category: "Music",        avatar: "https://i.pravatar.cc/80?img=5" },
  { id: "c6", name: "Luna Creates",  handle: "@lunacreates",  category: "Fashion",      avatar: "https://i.pravatar.cc/80?img=6" },
];

export interface NetworkData {
  followedBrands: string[];
  followedCreators: string[];
}

interface Props {
  initial: Partial<NetworkData>;
  onNext: (data: NetworkData) => void;
  onBack: () => void;
}

export default function StepNetwork({ initial, onNext, onBack }: Props) {
  const [brands, setBrands] = useState<string[]>(initial.followedBrands || []);
  const [creators, setCreators] = useState<string[]>(initial.followedCreators || []);

  const toggleBrand = (id: string) =>
    setBrands(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCreator = (id: string) =>
    setCreators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleNext = () => onNext({ followedBrands: brands, followedCreators: creators });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 6 of 8</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Follow & Connect</h1>
        <p className="text-sm text-foreground/40">
          Seed your feed instantly. You can always change this later.
        </p>
      </div>

      {/* Brands */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Brands</label>
          {brands.length > 0 && <span className="text-[11px] text-primary font-bold">{brands.length} followed</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOCK_BRANDS.map(b => {
            const active = brands.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBrand(b.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] border transition-all ${
                  active ? "bg-primary/10 border-primary/40" : "bg-card border-border/40 hover:border-border/60"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={b.avatar} alt={b.name} className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-xs font-bold truncate ${active ? "text-foreground" : "text-foreground/70"}`}>{b.name}</p>
                  <p className="text-[10px] text-foreground/35 truncate">{b.category}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Creators */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Creators</label>
          {creators.length > 0 && <span className="text-[11px] text-primary font-bold">{creators.length} followed</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOCK_CREATORS.map(c => {
            const active = creators.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCreator(c.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] border transition-all ${
                  active ? "bg-primary/10 border-primary/40" : "bg-card border-border/40 hover:border-border/60"
                }`}
              >
                <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-xs font-bold truncate ${active ? "text-foreground" : "text-foreground/70"}`}>{c.name}</p>
                  <p className="text-[10px] text-foreground/35 truncate">{c.category}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
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
          onClick={() => onNext({ followedBrands: [], followedCreators: [] })}
          className="px-5 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors"
        >
          Skip
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
