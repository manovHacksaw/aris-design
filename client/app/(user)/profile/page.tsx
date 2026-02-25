"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { getFollowers, getFollowing } from "@/services/user.service";
import { ProfileView } from "@/components/profile/ProfileView";
import SidebarLayout from "@/components/home/SidebarLayout";
import BottomNav from "@/components/BottomNav";
import { Loader2 } from "lucide-react";
import type { User } from "@/types/user";

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    getFollowers(user.id).then(setFollowers).catch(() => {});
    getFollowing(user.id).then(setFollowing).catch(() => {});
  }, [user?.id]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SidebarLayout>
        <main className="flex-1 pb-24 md:pb-8">
          <ProfileView
            user={user}
            isOwner={true}
            followersCount={followers.length}
            followingCount={following.length}
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
