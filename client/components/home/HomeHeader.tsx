"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Calendar, Building2, User, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { searchAll, EventSearchResult, BrandSearchResult, UserSearchResult } from "@/services/search.service";

/* ─────────────────────────────────────────────────────────
   Sparkle Particle System  (Aceternity-inspired)
───────────────────────────────────────────────────────── */
interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
}

function SparkleCanvas() {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const p: Particle[] = Array.from({ length: 28 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 4,
            opacity: Math.random() * 0.5 + 0.1,
        }));
        setParticles(p);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-lime-400"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
                    animate={{ y: [0, -30, 0], opacity: [0, p.opacity, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-lime-500/[0.08] rounded-full blur-3xl" />
            <div className="absolute -top-8 right-1/3 w-48 h-48 bg-lime-400/[0.05] rounded-full blur-3xl" />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Shimmer Gradient Word
───────────────────────────────────────────────────────── */
function ShimmerWord({ children }: { children: string }) {
    return (
        <span className="bg-gradient-to-r from-lime-300 via-green-300 to-lime-400 bg-clip-text text-transparent">
            {children}
        </span>
    );
}

/* ─────────────────────────────────────────────────────────
   Animated Headline — word-by-word blur-fade reveal
───────────────────────────────────────────────────────── */
const HEADLINE_LINES = ["PARTICIPATE IN", "EVENTS. EARN", "DOLLARS."];

function AnimatedHeadline() {
    const container = {
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
    };
    const word = {
        hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
        show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
        },
    };

    return (
        <motion.h1
            variants={container}
            initial="hidden"
            animate="show"
            className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] leading-[0.92] tracking-tight text-foreground uppercase"
        >
            {HEADLINE_LINES.map((line, li) => (
                <span key={li} className="block">
                    {line.split(" ").map((w, wi) => (
                        <motion.span key={wi} variants={word} className="inline-block mr-[0.22em]">
                            {li === 2 && wi === 0 ? <ShimmerWord>{w}</ShimmerWord> : w}
                        </motion.span>
                    ))}
                </span>
            ))}
        </motion.h1>
    );
}

/* ─────────────────────────────────────────────────────────
   Main Export
───────────────────────────────────────────────────────── */
export default function HomeHeader() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<{ events: EventSearchResult[]; brands: BrandSearchResult[]; users: UserSearchResult[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults(null);
            setOpen(false);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await searchAll(searchQuery.trim(), 4);
                setResults(res.results);
                setOpen(true);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const hasResults = results && (results.events.length + results.brands.length + results.users.length) > 0;

    return (
        <div className="space-y-8 mb-8">

            {/* ── HERO BLOCK ── */}
            <div
                className="relative rounded-3xl overflow-hidden border"
                style={isDark
                    ? { background: "rgba(13,13,16,0.6)", borderColor: "rgba(255,255,255,0.08)" }
                    : { background: "linear-gradient(135deg, #E4EDE0 0%, #E6EBF7 50%, #EDE6F9 100%)", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 8px 48px rgba(0,0,0,0.08)" }
                }
            >
                <SparkleCanvas />

                {/* Dot grid — dark: white dots, light: dark dots (matches CreateHero) */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={isDark ? {
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                        opacity: 0.025,
                    } : {
                        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
                        backgroundSize: "22px 22px",
                    }}
                />

                {/* Light mode glow orbs — matches CreateHero */}
                {!isDark && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[130px]" style={{ background: "rgba(126,203,42,0.18)" }} />
                        <div className="absolute -bottom-20 right-0 w-[400px] h-[400px] rounded-full blur-[110px]" style={{ background: "rgba(167,139,250,0.14)" }} />
                        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full blur-[90px]" style={{ background: "rgba(96,182,255,0.10)" }} />
                    </div>
                )}

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/70 to-transparent pointer-events-none" />

                <div className="relative z-10 px-6 pt-8 pb-8 sm:px-8">
                    <div className="mb-3">
                        <AnimatedHeadline />
                    </div>

                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                        className="text-sm text-foreground/50 font-medium max-w-xs leading-relaxed"
                    >
                        Earn{" "}
                        <span className="text-foreground font-bold">3 cents</span>{" "}
                        for every vote you cast. Vote mindfully — higher rewards go to those who align with the crowd.
                    </motion.p>
                </div>
            </div>

            {/* ── SEARCH BAR ── */}
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.35 }}
                className="relative group max-w-3xl"
            >
                <div className="absolute -inset-px bg-gradient-to-r from-lime-400/20 via-green-400/15 to-lime-400/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm pointer-events-none" />
                <div className="relative flex items-center bg-surface border border-border group-focus-within:border-lime-400/35 rounded-2xl transition-all duration-300">
                    {loading
                        ? <Loader2 className="absolute left-5 w-4 h-4 text-lime-400 animate-spin pointer-events-none" />
                        : <Search className="absolute left-5 w-4 h-4 text-foreground/30 group-focus-within:text-lime-400 transition-colors duration-300 pointer-events-none" />
                    }
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => hasResults && setOpen(true)}
                        placeholder="Search events, brands, or categories..."
                        className="w-full bg-transparent py-4 pl-12 pr-10 text-sm font-medium text-foreground placeholder:text-foreground/30 outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(""); setResults(null); setOpen(false); }}
                            className="absolute right-4 text-foreground/20 hover:text-foreground/60 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ── RESULTS DROPDOWN ── */}
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-2 left-0 right-0 z-50 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
                        >
                            {!hasResults ? (
                                <p className="px-5 py-4 text-sm text-foreground/50">No results for "{searchQuery}"</p>
                            ) : (
                                <div className="divide-y divide-surface-border">
                                    {/* Events */}
                                    {results!.events.length > 0 && (
                                        <div className="p-3">
                                            <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/40">Events</p>
                                            {results!.events.map((ev) => (
                                                <button
                                                    key={ev.id}
                                                    onClick={() => { router.push(`/events/${ev.id}`); setOpen(false); setSearchQuery(""); }}
                                                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface transition-colors text-left"
                                                >
                                                    {ev.imageUrls?.thumbnail
                                                        ? <img src={ev.imageUrls.thumbnail} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                                        : <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-foreground/20" /></div>
                                                    }
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                                                        {ev.brand && <p className="text-xs text-foreground/50 truncate">{ev.brand.name}</p>}
                                                    </div>
                                                    <span className={`ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 ${ev.status === 'posting' || ev.status === 'voting' ? 'bg-lime-400/10 text-lime-400' : 'bg-white/5 text-foreground/30'}`}>
                                                        {ev.status}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Brands */}
                                    {results!.brands.length > 0 && (
                                        <div className="p-3">
                                            <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/40">Brands</p>
                                            {results!.brands.map((brand) => (
                                                <button
                                                    key={brand.id}
                                                    onClick={() => { router.push(`/brand/${brand.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`); setOpen(false); setSearchQuery(""); }}
                                                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface transition-colors text-left"
                                                >
                                                    {brand.logoCid
                                                        ? <img src={`https://gateway.pinata.cloud/ipfs/${brand.logoCid}`} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                                        : <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-foreground/20" /></div>
                                                    }
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-foreground truncate">{brand.name}</p>
                                                        {brand.tagline && <p className="text-xs text-foreground/50 truncate">{brand.tagline}</p>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Users */}
                                    {results!.users.length > 0 && (
                                        <div className="p-3">
                                            <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/40">Creators</p>
                                            {results!.users.map((user) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => { router.push(`/profile/${user.username}`); setOpen(false); setSearchQuery(""); }}
                                                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface transition-colors text-left"
                                                >
                                                    {user.avatarUrl
                                                        ? <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                                        : <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-foreground/20" /></div>
                                                    }
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                                                        <p className="text-xs text-foreground/50 truncate">@{user.username}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

        </div>
    );
}
