"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Globe, Twitter, Instagram, ExternalLink, Calendar, Users, Trophy, CheckCircle, ArrowLeft, Bell, BellOff } from "lucide-react";
import Link from "next/link";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { getBrandById, Brand } from "@/services/brand.service";
import { getSubscriptionStatus, subscribeToBrand, unsubscribeFromBrand } from "@/services/subscription.service";
import type { Event } from "@/services/event.service";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

function toBrandSlug(name: string) {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const STATUS_STYLE: Record<string, string> = {
    posting: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    voting: "bg-lime-400/10 text-lime-400 border-lime-500/20",
    completed: "bg-foreground/5 text-foreground/30 border-border",
    scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    draft: "bg-foreground/5 text-foreground/30 border-border",
};

function SocialLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors text-foreground/50 hover:text-foreground"
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </a>
    );
}

export default function BrandPublicPage() {
    const params = useParams();
    const router = useRouter();
    const identifier = params.identifier as string;

    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [activeTab, setActiveTab] = useState<"events" | "about">("events");
    const { user: currentUser } = useUser();

    useEffect(() => {
        if (!identifier) return;
        setLoading(true);
        getBrandById(identifier).then(data => {
            setBrand(data);
            // Redirect UUID URLs to clean slug URLs
            const slug = toBrandSlug(data.name);
            if (identifier !== slug) {
                router.replace(`/brand/${slug}`);
            }
            if (currentUser) {
                getSubscriptionStatus(data.id).then(setSubscribed);
            }
        }).catch(() => {
            setNotFound(true);
        }).finally(() => setLoading(false));
    }, [identifier, currentUser]);

    const handleToggleSubscribe = async () => {
        if (!brand || !currentUser) return;
        const prev = subscribed;
        setSubscribed(!prev);

        try {
            if (prev) await unsubscribeFromBrand(brand.id);
            else await subscribeToBrand(brand.id);
        } catch {
            setSubscribed(prev);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans">
                <SidebarLayout>
                    <div className="pb-24 lg:pb-10 animate-pulse">
                        {/* Back placeholder */}
                        <div className="h-4 w-12 bg-foreground/10 rounded mb-6" />

                        {/* Header card skeleton */}
                        <div className="rounded-[28px] border border-border bg-card overflow-hidden mb-6 p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                {/* Logo */}
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-foreground/10 shrink-0" />
                                <div className="flex-1 space-y-3">
                                    {/* Name */}
                                    <div className="h-8 w-48 bg-foreground/10 rounded-lg" />
                                    {/* Tagline */}
                                    <div className="h-4 w-32 bg-foreground/7 rounded" />
                                    {/* Categories */}
                                    <div className="flex gap-2">
                                        <div className="h-6 w-24 bg-foreground/7 rounded-full" />
                                        <div className="h-6 w-28 bg-foreground/7 rounded-full" />
                                    </div>
                                    {/* Subscribe button */}
                                    <div className="h-9 w-28 bg-foreground/10 rounded-xl" />
                                </div>
                            </div>
                            {/* Stats row */}
                            <div className="flex flex-wrap gap-8 mt-6 pt-5 border-t border-border">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="h-3 w-16 bg-foreground/7 rounded" />
                                        <div className="h-7 w-10 bg-foreground/10 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tab bar skeleton */}
                        <div className="h-11 w-40 bg-foreground/7 rounded-2xl mb-6" />

                        {/* Event cards skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="rounded-[20px] border border-border bg-card overflow-hidden">
                                    <div className="h-[160px] bg-foreground/10" />
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 w-3/4 bg-foreground/10 rounded" />
                                        <div className="h-3 w-1/2 bg-foreground/7 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="md:hidden">
                        <BottomNav />
                    </div>
                </SidebarLayout>
            </div>
        );
    }

    if (notFound || !brand) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
                <div className="w-20 h-20 rounded-3xl bg-foreground/5 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-foreground/20" />
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tighter">Brand not found</h2>
                <p className="text-sm text-foreground/40 font-medium">This brand doesn't exist or has been removed.</p>
                <Link href="/explore" className="text-xs font-black text-primary hover:underline uppercase tracking-widest">
                    Back to Discover
                </Link>
            </div>
        );
    }

    const logoUrl = brand.logoUrls?.medium
        ? brand.logoUrls.medium
        : brand.logoCid
            ? `${PINATA_GW}/${brand.logoCid}`
            : null;

    const bEvents = brand.events || [];
    const socialLinks = brand.socialLinks ?? {};
    const activeEvents = bEvents.filter((e: any) => e.status === "posting" || e.status === "voting");
    const pastEvents = bEvents.filter((e: any) => e.status === "completed");

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <SidebarLayout>
                <div className="pb-24 lg:pb-10">
                    {/* Back */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-xs font-black text-foreground/40 hover:text-foreground uppercase tracking-widest mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>

                    {/* ── Header card ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-[28px] border border-border bg-card overflow-hidden mb-6"
                    >
                        {/* Gradient bg */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

                        <div className="relative p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                {/* Logo */}
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-border bg-foreground/5 overflow-hidden flex items-center justify-center shrink-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} className="w-full h-full object-cover" alt={brand.name} />
                                    ) : (
                                        <span className="text-3xl font-black text-foreground/20">{brand.name[0]}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h1 className="font-display text-3xl sm:text-4xl text-foreground tracking-tight">{brand.name}</h1>
                                        {brand.isVerified && (
                                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                                        )}
                                    </div>
                                    {brand.tagline && (
                                        <p className="text-sm text-foreground/50 font-medium mb-3">{brand.tagline}</p>
                                    )}

                                    {/* Categories */}
                                    {brand.categories?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {brand.categories.map(cat => (
                                                <span key={cat} className="px-2.5 py-0.5 rounded-full bg-foreground/5 border border-border text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions + social */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {brand.isOwner ? (
                                            <Link
                                                href="/brand/settings"
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-foreground/5 border border-border text-foreground hover:bg-foreground/10 transition-all"
                                            >
                                                Edit Profile
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => setSubscribed(p => !p)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                                                    subscribed
                                                        ? "bg-foreground/5 border-border text-foreground/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/20"
                                                        : "bg-primary border-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
                                                )}
                                            >
                                                {subscribed ? <><BellOff className="w-3.5 h-3.5" /> Subscribed</> : <><Bell className="w-3.5 h-3.5" /> Subscribe</>}
                                            </button>
                                        )}
                                        {socialLinks.twitter && <SocialLink href={socialLinks.twitter} icon={Twitter} label="Twitter" />}
                                        {socialLinks.instagram && <SocialLink href={socialLinks.instagram} icon={Instagram} label="Instagram" />}
                                        {brand.websiteUrl && <SocialLink href={brand.websiteUrl} icon={Globe} label="Website" />}
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-border">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-0.5">Events</p>
                                    <p className="text-2xl font-black text-foreground">{brand.eventsCreated ?? bEvents.length}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-0.5">Participants</p>
                                    <p className="text-2xl font-black text-foreground">{brand.uniqueParticipants?.toLocaleString() ?? "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-0.5">USDC Distributed</p>
                                    <p className="text-2xl font-black text-foreground">${(brand.totalUsdcGiven ?? 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-0.5">Level</p>
                                    <p className="text-2xl font-black text-foreground">{brand.level ?? 1}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Tab bar ── */}
                    <div className="flex items-center gap-1 bg-foreground/[0.03] border border-border rounded-2xl p-1 w-fit mb-6">
                        {(["events", "about"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] transition-all",
                                    activeTab === tab
                                        ? "bg-foreground text-background shadow-sm"
                                        : "text-foreground/30 hover:text-foreground/60"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* ── Events tab ── */}
                    {activeTab === "events" && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                            {/* Active events */}
                            {activeEvents.length > 0 && (
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-4">Live Now</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {activeEvents.map((ev: any) => <EventCard key={ev.id} event={ev} />)}
                                    </div>
                                </section>
                            )}

                            {/* All events */}
                            {bEvents.filter((e: any) => e.status !== "posting" && e.status !== "voting").length > 0 && (
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-4">
                                        {activeEvents.length > 0 ? "Past Events" : "Events"}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {bEvents.filter((e: any) => e.status !== "posting" && e.status !== "voting").map((ev: any) => <EventCard key={ev.id} event={ev} />)}
                                    </div>
                                </section>
                            )}

                            {bEvents.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 gap-4 text-foreground/20">
                                    <Calendar className="w-10 h-10" />
                                    <p className="text-[11px] font-black uppercase tracking-widest">No events yet</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── About tab ── */}
                    {activeTab === "about" && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
                            {brand.description && (
                                <div className="bg-card border border-border rounded-2xl p-6">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3">About</p>
                                    <p className="text-sm text-foreground/60 font-medium leading-relaxed whitespace-pre-line">{brand.description}</p>
                                </div>
                            )}
                            {brand.websiteUrl && (
                                <div className="bg-card border border-border rounded-2xl p-6">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3">Links</p>
                                    <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                                        <Globe className="w-4 h-4" /> {brand.websiteUrl}
                                        <ExternalLink className="w-3 h-3 opacity-50" />
                                    </a>
                                </div>
                            )}
                            {!brand.description && !brand.websiteUrl && (
                                <p className="text-sm text-foreground/30 font-medium py-8 text-center">No details available.</p>
                            )}
                        </motion.div>
                    )}
                </div>
                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div>
    );
}

function EventCard({ event }: { event: Event }) {
    const imgUrl = (event as any).imageUrls?.medium || event.imageUrl
        || (event.imageCid ? `${PINATA_GW}/${event.imageCid}` : null);

    return (
        <Link href={`/events/${event.id}`}>
            <motion.div
                whileHover={{ y: -2 }}
                className="relative rounded-[20px] border border-border bg-card overflow-hidden group cursor-pointer"
            >
                {/* Image */}
                <div className="relative h-[160px] bg-foreground/5">
                    {imgUrl ? (
                        <img src={imgUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={event.title} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-foreground/15" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className={cn("absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border", STATUS_STYLE[event.status] || STATUS_STYLE.draft)}>
                        {event.status}
                    </span>
                </div>

                {/* Info */}
                <div className="p-4">
                    <p className="text-sm font-black text-foreground leading-tight mb-1 line-clamp-2">{event.title}</p>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-foreground/30">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{event._count?.submissions ?? 0}</span>
                        </div>
                        {(event.leaderboardPool ?? event.topReward ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-foreground/50">
                                <Trophy className="w-3 h-3 text-yellow-500/70" />
                                <span className="text-[10px] font-black">${(event.leaderboardPool ?? event.topReward ?? 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
