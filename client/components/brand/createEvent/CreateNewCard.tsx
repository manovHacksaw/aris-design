"use client";

import { PlusCircle } from "lucide-react";

interface CreateNewCardProps {
  onClick: () => void;
}

export default function CreateNewCard({ onClick }: CreateNewCardProps) {
  return (
    <button
      onClick={onClick}
      className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-4 cursor-pointer group transition-all flex flex-col items-center justify-center gap-3 min-h-[200px] w-full text-left"
    >
      <PlusCircle className="w-10 h-10 text-primary/40 group-hover:text-primary transition-colors" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-black text-sm text-foreground">New Event</span>
        <span className="text-xs text-muted-foreground">Start from scratch</span>
      </div>
    </button>
  );
}
