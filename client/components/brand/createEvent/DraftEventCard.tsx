"use client";

import { Trash2, Play, CalendarClock } from "lucide-react";
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
  vote_only: "bg-lime-500/10 text-lime-500 border-lime-500/20",
  post_and_vote: "bg-orange-500/10 text-orange-500 border-orange-500/20",
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
      className="flex items-center gap-3.5 bg-background border border-border/60 rounded-2xl p-3 cursor-pointer group hover:border-primary/40 hover:shadow-sm hover:shadow-primary/5 transition-all w-full"
    >
      {/* Cover image thumbnail */}
      <div className="relative w-[72px] h-[72px] shrink-0 rounded-[12px] overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 border border-border/40">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl font-black text-muted-foreground/30 select-none">
              {event.title?.charAt(0)?.toUpperCase() ?? "E"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">
            Draft
          </span>
          {EVENT_TYPE_LABELS[event.eventType] && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest leading-none",
                EVENT_TYPE_STYLES[event.eventType] ?? "bg-muted/10 text-muted-foreground border-border/50"
              )}
            >
              {EVENT_TYPE_LABELS[event.eventType]}
            </span>
          )}
          {event.category && (
            <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-border/40 text-[9px] font-bold text-muted-foreground uppercase tracking-wider leading-none truncate max-w-[80px]">
              {event.category}
            </span>
          )}
        </div>
        
        <h3 className="font-bold text-sm text-foreground truncate pr-2 group-hover:text-primary transition-colors">
          {event.title || "Untitled Event"}
        </h3>
        
        <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground/60">
          <CalendarClock className="w-3 h-3" />
          <span className="text-[10px] font-medium">{updatedAgo}</span>
        </div>
      </div>

      {/* Actions (visible on hover or always on touch devices via media queries conceptually) */}
      <div className="flex items-center gap-1.5 pr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={handleResume}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20"
        >
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
            aria-label="Delete draft"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
