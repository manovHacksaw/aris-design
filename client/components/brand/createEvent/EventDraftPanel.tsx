"use client";

import DraftEventCard from "./DraftEventCard";
import CreateNewCard from "./CreateNewCard";
import { FileEdit } from "lucide-react";

interface EventDraftPanelProps {
  drafts: any[];
  loading: boolean;
  onResume: (event: any) => void;
  onCreateNew: () => void;
  onDeleteDraft?: (id: string) => void;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 bg-background/50 border border-border/40 rounded-2xl p-3 animate-pulse w-full">
      <div className="w-[72px] h-[72px] shrink-0 rounded-[12px] bg-muted/40" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted/40 rounded w-1/3" />
        <div className="h-3 bg-muted/30 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function EventDraftPanel({
  drafts,
  loading,
  onResume,
  onCreateNew,
  onDeleteDraft,
}: EventDraftPanelProps) {
  return (
    <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-[28px] p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-medium text-xl sm:text-2xl text-foreground flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
               <FileEdit className="w-4 h-4 text-primary" />
            </span>
            Event Drafts
          </h2>
          <p className="text-sm text-foreground/50 mt-1 ml-1">
            Continue where you left off or start fresh
          </p>
        </div>
      </div>

      {/* Grid of draft cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Create new — always first */}
        <CreateNewCard onClick={onCreateNew} />

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          drafts.map((draft) => (
            <DraftEventCard
              key={draft.id}
              event={draft}
              onResume={onResume}
              onDelete={onDeleteDraft}
            />
          ))
        )}
      </div>

      {/* Empty state hint (no drafts, not loading) */}
      {!loading && drafts.length === 0 && (
        <p className="mt-5 text-xs text-muted-foreground/60 text-center font-medium">
          No drafts found — tap the card above to create your first event.
        </p>
      )}
    </div>
  );
}
