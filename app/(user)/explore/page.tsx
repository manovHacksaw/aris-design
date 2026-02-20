"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Users, Flame, ArrowRight, ThumbsUp, Star, Palette, Camera, Clapperboard, Music, Shirt, Laptop, Gamepad } from "lucide-react";
import ContentSearchBar from "@/components/home/ContentSearchBar";

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

const featuredChallenges = [
    {
        id: 1,
        brand: "Adidas Originals",
        title: "Street Style Takeover",
        reward: "$8,000",
        entries: 2340,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLbgT1oExwMAiJyiQGoTmr2_kR2RzwNJYJBtC10wBZMijE3OCEsrPgdSvzCdO5lXHk81lddNFm7XOVW5duvH0UNSvRbqqMfszPAppy5WzzJdxdDJ-W914K5bL2peoY2EZRnCxcTpKN05hnX_Q5trEB_C66YSHiNMx8bouhFfYb9QKO1YlOzCUEsJ-DDg7D9kM6N2quwuaYRXbRgmImK56qxAz4QG-jtC26S1jV-6xiLtbbDDfXGKBwxW4JMERm6bODCcQUE0dsB3ZQ",
        tag: "FEATURED",
    },
    {
        id: 2,
        brand: "Red Bull",
        title: "Extreme Moments",
        reward: "$12,000",
        entries: 5120,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWXdij1SyjTwEpsDcfi27vNIMR4A5kWzyZfgXSq-mNBctN3XeoBAwyn1g6ybVKUu1YIggx-T1A3GeGdKmM97wDDhhFYUoCTYY9dUfcS2GSxdBLNbM89apBymuKSSUSg9x6IVmEm-rRSAjhvuCnkWTsnIqXACRbYYyEOa7vaIcN5vE9GAK6CqPqxPcvsV_Ftd8pzSynscsHYatTZwiLkpy9MWBHUG8Brz5Xsw_SdbH7CYr-DPyKxsktn0n4qnSaV1vXmE_NlgiqIwbA",
        tag: "HOT",
    },
];

const topCreators = [
    { name: "PixelKing", handle: "@pixelking", followers: "12.4k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDNVXmwEIJf-HfKYKQm8ddCtMhlK1XDIOChe8j2gqRGM5wXTpb5cLDZRQ4PS52b1D-eYQkyY2y9Itg_JZP_ndciNiv2B79O0-rjNckL8G29SVeC2V4w_mBQ4KzlPTPV6T9faZbAp8_RbBVGCXgZ18lrfwgfi1tXa91kqkY5_lzySFI98Z_TqBQuSkjHCyeZJbNprhijrsMR_je70VZLO6Dy8iIulY9lXyRBptjgas1xk51VqvYw5Xwqt0c2Ht3YlPmgier1iJRF-95O", xp: 4820 },
    { name: "NeonMuse", handle: "@neonmuse", followers: "9.8k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAgF1VCxevbqRB_WgyEhCZWo1d-o35_V3i3NEanc4bGeKCWlHy8V5-N-mN56_d_WtjOC2pvXOjyI17RJP-JUHvrPXMsM9g3f2Qe79rZM1SznOG51L-e3h8lVejsIoiHEgRMeiRqiptUm65iiOt4Otd0NNb-NbAdY1Dh6kWTAuQ5OUlsmaejtIyK1t7mKgtsyAyTTO5Yaj2W8K3IviStMg2ILXTvNpbDieYMekRfGIxO6ZaOXIvztjuRC7yW9xHZ8LBLPwN5bw14_Iez", xp: 4340 },
    { name: "VoxCraft", handle: "@voxcraft", followers: "8.2k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuA8m6aSUmPtcg8cE9y5ZoS53XdjWkqQwcw9JTT_cbpcDvRZ1quoAtgi69E0rNymTovvitspR-hdEvaM9eDYT5K5nOZMwpXXOyaPSzRbgXlO_yH8TStJv2xHD49Sq_s4YwL9r7F3tIu_WFC3RIUVqGVbvX4Kq5ekKVEVdcHqNN8ie_uy578UqZBQ9cZO41_ZqLcButtveXzNr2Xb1M4osSr3_aU4PBGwRh5iQ_abwm6MA3qw89yn1VfE4-iBdjkuFq2op24Wf_zitVuW", xp: 3910 },
    { name: "FlowState", handle: "@flowstate", followers: "7.1k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpvRP1uIv4EYmZx7GJoB2xyit-_JZPG0D9Xe0_dfElQsWFOYgdGldCOsdGc6Xsa7PaSNCwHC7MuD40zb81qpZkqnlgpjWvCnnDNw4lzjFxGYpWgNNRG_j8TQbhjNeNhTQGzcWZPhRwB6yGD_kCLWjvqMoRX1--H_nkrWiHWh1tcxE5WeyJ1d9aNZiVGmXDe7Z1qXM6_MVtjlygxIkqfq4DQaEts01yQgmdzlkkJmiFWB5SygvoM4k0HbOiFN17OjKPyizn728NIk6H", xp: 2650 },
];

