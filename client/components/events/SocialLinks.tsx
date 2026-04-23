"use client";

import React, { useMemo } from "react";
import { Twitter, Instagram, Globe, MessageSquare } from "lucide-react";

const SOCIAL_SLOTS = [
    { key: "twitter", label: "Twitter", icon: <Twitter className="w-3.5 h-3.5" /> },
    { key: "instagram", label: "Instagram", icon: <Instagram className="w-3.5 h-3.5" /> },
    { key: "discord", label: "Discord", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: "website", label: "Website", icon: <Globe className="w-3.5 h-3.5" /> },
];

interface SocialLinksProps {
    links?: any;
    eventId?: string;
    variant?: 'full' | 'compact';
}

export function SocialLinks({ links, eventId, variant = 'full' }: SocialLinksProps) {
    const parsedLinks = useMemo(() => {
        if (!links) return {};
        if (typeof links === 'string') {
            try {
                return JSON.parse(links);
            } catch {
                return {};
            }
        }
        return links;
    }, [links]);

    const trackLink = (platform: string) => {
        if (!eventId) return;
        fetch(`/api/analytics/events/${eventId}/click`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                target: platform === 'website' ? 'website' : 'social',
                platform,
            }),
        }).catch(() => { });
    };

    const activeSlots = SOCIAL_SLOTS.filter(slot => parsedLinks[slot.key]);
    if (activeSlots.length === 0) return null;

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-1">
                {activeSlots.map(({ key, label, icon }) => (
                    <a
                        key={key}
                        href={parsedLinks[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        onClick={() => trackLink(key)}
                        className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
                    >
                        {icon}
                    </a>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {activeSlots.map(({ key, label, icon }) => (
                <a
                    key={key}
                    href={parsedLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackLink(key)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest"
                >
                    {icon}
                    <span>{label}</span>
                </a>
            ))}
        </div>
    );
}
