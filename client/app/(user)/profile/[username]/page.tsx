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
import { Loader2, UserX } from "lucide-react";
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

    // Optimistic update
    if (isFollowing) {
      setFollowers((prev) => prev.filter((f) => f.id !== currentUser.id));
    } else {
      setFollowers((prev) => [...prev, currentUser]);
    }

    try {
      if (isFollowing) {
        await unfollowUser(profileUser.id);
      } else {
        await followUser(profileUser.id);
      }
    } catch {
      // Revert on error
      if (isFollowing) {
        setFollowers((prev) => [...prev, currentUser]);
      } else {
        setFollowers((prev) => prev.filter((f) => f.id !== currentUser.id));
      }
    } finally {
      setIsFollowLoading(false);
    }
  }, [profileUser, currentUser, isFollowing, isFollowLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
