"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { getFollowers, getFollowing } from "@/services/user.service";
import ProfileView from "@/components/profile/ProfileView";
import { Loader2 } from "lucide-react";
import type { User } from "@/types/user";

export default function ProfilePage() {
  const { user, stats, isLoading } = useUser();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchSocial = async () => {
      try {
        const [fUsers, fFollowers] = await Promise.all([
          getFollowing(user.id),
          getFollowers(user.id)
        ]);
        
        setFollowers(fFollowers);
        
        // Combine followed users with brand subscriptions
        let combinedFollowing = [...fUsers];
        try {
          // Dynamic import to avoid SSR issues if any, though this is "use client"
          const { getMySubscriptions } = await import("@/services/subscription.service");
          const brandSubs = await getMySubscriptions();
          
          // Map brand subs to User-like objects for ProfileView
          const brandUsers = brandSubs
            .filter(sub => sub.brandId || sub.id)
            .map(sub => ({
              id: sub.brandId ?? sub.id,
              displayName: sub.brand?.name || "Brand",
              username: sub.brand?.slug || sub.brand?.name || "brand",
              avatarUrl: sub.brand?.logo || sub.brand?.logoUrl || "",
              role: "BRAND" as any,
            } as User));
          
          combinedFollowing = [...combinedFollowing, ...brandUsers];
        } catch (e) {
          console.error("Error fetching brand subscriptions:", e);
        }
        
        setFollowing(combinedFollowing);
      } catch (err) {
        console.error("Error fetching social data:", err);
      }
    };

    fetchSocial();
  }, [user?.id]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProfileView
      isOwnProfile={true}
      user={user}
      stats={stats}
      followers={followers}
      following={following}
    />
  );
}
