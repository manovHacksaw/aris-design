"use client";

import { useState, useEffect } from "react";
import { Sparkles, Map, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  displayName: string;
  isSaving: boolean;
  onComplete: (startTour: boolean) => void;
  onBack: () => void;
}

const TOUR_SLIDES = [
  {
    label: "Home Feed",
    caption: "Trending campaigns & live events",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Explore",
    caption: "Discover brands and creators",
    img: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Vote & Earn",
    caption: "Cast votes and collect USDC rewards",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Create",
    caption: "Submit content with AI assistance",
    img: "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Wallet",
    caption: "Track earnings and claim rewards",
    img: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Leaderboard",
    caption: "Compete and climb the ranks",
    img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Profile",
    caption: "Showcase your stats and badges",
    img: "https://images.unsplash.com/photo-1535223289429-462769a7af7a?q=80&w=800&auto=format&fit=crop",
  },
];

const INTERVAL_MS = 2500;

export default function StepComplete({ displayName, isSaving, onComplete, onBack }: Props) {
  const firstName = displayName.split(" ")[0] || "there";
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % TOUR_SLIDES.length);
        setVisible(true);
      }, 300);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = TOUR_SLIDES[current];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 7 of 7</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Welcome, {firstName}</h1>
        <p className="text-sm text-foreground/40">Your onboarding is complete. Start with a quick tour or skip for now.</p>
      </div>

      {/* XP bonus */}
      <div className="flex items-center gap-4 p-4 rounded-[16px] bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">+10 XP Welcome Bonus</p>
          <p className="text-xs text-foreground/40">You are ready to explore Aris.</p>
        </div>
      </div>

      {/* Cycling screenshot */}
      <div className="relative rounded-[16px] overflow-hidden border border-border/40 bg-card aspect-[16/9]">
        <img
          key={current}
          src={slide.img}
          alt={slide.label}
          className="w-full h-full object-cover"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
        {/* dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* caption */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
        >
          <p className="text-xs font-black text-primary uppercase tracking-widest">{slide.label}</p>
          <p className="text-sm font-medium text-white/80">{slide.caption}</p>
        </div>

        {/* dot indicators */}
        <div className="absolute top-3 right-3 flex gap-1">
          {TOUR_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setVisible(true); }, 300); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-4 bg-primary" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => onComplete(true)}
          disabled={isSaving}
          className="w-full py-4 rounded-[16px] bg-primary text-black font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Map className="w-4 h-4" /> Start 7-Step Tour</>
          }
        </button>
        <button
          onClick={() => onComplete(false)}
          disabled={isSaving}
          className="w-full py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <>Skip Tour <ArrowRight className="w-4 h-4" /></>
          }
        </button>
        <button onClick={onBack} className="w-full py-3 text-foreground/30 hover:text-foreground/50 text-xs font-bold uppercase tracking-widest transition-colors">
          Back
        </button>
      </div>
    </div>
  );
}
