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
            {/* Header elements removed at user request */}
        </motion.div>
    );
}
