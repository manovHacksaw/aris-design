"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  CheckSquare,
  Square,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateAiProposals, generateAiImage } from "@/services/ai.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  type: "post" | "vote";
  title: string;
  description: string;
  domain: string;
  maxParticipants: string;
  topPrize: string;
  leaderboardPool: string;
  proposals: Array<{ title: string; order: number }>;
  tagline?: string;
}

interface AiEventPanelProps {
  onApplyEvent?: (eventData: Partial<FormData>) => void;
  onApplyProposals?: (proposals: Array<{ title: string; order: number }>) => void;
  onApplyImage?: (imageUrl: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVENT_DOMAINS = [
  "UI/UX Design",
  "Marketing",
  "Branding",
  "Photography",
  "Copywriting",
  "Video & Reels",
  "Fashion",
  "Food & Beverage",
  "Tech & Gaming",
  "Health & Wellness",
  "Music & Arts",
];

type TabId = "Event" | "Proposals" | "Image";
const TABS: TabId[] = ["Event", "Proposals", "Image"];

const IMAGE_PRESETS = [
  "Event Banner",
  "Product Showcase",
  "Abstract Background",
  "Bold Typography",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div className="flex gap-1.5 px-6 pb-4">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-black transition-all",
            active === tab
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function GenerateButton({
  loading,
  onClick,
  label = "Generate",
}: {
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="bg-primary text-primary-foreground w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {loading ? "Generating…" : label}
    </button>
  );
}

function PromptTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-primary/50 transition-colors"
    />
  );
}

// ── Event Tab ─────────────────────────────────────────────────────────────────

interface GeneratedEvent {
  title: string;
  description: string;
  domain: string;
  type: "post" | "vote";
  proposals?: Array<{ title: string; order: number }>;
}

function EventTab({ onApplyEvent }: { onApplyEvent?: AiEventPanelProps["onApplyEvent"] }) {
  const [prompt, setPrompt] = useState("");
  const [domain, setDomain] = useState("");
  const [eventType, setEventType] = useState<"vote" | "post">("vote");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedEvent | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your event idea first.");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      // Derive a title from the first sentence / up to 60 chars of the prompt
      const derivedTitle =
        prompt.split(/[.\n]/)[0].trim().slice(0, 60) ||
        "My New Event";

      let proposals: Array<{ title: string; order: number }> | undefined;

      if (eventType === "vote") {
        const res = await generateAiProposals({
          title: derivedTitle,
          description: prompt,
          category: domain || "General",
          count: 4,
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to generate proposals");
        }

        proposals = (res.proposals ?? []).map((p, i) => ({
          title: p.title,
          order: i + 1,
        }));
      }

      setResult({
        title: derivedTitle,
        description: prompt,
        domain: domain || "",
        type: eventType === "vote" ? "vote" : "post",
        proposals,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate event");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyEvent?.({
      title: result.title,
      description: result.description,
      domain: result.domain,
      type: result.type,
      proposals: result.proposals,
    });
    toast.success("Event applied to form!");
  };

  return (
    <div className="flex flex-col gap-4">
      <PromptTextarea
        value={prompt}
        onChange={setPrompt}
        placeholder="Describe your event idea…"
        rows={3}
      />

      {/* Domain pills */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Domain</p>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(domain === d ? "" : d)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                domain === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Event type toggle */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Event Type</p>
        <div className="flex gap-2">
          {(["vote", "post"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEventType(t)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-black border transition-all",
                eventType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {t === "vote" ? "Vote Campaign" : "Post Campaign"}
            </button>
          ))}
        </div>
      </div>

      <GenerateButton loading={loading} onClick={handleGenerate} label="Generate Event" />

      {/* Result preview */}
      {result && (
        <div className="bg-background border border-border/60 rounded-xl p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">
              Title
            </p>
            <p className="text-sm font-black text-foreground">{result.title}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-0.5">
              Description
            </p>
            <p className="text-xs text-muted-foreground line-clamp-3">{result.description}</p>
          </div>
          {result.domain && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary">
                {result.domain}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-border text-[10px] font-black text-muted-foreground capitalize">
                {result.type}
              </span>
            </div>
          )}
          {result.proposals && result.proposals.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black mb-1.5">
                Voting Options ({result.proposals.length})
              </p>
              <div className="flex flex-col gap-1">
                {result.proposals.map((p) => (
                  <div
                    key={p.order}
                    className="flex items-center gap-2 text-xs text-foreground/80"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                      {p.order}
                    </span>
                    {p.title}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black transition-opacity hover:opacity-90"
          >
            Apply to Form
          </button>
        </div>
      )}
    </div>
  );
}

// ── Proposals Tab ─────────────────────────────────────────────────────────────

function ProposalsTab({
  onApplyProposals,
}: {
  onApplyProposals?: AiEventPanelProps["onApplyProposals"];
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<Array<{ title: string; order: number }>>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you need voting options for.");
      return;
    }
    setLoading(true);
    setProposals([]);
    setSelected(new Set());

    try {
      const res = await generateAiProposals({
        title: prompt,
        description: prompt,
        category: "General",
        count: 6,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to generate proposals");
      }

      const mapped = (res.proposals ?? []).map((p, i) => ({
        title: p.title,
        order: i + 1,
      }));
      setProposals(mapped);
      setSelected(new Set(mapped.map((p) => p.order)));
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate proposals");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (order: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      return next;
    });
  };

  const handleApplyAll = () => {
    const toApply = proposals
      .filter((p) => selected.has(p.order))
      .map((p, i) => ({ title: p.title, order: i + 1 }));

    if (toApply.length === 0) {
      toast.error("Select at least one option to apply.");
      return;
    }

    onApplyProposals?.(toApply);
    toast.success(`${toApply.length} voting option${toApply.length !== 1 ? "s" : ""} applied!`);
  };

  return (
    <div className="flex flex-col gap-4">
      <PromptTextarea
        value={prompt}
        onChange={setPrompt}
        placeholder="Describe what you need voting options for…"
        rows={3}
      />

      <p className="text-xs text-muted-foreground/70 -mt-2">
        Works best if you've already set an event title in the form.
      </p>

      <GenerateButton loading={loading} onClick={handleGenerate} label="Generate Options" />

      {proposals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground font-medium">
            {proposals.length} options generated — select the ones to apply
          </p>
          {proposals.map((p) => {
            const isSelected = selected.has(p.order);
            return (
              <button
                key={p.order}
                onClick={() => toggleSelect(p.order)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all",
                  isSelected
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-border/80"
                )}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <Square className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium">{p.title}</span>
              </button>
            );
          })}

          <button
            onClick={handleApplyAll}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black mt-1 transition-opacity hover:opacity-90"
          >
            Apply Selected ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}

// ── Image Tab ─────────────────────────────────────────────────────────────────

function ImageTab({ onApplyImage }: { onApplyImage?: AiEventPanelProps["onApplyImage"] }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      toast.error("Please describe the image you want.");
      return;
    }
    setLoading(true);
    setImageUrl(null);

    try {
      const res = await generateAiImage(finalPrompt);

      if (!res.success || !res.url) {
        throw new Error(res.error || "Image generation failed");
      }

      setImageUrl(res.url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  const handleUseAsBanner = () => {
    if (!imageUrl) return;
    onApplyImage?.(imageUrl);
    toast.success("Banner image applied!");
  };

  return (
    <div className="flex flex-col gap-4">
      <PromptTextarea
        value={prompt}
        onChange={setPrompt}
        placeholder="Describe the image you want…"
        rows={3}
      />

      {/* Quick presets */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Quick presets</p>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setPrompt(preset)}
              className="px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <GenerateButton loading={loading} onClick={handleGenerate} label="Generate Image" />

      {imageUrl && (
        <div className="flex flex-col gap-3">
          <div className="aspect-video rounded-xl overflow-hidden border border-border/60">
            <img
              src={imageUrl}
              alt="AI generated banner"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={handleUseAsBanner}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          >
            <ImageIcon className="w-4 h-4" />
            Use as Banner
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiEventPanel({
  onApplyEvent,
  onApplyProposals,
  onApplyImage,
}: AiEventPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("Event");

  return (
    <div className="bg-card/50 border border-border/60 rounded-[24px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0">
          <span className="font-black text-foreground text-sm">ARIS Studio</span>
          <p className="text-xs text-muted-foreground leading-snug">
            Generate events, voting options, or banner images with AI
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="pt-4">
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {activeTab === "Event" && (
          <EventTab onApplyEvent={onApplyEvent} />
        )}
        {activeTab === "Proposals" && (
          <ProposalsTab onApplyProposals={onApplyProposals} />
        )}
        {activeTab === "Image" && (
          <ImageTab onApplyImage={onApplyImage} />
        )}
      </div>
    </div>
  );
}
