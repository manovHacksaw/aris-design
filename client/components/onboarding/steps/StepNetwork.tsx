"use client";

import { useState, useEffect } from "react";
import { Check, ChevronLeft, ArrowRight } from "lucide-react";
import { getBrandLeaderboard, getUserLeaderboard, type BrandLeaderboardEntry, type UserLeaderboardEntry } from "@/services/leaderboard.service";

export interface NetworkData {
  followedBrands: string[];
  followedCreators: string[];
}

interface Props {
  initial: Partial<NetworkData>;
  preferredCategories?: string[];
  onNext: (data: NetworkData) => void;
  onBack: () => void;
}

export default function StepNetwork({ initial, preferredCategories = [], onNext, onBack }: Props) {
  const [brands, setBrands] = useState<string[]>(initial.followedBrands || []);
  const [creators, setCreators] = useState<string[]>(initial.followedCreators || []);

  const [brandList, setBrandList] = useState<BrandLeaderboardEntry[]>([]);
  const [creatorList, setCreatorList] = useState<UserLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [brandsRes, creatorsRes] = await Promise.allSettled([
        getBrandLeaderboard("A"),
        getUserLeaderboard(1, 6, "W"),
      ]);

      if (brandsRes.status === "fulfilled") {
        let all = brandsRes.value.data ?? [];
        if (preferredCategories.length > 0) {
          const lower = preferredCategories.map(c => c.toLowerCase());
          const matched = all.filter(b =>
            b.categories?.some(c => lower.includes(c.toLowerCase()))
          );
          all = matched.length > 0 ? matched.slice(0, 6) : all.slice(0, 6);
        } else {
          all = all.slice(0, 6);
        }
        setBrandList(all);
      } else {
        console.warn("Brands fetch failed:", brandsRes.reason);
      }

      if (creatorsRes.status === "fulfilled") {
        setCreatorList(creatorsRes.value.data?.slice(0, 6) ?? []);
      } else {
        console.warn("Creators fetch failed:", creatorsRes.reason);
      }

      setLoading(false);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBrand = (id: string) =>
    setBrands(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCreator = (id: string) =>
    setCreators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleNext = () => onNext({ followedBrands: brands, followedCreators: creators });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 6 of 7</p>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">Follow & Connect</h1>
        <p className="text-xs sm:text-sm text-foreground/40">
          Seed your feed instantly. You can always change this later.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Brands skeleton */}
          <div className="space-y-2.5">
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] border border-border/40 bg-card animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded bg-white/10 w-3/4" />
                    <div className="h-2 rounded bg-white/5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Creators skeleton */}
          <div className="space-y-2.5">
            <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] border border-border/40 bg-card animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded bg-white/10 w-3/4" />
                    <div className="h-2 rounded bg-white/5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Brands */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                Brands
                {preferredCategories.length > 0 && (
                  <span className="ml-2 text-primary/60 normal-case font-medium">matched to your interests</span>
                )}
              </label>
              {brands.length > 0 && <span className="text-[11px] text-primary font-bold">{brands.length} followed</span>}
            </div>

            {brandList.length === 0 ? (
              <p className="text-sm text-foreground/30 py-4 text-center">No brands available yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {brandList.map(b => {
                  const active = brands.includes(b.id);
                  const logoUrl = b.avatar ?? null;
                  const category = b.categories?.[0] ?? "Brand";
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleBrand(b.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] border transition-all ${
                        active ? "bg-primary/10 border-primary/40" : "bg-card border-border/40 hover:border-border/60"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={b.name}
                            className="w-6 h-6 object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <span className="text-[10px] font-black text-black">{b.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-xs font-bold truncate ${active ? "text-foreground" : "text-foreground/70"}`}>{b.name}</p>
                        <p className="text-[10px] text-foreground/35 truncate">{category}</p>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Creators */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                Top Creators
                <span className="ml-2 text-primary/60 normal-case font-medium">this week</span>
              </label>
              {creators.length > 0 && <span className="text-[11px] text-primary font-bold">{creators.length} followed</span>}
            </div>

            {creatorList.length === 0 ? (
              <p className="text-sm text-foreground/30 py-4 text-center">No creators yet — check back soon.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {creatorList.map(c => {
                  const active = creators.includes(c.id);
                  const avatar = c.avatarUrl || c.avatar;
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCreator(c.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] border transition-all ${
                        active ? "bg-primary/10 border-primary/40" : "bg-card border-border/40 hover:border-border/60"
                      }`}
                    >
                      {avatar ? (
                        <img src={avatar} alt={c.displayName} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-black text-primary">{c.displayName?.[0] ?? "?"}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-xs font-bold truncate ${active ? "text-foreground" : "text-foreground/70"}`}>{c.displayName}</p>
                        <p className="text-[10px] text-foreground/35 truncate">Lv {c.level} · {c.xp.toLocaleString()} XP</p>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-2 sm:gap-3 pt-1">
        <button onClick={onBack} className="flex items-center gap-1 sm:gap-1.5 px-3 py-3 sm:px-5 sm:py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={() => onNext({ followedBrands: [], followedCreators: [] })}
          className="px-3 py-3 sm:px-5 sm:py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors"
        >
          Skip
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
