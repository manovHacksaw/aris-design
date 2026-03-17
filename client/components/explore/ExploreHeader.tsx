"use client";

import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Shirt, Wallet, Smartphone, Coffee, Gamepad, Rocket, Laptop, X, Loader2, User, Building2, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { searchAll, EventSearchResult, BrandSearchResult, UserSearchResult } from "@/services/search.service";

const sectors = [
    { label: "ALL", icon: Sparkles },
    { label: "APPAREL", icon: Shirt },
    { label: "SAAS", icon: Laptop },
    { label: "FINANCE", icon: Wallet },
    { label: "ELECTRONICS", icon: Smartphone },
    { label: "F&B", icon: Coffee },
    { label: "GAMING", icon: Gamepad },
    { label: "STARTUPS", icon: Rocket },
];

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface ExploreHeaderProps {
    activeSector: string;
    onSectorChange: (s: string) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export default function ExploreHeader({ activeSector, onSectorChange, searchQuery, onSearchChange }: ExploreHeaderProps) {
    const router = useRouter();
    const [visible, setVisible] = useState(true);
    const { scrollY } = useScroll();

    const [searchResults, setSearchResults] = useState<{ events: EventSearchResult[]; brands: BrandSearchResult[]; users: UserSearchResult[] } | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        if (latest > previous && latest > 120) {
            setVisible(false);
        } else {
            setVisible(true);
        }
    });

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults(null);
            setSearchOpen(false);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await searchAll(searchQuery.trim(), 4);
                setSearchResults(res.results);
                setSearchOpen(true);
            } catch {
                setSearchResults(null);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const hasResults = searchResults && (searchResults.events.length + searchResults.brands.length + searchResults.users.length) > 0;

    const navigate = (href: string) => {
        router.push(href);
        setSearchOpen(false);
        onSearchChange("");
    };

    return (
        <motion.div
            variants={{
                visible: { y: 0, opacity: 1 },
                hidden: { y: -110, opacity: 0 }
            }}
            animate={visible ? "visible" : "hidden"}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="sticky top-0 z-[100] w-full bg-background/90 backdrop-blur-2xl border-b border-border pt-5 pb-3 space-y-4"
        >
            {/* Title + Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
                <div className="shrink-0">
                    <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5rem] text-foreground uppercase leading-[0.92] tracking-tight">Discover</h1>
                    <p className="mt-1 text-[10px] font-black text-foreground/30 uppercase tracking-[0.3em]">Events · Brands · Creators</p>
                </div>

                {/* Search Bar */}
                <div ref={containerRef} className="relative flex-1 max-w-xl group">
                    <div className="absolute inset-px bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-all blur-sm pointer-events-none" />
                    <div className="relative flex items-center bg-white/[0.04] border border-border group-focus-within:border-primary/40 rounded-2xl overflow-hidden transition-all">
                        {searchLoading
                            ? <Loader2 className="absolute left-4 w-4 h-4 text-primary animate-spin pointer-events-none shrink-0" />
                            : <Search className="absolute left-4 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors shrink-0 pointer-events-none" />
                        }
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onFocus={() => hasResults && setSearchOpen(true)}
                            placeholder="Search events, brands, or creators..."
                            className="w-full bg-transparent py-3.5 pl-11 pr-9 text-sm font-medium text-foreground placeholder:text-foreground/20 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { onSearchChange(""); setSearchResults(null); setSearchOpen(false); }}
                                className="absolute right-3 text-foreground/20 hover:text-foreground/60 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Results Dropdown */}
                    <AnimatePresence>
                        {searchOpen && (
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
                                    <div className="divide-y divide-border/50">
                                        {/* Users */}
                                        {searchResults!.users.length > 0 && (
                                            <div className="p-3">
                                                <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/40">Creators</p>
                                                {searchResults!.users.map((u) => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => navigate(`/profile/${u.username}`)}
                                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-foreground/[0.04] transition-colors text-left"
                                                    >
                                                        {u.avatarUrl
                                                            ? <img src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt={u.displayName} />
                                                            : <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-foreground/20" /></div>
                                                        }
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-foreground truncate">{u.displayName}</p>
                                                            <p className="text-xs text-foreground/50 truncate">@{u.username}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Brands */}
                                        {searchResults!.brands.length > 0 && (
                                            <div className="p-3">
                                                <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/40">Brands</p>
                                                {searchResults!.brands.map((b) => (
                                                    <button
                                                        key={b.id}
                                                        onClick={() => navigate(`/brand/${b.id}`)}
                                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-foreground/[0.04] transition-colors text-left"
                                                    >
                                                        {b.logoCid
                                                            ? <img src={`${PINATA_GW}/${b.logoCid}`} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt={b.name} />
                                                            : <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-foreground/20" /></div>
                                                        }
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                                                            {b.tagline && <p className="text-xs text-foreground/50 truncate">{b.tagline}</p>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Events */}
                                        {searchResults!.events.length > 0 && (
                                            <div className="p-3">
                                                <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/40">Events</p>
                                                {searchResults!.events.map((ev) => (
                                                    <button
                                                        key={ev.id}
                                                        onClick={() => navigate(`/events/${ev.id}`)}
                                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-foreground/[0.04] transition-colors text-left"
                                                    >
                                                        {ev.imageUrls?.thumbnail
                                                            ? <img src={ev.imageUrls.thumbnail} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt={ev.title} />
                                                            : <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-foreground/20" /></div>
                                                        }
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                                                            {ev.brand && <p className="text-xs text-foreground/50 truncate">{ev.brand.name}</p>}
                                                        </div>
                                                        <span className={`ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 ${ev.status === "posting" || ev.status === "voting" ? "bg-primary/10 text-primary" : "bg-foreground/5 text-foreground/30"}`}>
                                                            {ev.status}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Sector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {sectors.map((sector) => {
                    const isActive = activeSector === sector.label;
                    const Icon = sector.icon;
                    return (
                        <button
                            key={sector.label}
                            onClick={() => onSectorChange(sector.label)}
                            className={cn(
                                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
                                isActive
                                    ? "bg-lime-400 text-black shadow-md"
                                    : "bg-foreground/[0.04] text-foreground/30 border border-border hover:bg-foreground/[0.08] hover:text-foreground/60"
                            )}
                        >
                            <Icon className={cn("w-3 h-3", isActive ? "text-black" : "")} />
                            {sector.label}
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}
