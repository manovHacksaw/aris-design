"use client";

import ProfileView from "@/components/profile/ProfileView";
import { useParams } from "next/navigation";

const MOCK_USERS: Record<string, any> = {
    pixelking: {
        name: "PixelKing",
        handle: "@pixelking",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop",
        headerImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80",
        bio: "Digital artist and voxel enthusiast. Building the future of 3D assets. Creator of the 'Deep Sea' series.",
        stats: {
            posts: "156",
            votes: "84.2k",
            xp: "12,450",
            earned: "$1,240"
        },
        social: {
            followers: "12k",
            following: "240"
        }
    },
    neonmuse: {
        name: "NeonMuse",
        handle: "@neonmuse",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
        headerImage: "https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=1200&q=80",
        bio: "Cyberpunk photographer and light chaser. Capturing the neon glow of futuristic cities. Exploring the boundary between reality and digital dreams.",
        stats: {
            posts: "82",
            votes: "45.1k",
            xp: "8,900",
            earned: "$850"
        },
        social: {
            followers: "8.5k",
            following: "1.2k"
        }
    },
    voxcraft: {
        name: "VoxCraft",
        handle: "@voxcraft",
        avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop",
        headerImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80",
        bio: "Software architect and generative art fan. Coding experiences that inspire and connect. Bridging technology and creativity.",
        stats: {
            posts: "312",
            votes: "128k",
            xp: "24,000",
            earned: "$5,600"
        },
        social: {
            followers: "42k",
            following: "890"
        }
    }
};

export default function UserProfile() {
    const params = useParams();
    const username = (params.username as string)?.toLowerCase().replace("@", "");

    const user = MOCK_USERS[username] || MOCK_USERS.pixelking; // Fallback to pixelking for demo

    return <ProfileView isOwnProfile={false} user={user} />;
}
