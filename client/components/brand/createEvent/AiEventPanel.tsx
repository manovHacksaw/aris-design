"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  generateAiEventDetails,
  type AiEventSuggestion,
} from "@/services/ai.service";
import AiBannerPanel from "./AiBannerPanel";

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
  startImmediately?: boolean;
  endDate?: string;
  postingEndDate?: string;
}

// ── Duration parser ───────────────────────────────────────────────────────────
// Converts strings like "3 days", "48 hours", "1 week", "2 days 6 hours" → ms
function parseDurationMs(raw: string): number {
  const str = raw.toLowerCase();
  let ms = 0;
  const patterns: [RegExp, number][] = [
    [/(\d+(?:\.\d+)?)\s*week/,   7 * 24 * 3600 * 1000],
    [/(\d+(?:\.\d+)?)\s*day/,        24 * 3600 * 1000],
    [/(\d+(?:\.\d+)?)\s*hour/,            3600 * 1000],
    [/(\d+(?:\.\d+)?)\s*min/,               60 * 1000],
  ];
  for (const [re, unit] of patterns) {
    const m = str.match(re);
    if (m) ms += parseFloat(m[1]) * unit;
  }
  // fallback: if nothing matched but we got a plain number, assume hours
  if (ms === 0) {
    const plain = parseFloat(str);
    if (!isNaN(plain)) ms = plain * 3600 * 1000;
  }
  return ms;
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface AiEventPanelProps {
  brandName?: string;
  brandBio?: string;
  // Form context for banner generation
  formTitle?: string;
  formDescription?: string;
  formDomain?: string;
  formAgeGroup?: string;
  formPreferredGender?: string;
  onApplyEvent?: (eventData: Partial<FormData>) => void;
  onApplyProposals?: (proposals: Array<{ title: string; order: number }>) => void;
  onApplyImage?: (file: File, preview: string) => void;
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

const TARGET_MARKETS = [
  "Gen Z (18–24)",
  "Millennials (25–34)",
  "Adults (35–54)",
  "Seniors (55+)",
  "Students",
  "Professionals",
  "Parents",
  "Creators",
  "Athletes",
  "All audiences",
];

type TabId = "Event" | "Image";
const TABS: TabId[] = ["Event", "Image"];

// ── Small shared UI ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">
      {children}
    </p>
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

// ── Suggestion Cards Modal ────────────────────────────────────────────────────

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">{label}</span>
      <span className="text-xs font-semibold text-foreground/80">{value}</span>
    </div>
  );
}

