"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Trophy, Users, Flame, ArrowRight, ThumbsUp, Palette, Camera,
  Clapperboard, Music, Shirt, Laptop, Gamepad, Search, Loader2, UserX,
  UserPlus, UserMinus, UserCheck,
} from "lucide-react";
import { searchUsers, followUser, unfollowUser } from "@/services/user.service";
import { getFeaturedBrands } from "@/services/search.service";
import { getEvents } from "@/services/event.service";
import { useUser } from "@/context/UserContext";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

const categories = [
  { label: "All", icon: Flame },
  { label: "Art & Design", icon: Palette },
  { label: "Photography", icon: Camera },
  { label: "Video", icon: Clapperboard },
  { label: "Music", icon: Music },
  { label: "Fashion", icon: Shirt },
  { label: "Tech", icon: Laptop },
  { label: "Gaming", icon: Gamepad },
];

type FeaturedChallenge = { id: string; brand: string; title: string; reward: string; entries: number; image: string; tag: string };
type FeaturedBrand = { id: string; name: string; handle: string; followers: string; avatar: string | null; campaigns: number };

const exploreGrid = [
  { id: 1, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYiG-zIhRn_VJ8cj1EL2PwG6YhycgoqKoayLqHvOciU27W6ymsq3dAES2LeCuiYkMC8M0saTD50kGdcOZUXXOET8UNKfxoHKPGqvYUjJ_rM2C5D9MwiPp9i6BXFAlHr34VGtAB6j_nlXnmCLEM_EcQ8inYkiAVQXsLv93k_0vvBbwEVjXn-YDBki0M44ogo_9PpGDrfAZ0eDWVQqenqgTTPHg043QFcZOUPPS3qkEef6k80vOQI_GZNeBTeht1HsvUGDOmy_ZzGOSk", votes: 1200, user: "@david_art", category: "Art & Design" },
  { id: 2, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBhMKldK8ut-GonyZ8kV-6qVEeafBOLVHaRRDUUgDJdulQr1t4_KWnmsZzVDdsNnHNO3tbwHfPGxDRfgSFU3X1JnD56bMgJw_f_mq2zkdiKXg2wt5mMeus-4dxs7Br6mAFeI2jwUoXd3ZZqL5ouc-V6GmLsUYRDzxg4EUWiwvJcMnn2sHjfwMt7ftzaUOnQ_yzsFgox-jfDLfWmpZLLulk_NunmOHnSFh6tQgCgEH3ejbFqKJN_6dmC9VBlCf9fUWtoDdQv0laOCpfM", votes: 856, user: "@moto_mike", category: "Music" },
  { id: 3, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIQc4XTLhvfd8OoVZm5ddVU-PaVsNsHSukuY_3HcJg84l2RK-YhkoY_dU07xPZQIDLeJ8XJbIxHi54V_3BJ3_1LjsdojT89HtQb6R0aG2LP9dyxc4FdlSGc0uqxty-qY_FIEkzpFqGtlx_uDLUElN7z_BD25-PJPi9t2Fy6YDD2tDS5mqRk-1FMjJWQWYKlOUrfiW10qM_XcnTjrbXIr5-NPjtaTxQoTrK2xB0aK86SZCCMXvqTV31iUz_9ytY7e_MQ65D-orXxR_W", votes: 2100, user: "@chef_jen", category: "Art & Design" },
  { id: 4, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3n6P0VAMdsJsdnJJc521hdALiqRySabaOBYBM2_vy7XtURi37q-rxU_aIFUasQjKfgpRBCyzl4C9vMSqy_pq9pP84PySV55piDFPn6DpLhgnPD-mRBT5InUrEmaYfKttw9U-41BRrxyKH1f5O4nVxoaIzB6Cb5trB_GLIylsVkkJ47DFZBwx54MlWMHuk37x5G_4lBsu7wNVLk4vXL8gwXCqKZ1ezieJDjc2XWhf_IdcHZDRcHobi7qIi2GtRoSa_f80QjD5B5Mbb", votes: 342, user: "@adventure_tom", category: "Photography" },
  { id: 5, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_wXTlpT_fBi2H4Yr0X1aI49tzxmkAwYIdidnbBQO3MPGM4_jjB9D1_TiInVHUSxrOVSKIAx2fpaRuGibiSwZNaY24dpjrlyaXaRHyXfzTv9VcUy1GqLQJ5IdyoKEjRXQy7TUUqbXe2V4DfGnOTomuAMF2ox6Lg4_mAyQMmcKRiNITqfrHGIboZNY9sRZ5LnOmiwqt7BMIW2UPqtD8bS_S6HPeEcOsi2InbVbPYw1E6amb2mRnNndD93oseMdTVLOO8eH6DelReWNH", votes: 980, user: "@byte_runner", category: "Tech" },
  { id: 6, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3AGais-gwxMRoyDzXwF7j1yp-ppTPDvKQpSh9_z1RrlG0-uy2iDCln-qkMhPxvna7M4HIAu1iS-VpZ6rFu3V90m_5Wh2kkd3FE3NN3t8Jt5XDbsdrUPk7DEKfDm0wDQEop2PqrLdxDUgEVc2jTGgFu1fDPPGlVUP9gbP6xCJfcf_t8IU9OJpdZopHXOPkK20XQG_Mb05AEEI3IRbNeupHSp41uTo_gbmehfqR98-GmDkILfle7be5DiA4dIX20yqjsKSsLq-La0U0", votes: 1540, user: "@grid_lock", category: "Art & Design" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchedUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  xp: number;
  level: number;
  _count: { followers: number };
};

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Explore() {
  const { user: currentUser } = useUser();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredChallenges, setFeaturedChallenges] = useState<FeaturedChallenge[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<FeaturedBrand[]>([]);

  useEffect(() => {
    getEvents({ limit: 6 }).then((res) => {
      const mapped: FeaturedChallenge[] = (res.events || []).map((ev) => ({
        id: ev.id,
        brand: ev.brand?.name || "Unknown",
        title: ev.title,
        reward: ev.leaderboardPool ? `$${ev.leaderboardPool.toLocaleString()}` : "TBD",
        entries: ev._count?.submissions ?? ev.eventAnalytics?.totalSubmissions ?? 0,
        image: ev.imageCid ? `${PINATA_GW}/${ev.imageCid}` : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
        tag: ev.status === "voting" ? "VOTING" : ev.status === "posting" ? "LIVE" : "FEATURED",
      }));
      setFeaturedChallenges(mapped);
    }).catch(() => {});

    getFeaturedBrands(8).then((res) => {
      const mapped: FeaturedBrand[] = (res.data || []).map((b) => ({
        id: b.id,
        name: b.name,
        handle: `@${b.name.toLowerCase().replace(/\s+/g, "")}`,
        followers: b.participants > 1000 ? `${(b.participants / 1000).toFixed(1)}k` : String(b.participants),
        avatar: b.avatar,
        campaigns: b.artMinted,
      }));
      setFeaturedBrands(mapped);
    }).catch(() => {});
  }, []);

  // Real user search state
  const [userResults, setUserResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow state: set of IDs the current user is following, and loading
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

  const handleFollowToggle = useCallback(async (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || followLoadingId) return;
    setFollowLoadingId(userId);
    const wasFollowing = followingSet.has(userId);
    // Optimistic update
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(userId); else next.add(userId);
      return next;
    });
    try {
      if (wasFollowing) await unfollowUser(userId);
      else await followUser(userId);
    } catch {
      // Revert
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(userId); else next.delete(userId);
        return next;
      });
    } finally {
      setFollowLoadingId(null);
    }
  }, [currentUser, followingSet, followLoadingId]);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setUserResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchUsers(q.trim());
      setUserResults(results);
    } catch {
      setUserResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, runSearch]);

  const isSearchActive = searchQuery.trim().length >= 2;

  // Filtered static data (only used when not in search mode)
  const filteredChallenges = isSearchActive
    ? featuredChallenges.filter(ch =>
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    : featuredChallenges;

  const filteredBrands = isSearchActive
    ? featuredBrands.filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.handle.toLowerCase().includes(searchQuery.toLowerCase()))
    : featuredBrands;

  const filteredGrid = exploreGrid.filter(item =>
    (activeCategory === "All" || item.category === activeCategory) &&
    (!isSearchActive || item.user.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <SidebarLayout>
        <div className="space-y-10 sm:space-y-14 lg:space-y-16 pb-28 md:pb-24">

          {/* Header */}
          <div className="mb-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display text-foreground tracking-tight mb-3">Discover</h1>
            <p className="text-sm sm:text-base text-foreground/50 leading-relaxed">Explore challenges, creators, and the best opportunities</p>
          </div>

          {/* Search Bar */}
          <div className="w-full bg-card rounded-2xl border border-border/60 shadow-card">
            <div className="w-full flex items-center px-5 py-4 gap-3">
              {isSearching
                ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                : <Search className="w-5 h-5 text-foreground/30 shrink-0" />
              }
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events, brands, or creators..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-foreground/30 text-sm md:text-base font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setUserResults([]); setHasSearched(false); }}
                  className="text-foreground/40 hover:text-foreground transition-colors text-xs font-semibold bg-secondary py-1.5 px-3 rounded-full"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Chips */}
          <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategory(cat.label)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                      isActive
                        ? "bg-primary text-white border-primary shadow-soft"
                        : "bg-card text-foreground/60 border-border hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-foreground/40")} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
          </div>

          {/* ── Real User Search Results ── */}
          {isSearchActive && (
            <section>
              <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
                <h2 className="text-xl font-black text-foreground uppercase tracking-wider flex items-center gap-3">
                  People
                  {isSearching
                    ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    : hasSearched && <span className="text-sm font-bold text-foreground/30 normal-case tracking-normal">({userResults.length} found)</span>
                  }
                </h2>
              </div>

              {/* Loading skeleton */}
              {isSearching && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 flex flex-col items-center gap-3 animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-secondary" />
                      <div className="h-3 w-24 bg-secondary rounded-full" />
                      <div className="h-2.5 w-16 bg-secondary rounded-full" />
                      <div className="h-8 w-full bg-secondary rounded-xl mt-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {!isSearching && hasSearched && userResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <UserX className="w-10 h-10 text-foreground/15" />
                  <p className="text-sm font-bold text-foreground/40">No users found for "{searchQuery}"</p>
                  <p className="text-xs text-foreground/25">Try a different name or username</p>
                </div>
              )}

              {/* Results grid */}
              {!isSearching && userResults.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {userResults.map((u, i) => {
                    const handle = u.username ? `@${u.username}` : "—";
                    const name = u.displayName || u.username || "Unknown";
                    const href = u.username ? `/profile/${u.username}` : "#";
                    const isSelf = currentUser?.id === u.id;
                    const isFollowed = followingSet.has(u.id);
                    const isLoadingThis = followLoadingId === u.id;
                    return (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex flex-col items-center bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl p-5 text-center hover:bg-card hover:border-primary/40 hover:shadow-xl transition-all"
                      >
                        <Link href={href} className="flex flex-col items-center w-full">
                          {/* Avatar */}
                          <div className="relative w-16 h-16 mb-3">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={name} className="w-full h-full rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center group-hover:border-primary transition-colors">
                                <span className="text-primary text-xl font-black uppercase">{name.charAt(0)}</span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-card">
                              {u.level}
                            </div>
                          </div>

                          <p className="text-sm font-black text-foreground truncate w-full">{name}</p>
                          <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-3 truncate w-full">{handle}</p>

                          {u.bio && (
                            <p className="text-[11px] text-foreground/40 line-clamp-2 mb-3 leading-relaxed">{u.bio}</p>
                          )}

                          <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest mb-4 w-full">
                            <div className="flex flex-col gap-0.5 items-center text-foreground/30">
                              <span>Followers</span>
                              <span className="text-foreground text-xs">{formatFollowers(u._count.followers)}</span>
                            </div>
                            <div className="w-px h-6 bg-border/50" />
                            <div className="flex flex-col gap-0.5 items-center text-foreground/30">
                              <span>XP</span>
                              <span className="text-primary text-xs">{u.xp.toLocaleString()}</span>
                            </div>
                          </div>
                        </Link>

                        {/* Follow / View Profile buttons */}
                        {isSelf ? (
                          <Link href={href} className="w-full py-2 rounded-xl bg-secondary/80 group-hover:bg-foreground group-hover:text-background text-[10px] font-black uppercase tracking-[0.15em] transition-all text-center">
                            Your Profile
                          </Link>
                        ) : currentUser ? (
                          <div className="flex gap-2 w-full">
                            <Link href={href} className="flex-1 py-2 rounded-xl bg-secondary/80 group-hover:bg-secondary text-[10px] font-black uppercase tracking-[0.1em] transition-all text-center text-foreground/60">
                              View
                            </Link>
                            <button
                              onClick={(e) => handleFollowToggle(u.id, e)}
                              disabled={isLoadingThis}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all disabled:opacity-50",
                                isFollowed
                                  ? "bg-secondary border border-border text-foreground/60 hover:border-red-500/40 hover:text-red-400"
                                  : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white"
                              )}
                            >
                              {isLoadingThis ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isFollowed ? (
                                <UserMinus className="w-3 h-3" />
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              {isFollowed ? "Unfollow" : "Follow"}
                            </button>
                          </div>
                        ) : (
                          <Link href={href} className="w-full py-2 rounded-xl bg-secondary/80 group-hover:bg-foreground group-hover:text-background text-[10px] font-black uppercase tracking-[0.15em] transition-all text-center">
                            View Profile
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Featured Events */}
          {filteredChallenges.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-display text-foreground">
                  {isSearchActive ? `Matching Events` : "Featured Events"}
                </h2>
                <button className="text-xs text-foreground/40 hover:text-primary transition-colors font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="relative">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 px-4 md:px-0 md:grid md:grid-cols-2 md:gap-7 pb-4 md:pb-0 scrollbar-hide">
                  {filteredChallenges.map((ch, i) => (
                    <Link key={ch.id} href={`/events/${ch.brand.toLowerCase().replace(/ /g, '-')}`} className="block min-w-[300px] md:min-w-0 snap-center">
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ y: -6 }}
                        className="relative h-64 md:h-72 rounded-3xl overflow-hidden group cursor-pointer shadow-card hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.15)] transition-all"
                      >
                        <img src={ch.image} alt={ch.brand} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute top-4 left-4 bg-primary/90 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full">{ch.tag}</div>
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <h3 className="text-xl font-semibold text-white mb-1">{ch.brand}</h3>
                          <p className="text-xs text-white/60 mb-4">{ch.title}</p>
                          <div className="flex items-center gap-5">
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-sm font-semibold text-white">{ch.reward}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-white/40" />
                              <span className="text-sm text-white/60">{ch.entries.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
              </div>
            </section>
          )}

          {/* Featured Brands */}
          {filteredBrands.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-display text-foreground">
                  {isSearchActive ? `Matching Brands` : "Featured Brands"}
                </h2>
                <button className="text-xs text-foreground/40 hover:text-primary transition-colors font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="relative">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 md:px-0 md:grid md:grid-cols-4 md:gap-6 pb-4 md:pb-0 scrollbar-hide">
                  {filteredBrands.map((brand, i) => (
                    <motion.div
                      key={brand.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ y: -5 }}
                      className="min-w-[140px] md:min-w-0 snap-center bg-card border border-border rounded-3xl p-5 md:p-6 text-center hover:border-primary/30 hover:shadow-card transition-all cursor-pointer group flex flex-col items-center shadow-soft"
                    >
                      <img src={brand.avatar || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80"} alt={brand.name} className="w-14 h-14 md:w-18 md:h-18 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors mb-3" />
                      <h3 className="text-sm font-semibold text-foreground truncate w-full">{brand.name}</h3>
                      <p className="text-[10px] text-foreground/40 mb-3 truncate w-full">{brand.handle}</p>
                      <div className="flex items-center justify-center gap-3 text-[10px] mb-4 w-full">
                        <div className="flex flex-col gap-0.5 items-center text-foreground/30"><span>Followers</span><span className="text-foreground text-xs font-medium">{brand.followers}</span></div>
                        <div className="w-px h-5 bg-border/50" />
                        <div className="flex flex-col gap-0.5 items-center text-foreground/30"><span>Events</span><span className="text-primary text-xs font-medium">{brand.campaigns}</span></div>
                      </div>
                      <button className="w-full py-2 rounded-full bg-secondary hover:bg-primary hover:text-white text-[10px] font-semibold transition-all mt-auto">View</button>
                    </motion.div>
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
              </div>
            </section>
          )}

          {/* Explore Feed Grid — Pinterest masonry-style */}
          {filteredGrid.length > 0 ? (
            <section>
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-display text-foreground">
                  {isSearchActive ? "Matching Content" : "Explore Feed"}
                </h2>
              </div>
              <div className="columns-2 md:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
                {filteredGrid.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -4 }}
                    className={`break-inside-avoid rounded-3xl overflow-hidden relative group cursor-pointer shadow-soft hover:shadow-card transition-all ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[2/3]"}`}
                  >
                    <img src={item.image} alt="Explore" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white font-medium truncate mr-2">{item.user}</span>
                        <span className="flex items-center gap-1 text-xs text-white font-medium">
                          <ThumbsUp className="w-3 h-3" />
                          {item.votes > 1000 ? `${(item.votes / 1000).toFixed(1)}k` : item.votes}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ) : !isSearchActive ? null : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-foreground/40 font-medium text-sm">No content matches "{searchQuery}"</p>
            </div>
          )}

        </div>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </SidebarLayout>
    </div>
  );
}