const featuredBrands = [
    { name: "Adidas", handle: "@adidas", followers: "850k", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLbgT1oExwMAiJyiQGoTmr2_kR2RzwNJYJBtC10wBZMijE3OCEsrPgdSvzCdO5lXHk81lddNFm7XOVW5duvH0UNSvRbqqMfszPAppy5WzzJdxdDJ-W914K5bL2peoY2EZRnCxcTpKN05hnX_Q5trEB_C66YSHiNMx8bouhFfYb9QKO1YlOzCUEsJ-DDg7D9kM6N2quwuaYRXbRgmImK56qxAz4QG-jtC26S1jV-6xiLtbbDDfXGKBwxW4JMERm6bODCcQUE0dsB3ZQ", campaigns: 12 },
    { name: "Red Bull", handle: "@redbull", followers: "1.2M", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWXdij1SyjTwEpsDcfi27vNIMR4A5kWzyZfgXSq-mNBctN3XeoBAwyn1g6ybVKUu1YIggx-T1A3GeGdKmM97wDDhhFYUoCTYY9dUfcS2GSxdBLNbM89apBymuKSSUSg9x6IVmEm-rRSAjhvuCnkWTsnIqXACRbYYyEOa7vaIcN5vE9GAK6CqPqxPcvsV_Ftd8pzSynscsHYatTZwiLkpy9MWBHUG8Brz5Xsw_SdbH7CYr-DPyKxsktn0n4qnSaV1vXmE_NlgiqIwbA", campaigns: 8 },
    { name: "Nike", handle: "@nike", followers: "2.1M", avatar: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80", campaigns: 15 },
    { name: "Sony", handle: "@sony", followers: "920k", avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80", campaigns: 5 },
];

const exploreGrid = [
    { id: 1, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYiG-zIhRn_VJ8cj1EL2PwG6YhycgoqKoayLqHvOciU27W6ymsq3dAES2LeCuiYkMC8M0saTD50kGdcOZUXXOET8UNKfxoHKPGqvYUjJ_rM2C5D9MwiPp9i6BXFAlHr34VGtAB6j_nlXnmCLEM_EcQ8inYkiAVQXsLv93k_0vvBbwEVjXn-YDBki0M44ogo_9PpGDrfAZ0eDWVQqenqgTTPHg043QFcZOUPPS3qkEef6k80vOQI_GZNeBTeht1HsvUGDOmy_ZzGOSk", votes: 1200, user: "@david_art", category: "Art" },
    { id: 2, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBhMKldK8ut-GonyZ8kV-6qVEeafBOLVHaRRDUUgDJdulQr1t4_KWnmsZzVDdsNnHNO3tbwHfPGxDRfgSFU3X1JnD56bMgJw_f_mq2zkdiKXg2wt5mMeus-4dxs7Br6mAFeI2jwUoXd3ZZqL5ouc-V6GmLsUYRDzxg4EUWiwvJcMnn2sHjfwMt7ftzaUOnQ_yzsFgox-jfDLfWmpZLLulk_NunmOHnSFh6tQgCgEH3ejbFqKJN_6dmC9VBlCf9fUWtoDdQv0laOCpfM", votes: 856, user: "@moto_mike", category: "Music" },
    { id: 3, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIQc4XTLhvfd8OoVZm5ddVU-PaVsNsHSukuY_3HcJg84l2RK-YhkoY_dU07xPZQIDLeJ8XJbIxHi54V_3BJ3_1LjsdojT89HtQb6R0aG2LP9dyxc4FdlSGc0uqxty-qY_FIEkzpFqGtlx_uDLUElN7z_BD25-PJPi9t2Fy6YDD2tDS5mqRk-1FMjJWQWYKlOUrfiW10qM_XcnTjrbXIr5-NPjtaTxQoTrK2xB0aK86SZCCMXvqTV31iUz_9ytY7e_MQ65D-orXxR_W", votes: 2100, user: "@chef_jen", category: "Food" },
    { id: 4, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3n6P0VAMdsJsdnJJc521hdALiqRySabaOBYBM2_vy7XtURi37q-rxU_aIFUasQjKfgpRBCyzl4C9vMSqy_pq9pP84PySV55piDFPn6DpLhgnPD-mRBT5InUrEmaYfKttw9U-41BRrxyKH1f5O4nVxoaIzB6Cb5trB_GLIylsVkkJ47DFZBwx54MlWMHuk37x5G_4lBsu7wNVLk4vXL8gwXCqKZ1ezieJDjc2XWhf_IdcHZDRcHobi7qIi2GtRoSa_f80QjD5B5Mbb", votes: 342, user: "@adventure_tom", category: "Travel" },
    { id: 5, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_wXTlpT_fBi2H4Yr0X1aI49tzxmkAwYIdidnbBQO3MPGM4_jjB9D1_TiInVHUSxrOVSKIAx2fpaRuGibiSwZNaY24dpjrlyaXaRHyXfzTv9VcUy1GqLQJ5IdyoKEjRXQy7TUUqbXe2V4DfGnOTomuAMF2ox6Lg4_mAyQMmcKRiNITqfrHGIboZNY9sRZ5LnOmiwqt7BMIW2UPqtD8bS_S6HPeEcOsi2InbVbPYw1E6amb2mRnNndD93oseMdTVLOO8eH6DelReWNH", votes: 980, user: "@byte_runner", category: "Tech" },
    { id: 6, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3AGais-gwxMRoyDzXwF7j1yp-ppTPDvKQpSh9_z1RrlG0-uy2iDCln-qkMhPxvna7M4HIAu1iS-VpZ6rFu3V90m_5Wh2kkd3FE3NN3t8Jt5XDbsdrUPk7DEKfDm0wDQEop2PqrLdxDUgEVc2jTGgFu1fDPPGlVUP9gbP6xCJfcf_t8IU9OJpdZopHXOPkK20XQG_Mb05AEEI3IRbNeupHSp41uTo_gbmehfqR98-GmDkILfle7be5DiA4dIX20yqjsKSsLq-La0U0", votes: 1540, user: "@grid_lock", category: "Design" },
];

export default function Explore() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Simulate Search Filter
    const filteredChallenges = featuredChallenges.filter(ch =>
        ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCreators = topCreators.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBrands = featuredBrands.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.handle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGrid = exploreGrid.filter(item =>
        (activeCategory === "All" || item.category === activeCategory) &&
        (item.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <div className="space-y-6 sm:space-y-8 lg:space-y-10 pb-24 md:pb-20">

                    {/* Page Header */}
                    <div className="mb-4 sm:mb-6 lg:mb-8">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tighter mb-1.5 sm:mb-2">Explore</h1>
                        <p className="text-xs sm:text-sm font-medium text-foreground/40 leading-relaxed uppercase tracking-widest">Explore challenges, creators, and trending content</p>
                    </div>

                    {/* Search Bar - Stronger visual presence */}
                    <div className="w-full max-w-full lg:max-w-[1400px] bg-card rounded-[20px] sm:rounded-[24px] border border-border/50 p-1 sm:p-1.5 shadow-spotify">
                        <ContentSearchBar
                            className="h-10 sm:h-12 md:h-14 py-0 border-0 bg-transparent shadow-none text-sm sm:text-base"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Category Chips - Refined and consistent */}
                    <div className="relative">
                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.label;
                                return (
                                    <button
                                        key={cat.label}
                                        onClick={() => setActiveCategory(cat.label)}
                                        className={cn(
                                            "flex items-center gap-2.5 px-6 h-11 rounded-[20px] text-sm font-bold whitespace-nowrap transition-all border",
                                            isActive
                                                ? "bg-foreground text-background border-foreground shadow-lg shadow-foreground/10 scale-100"
                                                : "bg-secondary/50 text-foreground/50 border-border/40 hover:bg-secondary hover:text-foreground hover:border-border hover:scale-105"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? "fill-current" : "")} />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background via-background/50 to-transparent pointer-events-none md:hidden" />
                    </div>

                    {/* Featured Events — Refined large hero cards */}
                    {filteredChallenges.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4 sm:mb-6 px-3 sm:px-4 md:px-0 gap-3">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                                    {searchQuery ? `Matching Events (${filteredChallenges.length})` : "Featured Events"}
                                </h2>
                                <button className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] hover:text-foreground transition-colors flex items-center gap-1.5">
                                    {searchQuery ? "Show More" : "View All"} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Mobile Horizontal Scroll / Desktop Grid */}
                            <div className="relative">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 md:px-0 md:grid md:grid-cols-2 md:gap-6 pb-4 md:pb-0 scrollbar-hide">
                                    {filteredChallenges.map((ch, i) => (
                                        <Link key={ch.id} href={`/events/${ch.brand.toLowerCase().replace(/ /g, '-')}`} className="block min-w-[300px] md:min-w-0 snap-center">
                                            <motion.div
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                whileHover={{ y: -4 }}
                                                className="relative h-64 md:h-72 rounded-[24px] md:rounded-[28px] overflow-hidden group cursor-pointer border border-border shadow-spotify"
                                            >
                                                <img
                                                    src={ch.image}
                                                    alt={ch.brand}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-[0.1em] uppercase">
                                                    {ch.tag}
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                                                    <h3 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">{ch.brand}</h3>
                                                    <p className="text-xs md:text-sm font-medium text-white/70 mb-4 md:mb-5 leading-relaxed line-clamp-2 md:line-clamp-none">{ch.title}</p>
                                                    <div className="flex items-center gap-4 md:gap-6">
                                                        <div className="flex items-center gap-2">
                                                            <Trophy className="w-3.5 md:w-4 h-3.5 md:h-4 text-accent fill-accent/20" />
                                                            <span className="text-xs md:text-sm font-black text-white">{ch.reward} Pool</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Users className="w-3.5 md:w-4 h-3.5 md:h-4 text-white/40" />
                                                            <span className="text-xs md:text-sm font-bold text-white/60">{ch.entries.toLocaleString()} Enrolled</span>
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

                    {/* Top Creators Grid */}
                    {filteredCreators.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4 sm:mb-6 px-3 sm:px-4 md:px-0 gap-3">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                                    {searchQuery ? `Matching Users (${filteredCreators.length})` : "Top Creators"}
                                </h2>
                                <button className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] hover:text-foreground transition-colors flex items-center gap-1.5">
                                    {searchQuery ? "Show More" : "View All"} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="relative">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 md:px-0 md:grid md:grid-cols-4 md:gap-6 pb-4 md:pb-0 scrollbar-hide">
                                    {filteredCreators.map((creator, i) => (
                                        <motion.div
                                            key={creator.handle}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            whileHover={{ y: -4 }}
                                            className="min-w-[140px] md:min-w-0 snap-center bg-card/50 backdrop-blur-sm border border-border/60 rounded-[24px] md:rounded-[28px] p-4 md:p-6 text-center hover:bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm hover:shadow-xl flex flex-col items-center"
                                        >
                                            <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4">
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary rounded-full animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                                                <img
                                                    src={creator.avatar}
                                                    alt={creator.name}
                                                    className="relative w-full h-full rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors p-0.5 bg-background"
                                                />
                                            </div>
                                            <h3 className="text-sm md:text-base font-black text-foreground tracking-tight truncate w-full">{creator.name}</h3>
                                            <p className="text-[10px] md:text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-3 md:mb-4 truncate w-full">{creator.handle}</p>

                                            <div className="flex items-center justify-center gap-2 md:gap-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-4 md:mb-6 w-full">
                                                <div className="flex flex-col gap-0.5 md:gap-1 text-foreground/30 items-center">
                                                    <span>Followers</span>
                                                    <span className="text-foreground text-[10px] md:text-xs">{creator.followers}</span>
                                                </div>
                                                <div className="w-px h-6 bg-border/50" />
                                                <div className="flex flex-col gap-0.5 md:gap-1 text-foreground/30 items-center">
                                                    <span>XP</span>
                                                    <span className="text-primary text-[10px] md:text-xs">{creator.xp.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <button className="w-full py-2 md:py-2.5 rounded-xl bg-secondary/80 hover:bg-foreground hover:text-background text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all mt-auto">
                                                Follow
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
                            </div>
                        </section>
                    )}

                    {/* Featured Brands Grid */}
                    {filteredBrands.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4 sm:mb-6 px-3 sm:px-4 md:px-0 gap-3">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                                    {searchQuery ? `Matching Brands (${filteredBrands.length})` : "Featured Brands"}
                                </h2>
                                <button className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] hover:text-foreground transition-colors flex items-center gap-1.5">
                                    {searchQuery ? "Show More" : "View All"} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="relative">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 md:px-0 md:grid md:grid-cols-4 md:gap-6 pb-4 md:pb-0 scrollbar-hide">
                                    {filteredBrands.map((brand, i) => (
                                        <motion.div
                                            key={brand.handle}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            whileHover={{ y: -4 }}
                                            className="min-w-[140px] md:min-w-0 snap-center bg-card/50 backdrop-blur-sm border border-border/60 rounded-[24px] md:rounded-[28px] p-4 md:p-6 text-center hover:bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm hover:shadow-xl flex flex-col items-center"
                                        >
                                            <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4">
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary rounded-full animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                                                <img
                                                    src={brand.avatar}
                                                    alt={brand.name}
                                                    className="relative w-full h-full rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors p-0.5 bg-background"
                                                />
                                            </div>
                                            <h3 className="text-sm md:text-base font-black text-foreground tracking-tight truncate w-full">{brand.name}</h3>
                                            <p className="text-[10px] md:text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-3 md:mb-4 truncate w-full">{brand.handle}</p>

                                            <div className="flex items-center justify-center gap-2 md:gap-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-4 md:mb-6 w-full">
                                                <div className="flex flex-col gap-0.5 md:gap-1 text-foreground/30 items-center">
                                                    <span>Followers</span>
                                                    <span className="text-foreground text-[10px] md:text-xs">{brand.followers}</span>
                                                </div>
                                                <div className="w-px h-6 bg-border/50" />
                                                <div className="flex flex-col gap-0.5 md:gap-1 text-foreground/30 items-center">
                                                    <span>Events</span>
                                                    <span className="text-primary text-[10px] md:text-xs">{brand.campaigns}</span>
                                                </div>
                                            </div>

                                            <button className="w-full py-2 md:py-2.5 rounded-xl bg-secondary/80 hover:bg-foreground hover:text-background text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all mt-auto">
                                                View
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
                            </div>
                        </section>
                    )}

                    {/* Explore Grid - Clean Tiles */}
                    {filteredGrid.length > 0 ? (
                        <section>
                            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">
                                    {searchQuery ? "Matching Content" : "Explore Feed"}
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 px-4 md:px-0">
                                {filteredGrid.map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.06 }}
                                        whileHover={{ y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="aspect-square rounded-[16px] md:rounded-[24px] overflow-hidden relative group cursor-pointer border border-border shadow-soft"
                                    >
                                        <img
                                            src={item.image}
                                            alt="Explore"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />

                                        {/* Overlay on hover (always visible on mobile) */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] md:text-xs text-white font-black tracking-tight truncate mr-2">{item.user}</span>
                                                <span className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-white font-black">
                                                    <ThumbsUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary fill-primary/20" />
                                                    {item.votes > 1000 ? `${(item.votes / 1000).toFixed(1)}k` : item.votes}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Category tag */}
                                        <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] text-white font-black uppercase tracking-wider">
                                            {item.category}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <p className="text-foreground/60 font-bold uppercase tracking-widest text-sm mb-2">No results found</p>
                            {searchQuery && (
                                <p className="text-foreground/40 text-xs max-w-sm">
                                    Try different keywords or {activeCategory !== "All" && `clear the "${activeCategory}" filter`}
                                </p>
                            )}
                        </div>
                    )}

                </div>


                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>
        </div >
    );
}
