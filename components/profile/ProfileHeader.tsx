"use client";

import { ArrowLeft, Edit2 } from "lucide-react";

interface ProfileHeaderProps {
    title?: string;
    onBack?: () => void;
    onEdit?: () => void;
}

export default function ProfileHeader({ title = "Profile", onBack, onEdit }: ProfileHeaderProps) {
    return (
        <header className="sticky top-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4 md:px-8">
            <button
                onClick={onBack || (() => window.history.back())}
                className="p-2 -ml-2 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Go back"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>

            <button
                onClick={onEdit}
                className="p-2 -mr-2 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Edit profile"
            >
                <Edit2 className="w-5 h-5" />
            </button>
        </header>
    );
}
