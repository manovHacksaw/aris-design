"use client";

import FeedItem from "./FeedItem";

const FEED_DATA = [
    {
        id: 1,
        username: "alex_creative",
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80", // Cyberpunk city
        caption: "Just dropped my submission for the new Neon challenge! What do you think? ⚡️ #Aris #NeonDreams",
        reward: 0.05,
        votes: 1240,
    },
    {
        id: 2,
        username: "sarah_design",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80", // Abstract liquid
        caption: "Minimalist vibes only. 🎨 Voting helps me unlock the next tier!",
        reward: 0.05,
        votes: 856,
    },
    {
        id: 3,
        username: "tech_guru",
        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80", // Retro gaming
        caption: "The future is here. Check out this gadget review. 📱",
        reward: 0.10,
        votes: 2100,
    }
];

export default function SocialFeed() {
    return (
        <div className="pb-24 pt-4 px-4 space-y-6">
            {FEED_DATA.map((item) => (
                <FeedItem
                    key={item.id}
                    username={item.username}
                    image={item.image}
                    caption={item.caption}
                    reward={item.reward}
                    votes={item.votes}
                />
            ))}
        </div>
    );
}
