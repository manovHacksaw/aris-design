"use client";

import { Plus } from "lucide-react";

interface CreateNewCardProps {
  onClick: () => void;
}

export default function CreateNewCard({ onClick }: CreateNewCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 bg-primary/5 border border-primary/20 hover:border-primary/40 hover:bg-primary/10 rounded-2xl p-3 cursor-pointer group transition-all w-full text-left"
    >
      <div className="w-[72px] h-[72px] shrink-0 rounded-[12px] bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
        <Plus className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0 py-1">
        <h3 className="font-bold text-sm text-primary mb-1">Start Fresh</h3>
        <p className="text-[10px] text-primary/70 leading-relaxed max-w-[140px]">
          Create a beautifully designed event from scratch.
        </p>
      </div>
    </button>
  );
}
