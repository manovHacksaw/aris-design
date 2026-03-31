"use client";

import { Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "recently";
  }
}

interface DraftEvent {
  id: string;
  title: string;
  status: string;
  eventType: string;
  category?: string;
  imageUrl?: string;
  imageCid?: string;
  updatedAt: string;
  description?: string;
}

interface DraftEventCardProps {
  event: DraftEvent;
  onResume: (event: DraftEvent) => void;
  onDelete?: (id: string) => void;
}

function getCoverUrl(event: DraftEvent): string | null {
  if (event.imageUrl) return event.imageUrl;
  if (event.imageCid) return `https://gateway.pinata.cloud/ipfs/${event.imageCid}`;
  return null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  vote_only: "Vote",
  post_and_vote: "Post",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  vote_only: "bg-lime-500/15 text-lime-400 border-lime-500/25",
  post_and_vote: "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

export default function DraftEventCard({ event, onResume, onDelete }: DraftEventCardProps) {
  const coverUrl = getCoverUrl(event);

  const updatedAgo = timeAgo(event.updatedAt);

  const handleCardClick = () => onResume(event);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(event.id);
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResume(event);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-card border border-border rounded-2xl p-4 hover:border-primary/40 cursor-pointer group transition-all"
    >
      {/* Cover image */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 mb-3">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted/20 to-secondary/10">
            <span className="text-2xl font-black text-muted-foreground/20 select-none">
              {event.title?.charAt(0)?.toUpperCase() ?? "E"}
            </span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-black text-amber-400 uppercase tracking-wider backdrop-blur-sm">
            Draft
          </span>
          {EVENT_TYPE_LABELS[event.eventType] && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider backdrop-blur-sm",
                EVENT_TYPE_STYLES[event.eventType] ?? "bg-muted/20 text-muted-foreground border-border"
              )}
            >
              {EVENT_TYPE_LABELS[event.eventType]}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-black text-sm text-foreground line-clamp-2 leading-snug mb-2">
        {event.title || "Untitled Event"}
      </h3>

      {/* Category + timestamp */}
      <div className="flex items-center gap-2 mb-3">
        {event.category && (
          <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-border/60 text-[10px] font-medium text-muted-foreground">
            {event.category}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{updatedAgo}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleResume}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-black text-foreground hover:border-primary/50 hover:text-primary transition-all"
        >
          <Play className="w-3 h-3 fill-current" />
          Resume
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-xl border border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-all"
            aria-label="Delete draft"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
