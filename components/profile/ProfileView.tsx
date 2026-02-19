"use client";

import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Grid, ThumbsUp, Award } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import ProfileCard from "./ProfileCard";
import ProfileTabs from "./ProfileTabs";
import ProfilePosts from "./ProfilePosts";
import ProfileVotes from "./ProfileVotes";
import ProfileRewards from "./ProfileRewards";
import ProfileActivity from "./ProfileActivity";

interface ProfileViewProps {
    isOwnProfile?: boolean;
    user: {
        name: string;
        handle: string;
        avatar: string;
        headerImage: string;
        bio: string;
        stats: {
            posts: string;
            votes: string;
            xp: string;
            earned: string;
        };
        social: {
            followers: string;
            following: string;
        };
    };
}

export default function ProfileView({ isOwnProfile = false, user }: ProfileViewProps) {
    const [activeTab, setActiveTab] = useState("posts");
    const [showSocialModal, setShowSocialModal] = useState<{ show: boolean; type: "followers" | "following" }>({ show: false, type: "followers" });

    const tabs = [
        { id: "posts", label: "Posts", icon: Grid },
        { id: "votes", label: "Votes", icon: ThumbsUp },
        { id: "rewards", label: "Rewards", icon: Award },
    ];

    const socialData = {
        followers: [
            { name: "PixelKing", handle: "@pixelking", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" },
            { name: "NeonMuse", handle: "@neonmuse", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
            { name: "VoxCraft", handle: "@voxcraft", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop" },
        ],
        following: [
            { name: "Adidas", handle: "@adidas", avatar: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop" },
            { name: "Nike", handle: "@nike", avatar: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=100&h=100&fit=crop" },
        ]
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 pb-24 w-full">
                    {/* Header Image */}
                    <div className="h-40 md:h-56 bg-card w-full relative overflow-hidden md:rounded-[22px] md:mx-4 md:mt-4 md:w-auto border-b md:border border-border/40 group">
                        <img
                            src={user.headerImage}
                            alt="Header cover"
                            className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background" />

                        {isOwnProfile && (
                            <button className="absolute top-4 right-4 bg-background/50 backdrop-blur-md text-foreground/60 px-3 py-1.5 rounded-xl text-[9px] font-black border border-white/10 hover:bg-background/70 transition-all uppercase tracking-widest">
                                Change Cover
                            </button>
                        )}
                    </div>

                    {/* Profile Card */}
                    <div className="md:-mt-20 px-2 md:px-6 relative z-10 mb-6">
                        <ProfileCard
                            user={user}
                            isOwnProfile={isOwnProfile}
                            onFollowersClick={() => setShowSocialModal({ show: true, type: "followers" })}
                            onFollowingClick={() => setShowSocialModal({ show: true, type: "following" })}
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="max-w-[1600px] mx-auto md:px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Sidebar: About + Activity */}
                        <aside className="lg:col-span-4 xl:col-span-3 px-4 md:px-0 space-y-4">
                            {/* About */}
                            <div className="bg-card border border-border/40 rounded-[22px] p-6">
                                <h3 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    About
                                </h3>
                                <p className="text-foreground/50 text-xs leading-relaxed font-medium mb-5">
                                    {user.bio}
                                </p>
                                <div className="space-y-3 pt-4 border-t border-border/30">
                                    {[
                                        { label: "Joined", value: "March 2024" },
                                        { label: "Location", value: "Global" },
                                        { label: "Website", value: "aris.xyz/" + user.handle.replace("@", ""), isLink: true },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-foreground/30">{item.label}</span>
                                            {item.isLink ? (
                                                <a href="#" className="text-primary hover:underline">{item.value}</a>
                                            ) : (
                                                <span className="text-foreground/60">{item.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Cards */}
                            <div className="hidden lg:block">
                                <ProfileActivity isOwnProfile={isOwnProfile} />
                            </div>
                        </aside>

                        {/* Main Content: Tabs + Feed */}
                        <div className="lg:col-span-8 xl:col-span-9 px-4 md:px-0">
                            <ProfileTabs
                                tabs={tabs}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />

                            <div className="min-h-[400px] mt-6">
                                {activeTab === "posts" && <ProfilePosts />}
                                {activeTab === "votes" && <ProfileVotes />}
                                {activeTab === "rewards" && <ProfileRewards />}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Activity (below tabs content) */}
                    <div className="lg:hidden px-4 mt-8">
                        <h3 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-4">Activity & Progress</h3>
                        <ProfileActivity isOwnProfile={isOwnProfile} />
                    </div>
                </main>

                <div className="md:hidden">
                    <BottomNav />
                </div>
            </SidebarLayout>

            {/* Social Lists Modal */}
            {showSocialModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowSocialModal({ ...showSocialModal, show: false })}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative w-full max-w-md bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-2xl"
                    >
                        <div className="p-5 border-b border-border/40 flex items-center justify-between">
                            <h3 className="text-sm font-black text-foreground capitalize tracking-tight">{showSocialModal.type}</h3>
                            <button
                                onClick={() => setShowSocialModal({ ...showSocialModal, show: false })}
                                className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
                            >
                                <span className="text-lg font-black">&times;</span>
                            </button>
                        </div>
                        <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
                            {(showSocialModal.type === "followers" ? socialData.followers : socialData.following).map((person) => (
                                <div key={person.handle} className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-[14px] transition-colors group cursor-pointer">
                                    <Link
                                        href={`/profile/${person.handle.replace('@', '')}`}
                                        onClick={() => setShowSocialModal({ ...showSocialModal, show: false })}
                                        className="flex items-center gap-3 flex-1"
                                    >
                                        <img src={person.avatar} className="w-9 h-9 rounded-xl object-cover border border-border/40" alt={person.name} />
                                        <div>
                                            <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors">{person.name}</p>
                                            <p className="text-[10px] text-foreground/30 font-bold">{person.handle}</p>
                                        </div>
                                    </Link>
                                    <button className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-secondary text-foreground/60 hover:bg-foreground hover:text-background transition-all border border-border/40">
                                        Follow
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
