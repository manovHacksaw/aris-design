"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getUserByUsername,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
} from "@/services/user.service";
import { useUser } from "@/context/UserContext";
import { ProfileView } from "@/components/profile/ProfileView";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Loader2, UserX } from "lucide-react";
import type { User } from "@/types/user";

export default function UserProfilePage() {
  const params = useParams();
  const raw = (params.username as string) || "";
  const username = raw.replace(/^@/, "").toLowerCase();

  const { user: currentUser } = useUser();

  const [profileUser, setProfileUser] = useState<User | null>(null);
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
        const [frs, fwg] = await Promise.allSettled([
          getFollowers(u.id),
          getFollowing(u.id),
        ]);
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
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SidebarLayout>
        <main className="flex-1 pb-24 md:pb-8">
          <ProfileView
            user={profileUser}
            isOwner={isOwn}
            followersCount={followers.length}
            followingCount={following.length}
            isFollowing={isFollowing}
            onFollowToggle={handleToggleFollow}
            followersList={followers}
            followingList={following}
          />
        </main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </SidebarLayout>
    </div>
  );
}
