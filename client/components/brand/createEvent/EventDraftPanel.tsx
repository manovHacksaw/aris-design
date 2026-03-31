"use client";

import DraftEventCard from "./DraftEventCard";
import CreateNewCard from "./CreateNewCard";

interface EventDraftPanelProps {
  drafts: any[];
  loading: boolean;
  onResume: (event: any) => void;
  onCreateNew: () => void;
  onDeleteDraft?: (id: string) => void;
}

function SkeletonCard() {
  return (
    <div className="min-w-[220px] max-w-[220px] shrink-0 bg-card border border-border rounded-2xl p-4 animate-pulse">
      <div className="aspect-video rounded-xl bg-muted/40 mb-3" />
      <div className="h-4 bg-muted/40 rounded-lg mb-2 w-3/4" />
      <div className="h-3 bg-muted/30 rounded-lg mb-3 w-1/2" />
      <div className="h-8 bg-muted/30 rounded-xl" />
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
    <div className="bg-card/50 border border-border/60 rounded-[24px] p-6">
      {/* Header */}
      <div className="flex flex-col gap-0.5 mb-5">
        <h2 className="font-black text-lg text-foreground">Event Drafts</h2>
        <p className="text-sm text-muted-foreground">
          Continue where you left off or start fresh
        </p>
      </div>

      {/* Scrollable card row */}
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {/* Create new — always first */}
        <div className="min-w-[220px] max-w-[220px] shrink-0">
          <CreateNewCard onClick={onCreateNew} />
        </div>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          drafts.map((draft) => (
            <div key={draft.id} className="min-w-[220px] max-w-[220px] shrink-0">
              <DraftEventCard
                event={draft}
                onResume={onResume}
                onDelete={onDeleteDraft}
              />
            </div>
          ))
        )}
      </div>

      {/* Empty state hint (no drafts, not loading) */}
      {!loading && drafts.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground/60 text-center">
          No drafts yet — click the card above to create your first event.
        </p>
      )}
    </div>
  );
}
