"use client";

import ProfileView from "@/components/profile/ProfileView";

export default function Profile() {
    const user = {
        name: "Jon Doe",
        handle: "@jondoe",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
        headerImage: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200&q=80",
        bio: "UI designer, mobile ui, ux designer. Creating digital experiences for the next generation. Passionate about creating intuitive and beautiful interfaces. Currently working on Aris to revolutionize social engagement. Love photography and traveling in my free time.",
        stats: {
            posts: "42",
            votes: "12.4k",
            xp: "4,820",
            earned: "$320"
        },
        social: {
            followers: "1,240",
            following: "542"
        }
    };

    return <ProfileView isOwnProfile={true} user={user} />;
}
