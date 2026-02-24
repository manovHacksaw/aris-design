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

import type { User, UserStats } from "@/types/user";
import { formatCount } from "@/types/user";

interface ProfileViewProps {
  isOwnProfile?: boolean;
  user: User | null;
  stats: UserStats | null;
  followers: User[];
  following: User[];
}

export default function ProfileView({
  isOwnProfile = false,
  user,
  stats,
  followers,
  following,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState("posts");
  const [showSocialModal, setShowSocialModal] = useState<{
    show: boolean;
    type: "followers" | "following";
  }>({ show: false, type: "followers" });

  const tabs = [
    { id: "posts", label: "Posts", icon: Grid },
    { id: "votes", label: "Votes", icon: ThumbsUp },
    { id: "rewards", label: "Rewards", icon: Award },
  ];

  const socialList =
    showSocialModal.type === "followers" ? followers : following;

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";

  const websiteHandle = user?.username || user?.displayName?.toLowerCase().replace(/\s/g, "") || "";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <SidebarLayout>
        <main className="flex-1 pb-24 w-full">
          {/* Header Image */}
          <div className="h-40 md:h-56 bg-card w-full relative overflow-hidden md:rounded-[22px] md:mx-4 md:mt-4 md:w-auto border-b md:border border-border/40 group">
            <div
              className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary to-background"
              style={
                user?.avatarUrl
                  ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.3 }
                  : {}
              }
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
              stats={stats}
              followers={followers}
              following={following}
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
                  {user?.bio || "No bio yet."}
                </p>
                <div className="space-y-3 pt-4 border-t border-border/30">
                  {[
                    { label: "Joined", value: joinedDate },
                    { label: "Wallet", value: user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "—" },
                    websiteHandle
                      ? { label: "Profile", value: `aris.xyz/@${websiteHandle}`, isLink: true }
                      : null,
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <div key={item!.label} className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-foreground/30">{item!.label}</span>
                        {item!.isLink ? (
                          <a href="#" className="text-primary hover:underline normal-case font-mono">
                            {item!.value}
                          </a>
                        ) : (
                          <span className="text-foreground/60 font-mono normal-case">{item!.value}</span>
                        )}
                      </div>
                    ))}
                </div>

                {/* Social links */}
                {user?.socialLinks && Object.values(user.socialLinks).some(Boolean) && (
                  <div className="pt-4 mt-4 border-t border-border/30 flex flex-wrap gap-2">
                    {user.socialLinks.twitter && (
                      <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-black text-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest border border-border/30 px-3 py-1.5 rounded-lg">
                        Twitter
                      </a>
                    )}
                    {user.socialLinks.instagram && (
                      <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-black text-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest border border-border/30 px-3 py-1.5 rounded-lg">
                        Instagram
                      </a>
                    )}
                    {user.socialLinks.website && (
                      <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-black text-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest border border-border/30 px-3 py-1.5 rounded-lg">
                        Website
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Activity Cards */}
              <div className="hidden lg:block">
                <ProfileActivity isOwnProfile={isOwnProfile} user={user} stats={stats} />
              </div>
            </aside>

            {/* Main Content: Tabs + Feed */}
            <div className="lg:col-span-8 xl:col-span-9 px-4 md:px-0">
              <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="min-h-[400px] mt-6">
                {activeTab === "posts" && <ProfilePosts />}
                {activeTab === "votes" && <ProfileVotes />}
                {activeTab === "rewards" && <ProfileRewards />}
              </div>
            </div>
          </div>

          {/* Mobile Activity */}
          <div className="lg:hidden px-4 mt-8">
            <h3 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-4">
              Activity & Progress
            </h3>
            <ProfileActivity isOwnProfile={isOwnProfile} user={user} stats={stats} />
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
            onClick={() => setShowSocialModal((s) => ({ ...s, show: false }))}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground capitalize tracking-tight">
                {showSocialModal.type}{" "}
                <span className="text-foreground/30 font-bold">
                  ({socialList.length})
                </span>
              </h3>
              <button
                onClick={() => setShowSocialModal((s) => ({ ...s, show: false }))}
                className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
              >
                <span className="text-lg font-black">&times;</span>
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {socialList.length === 0 ? (
                <p className="text-center text-sm text-foreground/30 font-medium py-8">
                  No {showSocialModal.type} yet
                </p>
              ) : (
                socialList.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-[14px] transition-colors group cursor-pointer"
                  >
                    <Link
                      href={`/profile/${person.username || person.id}`}
                      onClick={() => setShowSocialModal((s) => ({ ...s, show: false }))}
                      className="flex items-center gap-3 flex-1"
                    >
                      {person.avatarUrl ? (
                        <img
                          src={person.avatarUrl}
                          className="w-9 h-9 rounded-xl object-cover border border-border/40"
                          alt={person.displayName || ""}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <span className="text-primary text-sm font-black uppercase">
                            {(person.displayName || person.username || "?").charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors">
                          {person.displayName || person.username || "Unknown"}
                        </p>
                        <p className="text-[10px] text-foreground/30 font-bold">
                          {person.username ? `@${person.username}` : ""}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