function SuggestionModal({
  suggestions,
  eventType,
  onApply,
  onClose,
}: {
  suggestions: AiEventSuggestion[];
  eventType: "vote" | "post";
  onApply: (s: AiEventSuggestion) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="font-black text-foreground text-sm">Event Concepts</p>
              <p className="text-xs text-muted-foreground">
                {suggestions.length} testable concept{suggestions.length !== 1 ? "s" : ""} — pick one to build
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cards */}
        <div className="overflow-y-auto p-6 flex flex-col gap-5">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="bg-background border border-border/60 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors"
            >
              {/* Index + type badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="font-black text-foreground text-base leading-snug">{s.title}</p>
                </div>
                <span className={cn(
                  "shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                  eventType === "vote"
                    ? "bg-lime-400/10 text-lime-500 border-lime-500/20"
                    : "bg-orange-400/10 text-orange-500 border-orange-500/20"
                )}>
                  {eventType === "vote" ? "Vote" : "Post"}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed -mt-1">{s.description}</p>

              {/* Hypothesis */}
              <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-primary/60 mb-1">Hypothesis</p>
                <p className="text-xs text-foreground/80 leading-relaxed italic">"{s.hypothesis}"</p>
              </div>

              {/* Meta row — duration + estimated votes */}
              <div className="flex gap-6 border-t border-border/30 pt-3">
                <MetaPill label="Est. Duration" value={s.estimated_duration} />
                <MetaPill label="Est. Votes" value={s.estimated_votes} />
              </div>

              {/* Voting options (vote only) */}
              {s.voting_options && s.voting_options.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black">
                    Voting Options ({s.voting_options.length})
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {s.voting_options.map((p, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-2 bg-muted/20 border border-border/40 rounded-xl px-3 py-2"
                      >
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center mt-0.5">
                          {j + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-foreground truncate">{p.title}</p>
                          {p.content && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{p.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply */}
              <button
                onClick={() => onApply(s)}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              >
                Use This Concept
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Event Tab ─────────────────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex items-center justify-center font-black transition-all"
      >
        −
      </button>
      <span className="text-base font-black text-foreground w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex items-center justify-center font-black transition-all"
      >
        +
      </button>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function EventTab({
  onApplyEvent,
  brandName,
  brandBio,
}: {
  onApplyEvent?: AiEventPanelProps["onApplyEvent"];
  brandName?: string;
  brandBio?: string;
}) {
  const [motive, setMotive] = useState("");
  const [eventType, setEventType] = useState<"vote" | "post">("vote");
  const [decisionDomain, setDecisionDomain] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [budget, setBudget] = useState("");
  const [N, setN] = useState(1);
  const [voteOptions, setVoteOptions] = useState(4);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiEventSuggestion[] | null>(null);

  const handleGenerate = async () => {
    if (!motive.trim()) {
      toast.error("Please describe your event motive first.");
      return;
    }
    setLoading(true);
    setSuggestions(null);

    try {
      const res = await generateAiEventDetails({
        motive,
        brandName,
        brandBio,
        eventType,
        decisionDomain,
        targetMarket,
        budget,
        count: N,
        voteOptions: eventType === "vote" ? voteOptions : undefined,
      });

      if (!res.success || !res.suggestions?.length) {
        throw new Error(res.error || "No suggestions returned");
      }

      setSuggestions(res.suggestions);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate events");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (s: AiEventSuggestion) => {
    const now = new Date();
    const durationMs = parseDurationMs(s.estimated_duration);

    let endDate: string | undefined;
    let postingEndDate: string | undefined;

    if (durationMs > 0) {
      if (eventType === "post") {
        // Split: 60% posting window, 40% voting window
        const postingMs = durationMs * 0.6;
        const votingMs  = durationMs * 0.4;
        postingEndDate = toDatetimeLocal(new Date(now.getTime() + postingMs));
        endDate        = toDatetimeLocal(new Date(now.getTime() + postingMs + votingMs));
      } else {
        endDate = toDatetimeLocal(new Date(now.getTime() + durationMs));
      }
    }

    onApplyEvent?.({
      title: s.title,
      description: s.description,
      domain: decisionDomain || "",
      type: eventType,
      proposals: s.voting_options?.map((p, i) => ({ title: p.title, order: i })),
      startImmediately: true,
      endDate,
      postingEndDate,
    });
    setSuggestions(null);
    toast.success("Event concept applied — complete the details and launch!");
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Motive */}
        <div>
          <FieldLabel>Motive</FieldLabel>
          <PromptTextarea
            value={motive}
            onChange={setMotive}
            placeholder="What decision do you want your audience to help you make? e.g. 'Find out which packaging design Gen Z prefers for our new noodle launch'"
            rows={3}
          />
        </div>

        {/* Event type */}
        <div>
          <FieldLabel>Event Type</FieldLabel>
          <div className="flex gap-2">
            {(["vote", "post"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black border transition-all",
                  eventType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {t === "vote" ? "Vote Campaign" : "Post Campaign"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            {eventType === "vote"
              ? "Audience picks between fixed options — clear winner guaranteed."
              : "Creators submit content — audience votes for the best submission."}
          </p>
        </div>

        {/* Vote options count — only for vote type */}
        {eventType === "vote" && (
          <div>
            <FieldLabel>Voting Options per Event</FieldLabel>
            <Stepper value={voteOptions} min={2} max={10} onChange={setVoteOptions} label={`option${voteOptions !== 1 ? "s" : ""} per event (2–10)`} />
          </div>
        )}

        {/* Decision Domain */}
        <div>
          <FieldLabel>Decision Domain</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_DOMAINS.map((d) => (
              <button
                key={d}
                onClick={() => setDecisionDomain(decisionDomain === d ? "" : d)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  decisionDomain === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Target Market */}
        <div>
          <FieldLabel>Target Market</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_MARKETS.map((m) => (
              <button
                key={m}
                onClick={() => setTargetMarket(targetMarket === m ? "" : m)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  targetMarket === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <FieldLabel>Budget <span className="normal-case font-normal text-muted-foreground">(optional)</span></FieldLabel>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. $500, $2,000, flexible…"
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* N — number of suggestions */}
        <div>
          <FieldLabel>Suggestions (N)</FieldLabel>
          <Stepper value={N} min={1} max={6} onChange={setN} label={`concept${N !== 1 ? "s" : ""} to generate (max 6)`} />
        </div>

        <GenerateButton
          loading={loading}
          onClick={handleGenerate}
          label={`Generate ${N > 1 ? `${N} Concepts` : "Concept"}`}
        />
      </div>

      {/* Suggestion modal */}
      {suggestions && suggestions.length > 0 && (
        <SuggestionModal
          suggestions={suggestions}
          eventType={eventType}
          onApply={handleApply}
          onClose={() => setSuggestions(null)}
        />
      )}
    </>
  );
}

// ── Image Tab ─────────────────────────────────────────────────────────────────

function ImageTab({
  onApplyImage,
  formTitle,
  formDescription,
  formDomain,
  formAgeGroup,
  formPreferredGender,
  brandName,
  brandBio,
}: {
  onApplyImage?: AiEventPanelProps["onApplyImage"];
  formTitle?: string;
  formDescription?: string;
  formDomain?: string;
  formAgeGroup?: string;
  formPreferredGender?: string;
  brandName?: string;
  brandBio?: string;
}) {
  return (
    <AiBannerPanel
      title={formTitle}
      description={formDescription}
      decisionDomain={formDomain}
      ageGroup={formAgeGroup}
      preferredGender={formPreferredGender}
      brandName={brandName}
      brandBio={brandBio}
      onApplyImage={onApplyImage}
    />
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiEventPanel({
  brandName,
  brandBio,
  formTitle,
  formDescription,
  formDomain,
  formAgeGroup,
  formPreferredGender,
  onApplyEvent,
  onApplyProposals,
  onApplyImage,
}: AiEventPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("Event");

  return (
    <div className="bg-card/50 border border-border/60 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0">
          <span className="font-black text-foreground text-sm">ARIS Studio</span>
          <p className="text-xs text-muted-foreground leading-snug">
            Describe your motive — AI will suggest event concepts tailored to your brand
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
          <EventTab onApplyEvent={onApplyEvent} brandName={brandName} brandBio={brandBio} />
        )}
        {activeTab === "Image" && (
          <ImageTab
            onApplyImage={onApplyImage}
            formTitle={formTitle}
            formDescription={formDescription}
            formDomain={formDomain}
            formAgeGroup={formAgeGroup}
            formPreferredGender={formPreferredGender}
            brandName={brandName}
            brandBio={brandBio}
          />
        )}
      </div>
    </div>
  );
}
