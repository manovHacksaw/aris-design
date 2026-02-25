"use client";

import { useState } from "react";
import { Sparkles, Trophy, Zap, ArrowRight, Loader2, Copy, Check, Share2, Gift } from "lucide-react";
import { toast } from "sonner";

const MOCK_EVENTS = [
  {
    id: "e1",
    brand: "Nike",
    title: "Air Max Redesign Challenge",
    category: "Fashion",
    reward: "$50",
    participants: "1.2k",
    img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=250&fit=crop",
  },
  {
    id: "e2",
    brand: "Spotify",
    title: "Cover Art Submission",
    category: "Music",
    reward: "$30",
    participants: "890",
    img: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=250&fit=crop",
  },
  {
    id: "e3",
    brand: "Red Bull",
    title: "Vote: Best Street Art",
    category: "Art",
    reward: "$20",
    participants: "2.1k",
    img: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=250&fit=crop",
  },
];

interface Props {
  displayName: string;
  referralCode?: string | null;
  isSaving: boolean;
  onComplete: (appliedReferralCode?: string) => void;
  onBack: () => void;
}

export default function StepComplete({ displayName, referralCode, isSaving, onComplete, onBack }: Props) {
  const firstName = displayName.split(" ")[0] || "there";
  const [copied, setCopied] = useState(false);
  const [incomingCode, setIncomingCode] = useState("");
  const [codeApplied, setCodeApplied] = useState(false);

  const handleCopy = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (!referralCode) return;
    const text = `Join me on Aris — the platform where your engagement earns real rewards! Use my code ${referralCode} to sign up and we both earn XP. 🚀`;
    if (navigator.share) {
      navigator.share({ title: "Join Aris", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Share text copied!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 8 of 8</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">You're all set,<br />{firstName}!</h1>
        <p className="text-sm text-foreground/40">Your profile is ready. Jump into your first action below.</p>
      </div>

      {/* Welcome XP badge */}
      <div className="flex items-center gap-4 p-4 rounded-[16px] bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
        <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">+10 XP Welcome Bonus</p>
          <p className="text-xs text-foreground/40">You've unlocked the Early Explorer badge</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            Earned
          </span>
        </div>
      </div>

      {/* Referral section */}
      {referralCode && (
        <div className="space-y-3 p-4 rounded-[16px] bg-card border border-border/50">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Refer Friends, Earn XP</p>
          </div>
          <p className="text-sm text-foreground/60 leading-relaxed">
            Share your code — you earn <span className="text-primary font-bold">+5 XP</span> for every friend who joins using it.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 bg-background border border-border/50 rounded-[12px] px-4 py-3">
              <span className="text-sm font-black text-foreground tracking-wider font-mono">{referralCode}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 rounded-[12px] bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              title="Copy code"
            >
              {copied
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <Copy className="w-4 h-4 text-primary" />
              }
            </button>
            <button
              onClick={handleShare}
              className="p-3 rounded-[12px] bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      )}

      {/* Suggested events */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Trending Near You</label>
        </div>
        <div className="space-y-2">
          {MOCK_EVENTS.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 p-3 rounded-[14px] bg-card border border-border/40 hover:border-border/70 transition-colors cursor-pointer group">
              <img
                src={ev.img}
                alt={ev.title}
                className="w-14 h-14 rounded-[10px] object-cover shrink-0 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{ev.brand} · {ev.category}</p>
                <p className="text-sm font-black text-foreground truncate">{ev.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] font-bold text-emerald-400">{ev.reward} reward</span>
                  <span className="text-[11px] text-foreground/30">{ev.participants} participants</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-foreground/50 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Incoming referral code */}
      <div className="space-y-2.5 p-4 rounded-[16px] bg-card border border-border/50">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-400" />
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Got a Referral Code?</p>
        </div>
        <p className="text-xs text-foreground/40">Enter a friend's code to credit them with +5 XP.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={incomingCode}
            onChange={e => setIncomingCode(e.target.value.toUpperCase())}
            disabled={codeApplied}
            placeholder="ARIS-XXXXXX-XXXX"
            className="flex-1 bg-background border border-border/50 rounded-[12px] px-4 py-3 text-sm font-mono font-bold placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40"
          />
          {codeApplied && (
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
              <Check className="w-3.5 h-3.5" /> Applied
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => onComplete(incomingCode.trim() || undefined)}
          disabled={isSaving}
          className="w-full py-4 rounded-[16px] bg-primary text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Sparkles className="w-4 h-4" /> Enter Aris</>
          }
        </button>
        <button onClick={onBack} className="w-full py-3 text-foreground/30 hover:text-foreground/50 text-xs font-bold uppercase tracking-widest transition-colors">
          Back
        </button>
      </div>
    </div>
  );
}
