"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getUserByUsername,
  getUserStatsById,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
} from "@/services/user.service";
import { useUser } from "@/context/UserContext";
import ProfileView from "@/components/profile/ProfileView";
import SidebarLayout from "@/components/home/SidebarLayout";
import { UserX } from "lucide-react";
import type { User, UserStats } from "@/types/user";

export default function UserProfilePage() {
  const params = useParams();
  const raw = (params.username as string) || "";
  const username = raw.replace(/^@/, "").toLowerCase();

  const { user: currentUser } = useUser();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setIsLoading(true);
    setNotFound(false);

    getUserByUsername(username)
      .then(async (u) => {
        setProfileUser(u);
        const [s, frs, fwg] = await Promise.allSettled([
          getUserStatsById(u.id),
          getFollowers(u.id),
          getFollowing(u.id),
        ]);
        if (s.status === "fulfilled") setStats(s.value);
        if (frs.status === "fulfilled") setFollowers(frs.value);
        if (fwg.status === "fulfilled") setFollowing(fwg.value);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [username]);

  const isFollowing = !!(currentUser && followers.some((f) => f.id === currentUser.id));

  const handleToggleFollow = useCallback(async () => {
    if (!profileUser || !currentUser || isFollowLoading) return;
    setIsFollowLoading(true);

    if (isFollowing) {
      setFollowers((prev) => prev.filter((f) => f.id !== currentUser.id));
    } else {
      setFollowers((prev) => [...prev, currentUser]);
    }

    try {
      if (isFollowing) await unfollowUser(profileUser.id);
      else await followUser(profileUser.id);
    } catch {
      if (isFollowing) setFollowers((prev) => [...prev, currentUser]);
      else setFollowers((prev) => prev.filter((f) => f.id !== currentUser.id));
    } finally {
      setIsFollowLoading(false);
    }
  }, [profileUser, currentUser, isFollowing, isFollowLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <SidebarLayout>
          <main className="w-full pt-6 lg:pt-10 pb-24 md:pb-12 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left column skeleton */}
              <div className="flex-1 min-w-0 space-y-6">
                {/* Identity card */}
                <div className="bg-foreground/[0.02] border border-border rounded-[24px] p-6 md:p-8 animate-pulse">
                  <div className="flex flex-wrap items-start gap-5 mb-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-foreground/[0.07] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                      <div className="h-8 w-48 bg-foreground/[0.07] rounded-lg" />
                      <div className="h-3 w-28 bg-foreground/[0.05] rounded-full" />
                      <div className="flex gap-2">
                        <div className="h-6 w-28 bg-foreground/[0.05] rounded-full" />
                        <div className="h-6 w-24 bg-foreground/[0.05] rounded-full" />
                      </div>
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-4 pt-5 border-t border-border/50">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-2.5 w-12 bg-foreground/[0.05] rounded-full" />
                        <div className="h-6 w-8 bg-foreground/[0.07] rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content grid skeleton */}
                <div className="space-y-4 animate-pulse">
                  {/* Tab bar */}
                  <div className="flex gap-2">
                    <div className="h-9 w-20 bg-foreground/[0.07] rounded-xl" />
                    <div className="h-9 w-20 bg-foreground/[0.05] rounded-xl" />
                    <div className="h-9 w-20 bg-foreground/[0.05] rounded-xl" />
                  </div>
                  {/* Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-[3/4] rounded-[20px] bg-foreground/[0.06]" style={{ animationDelay: `${i * 60}ms` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right sidebar skeleton */}
              <div className="lg:w-[280px] shrink-0 space-y-4 animate-pulse">
                <div className="h-[180px] rounded-[20px] bg-foreground/[0.06]" />
                <div className="h-[160px] rounded-[20px] bg-foreground/[0.05]" />
                <div className="h-[140px] rounded-[20px] bg-foreground/[0.04]" />
              </div>
            </div>
          </main>
        </SidebarLayout>
      </div>
    );
  }

  if (notFound || !profileUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <UserX className="w-16 h-16 text-foreground/20" />
        <h2 className="text-2xl font-black text-foreground tracking-tighter">User not found</h2>
        <p className="text-sm text-foreground/40 font-medium">@{username} doesn't exist on Aris.</p>
      </div>
    );
  }

  const isOwn = currentUser?.id === profileUser.id || currentUser?.username === username;

  return (
    <ProfileView
      isOwnProfile={isOwn}
      user={profileUser}
      stats={stats}
      followers={followers}
      following={following}
      isFollowing={isFollowing}
      isFollowLoading={isFollowLoading}
      onToggleFollow={handleToggleFollow}
    />
  );
}
