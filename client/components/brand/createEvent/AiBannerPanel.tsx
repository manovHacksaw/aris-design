"use client";

import { useState } from "react";
import { Sparkles, Loader2, Image as ImageIcon, Check, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateAiBannerPrompts } from "@/services/ai.service";
import { generateImage, base64ToObjectUrl, base64ToFile } from "@/services/image-generation.service";
import { useUser } from "@/context/UserContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AiBannerPanelProps {
  // Derived from the event form — not asked again
  title?: string;
  description?: string;
  decisionDomain?: string;
  ageGroup?: string;
  preferredGender?: string;
  brandName?: string;
  brandBio?: string;
  onApplyImage?: (file: File, preview: string) => void;
  onClose?: () => void;
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

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
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary flex items-center justify-center font-black transition-all bg-secondary/20"
      >
        −
      </button>
      <span className="text-[14px] sm:text-base font-black text-foreground w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary flex items-center justify-center font-black transition-all bg-secondary/20"
      >
        +
      </button>
      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

// ── Prompt Selection ──────────────────────────────────────────────────────────

function PromptSelector({
  prompts,
  selected,
  onSelect,
  onConfirm,
  generating,
}: {
  prompts: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  onConfirm: () => void;
  generating: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-black text-foreground mb-0.5">
          {prompts.length} Prompt{prompts.length !== 1 ? "s" : ""} Ready
        </p>
        <p className="text-xs text-muted-foreground">
          Select one — we&apos;ll render a 16:9 banner from it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {prompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              "text-left w-full rounded-2xl border px-4 py-3.5 transition-all text-xs leading-relaxed",
              selected === i
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5 transition-all",
                  selected === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground"
                )}
              >
                {selected === i ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span>{p}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={selected === null || generating}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        {generating ? "Generating Banner…" : "Generate Banner"}
      </button>
    </div>
  );
}

// ── Image Preview ─────────────────────────────────────────────────────────────

function ImagePreview({
  imageUrl,
  onUse,
  onBack,
}: {
  imageUrl: string;
  onUse: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Your banner is ready. Apply it or pick a different prompt.
      </p>
      <div className="aspect-video rounded-2xl overflow-hidden border border-border/60">
        <img src={imageUrl} alt="AI generated banner" className="w-full h-full object-cover" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-border text-xs font-black text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        >
          ← Change Prompt
        </button>
        <button
          onClick={onUse}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Use as Banner
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiBannerPanel({
  title = "",
  description = "",
  decisionDomain = "",
  ageGroup = "",
  preferredGender = "",
  brandName = "",
  brandBio = "",
  onApplyImage,
  onClose,
}: AiBannerPanelProps) {
  // The only inputs the user provides here
  const [theme, setTheme] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [N, setN] = useState(3);

  // Flow
  type Step = "inputs" | "pick" | "preview";
  const [step, setStep] = useState<Step>("inputs");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const { user } = useUser();

  // Gate: form must have title, description, and domain filled
  const isFormReady =
    title.trim().length > 0 &&
    description.trim().length >= 20 &&
    decisionDomain.trim().length > 0;

  // Build a combined brand identity string from brand props + form context
  const brandIdentity = [
    brandName && `Brand: ${brandName}`,
    brandBio && `Style: ${brandBio}`,
    ageGroup && ageGroup !== "All Ages" && `Age: ${ageGroup}`,
    preferredGender && preferredGender !== "All" && `Gender: ${preferredGender}`,
  ]
    .filter(Boolean)
    .join(", ");

  const handleGeneratePrompts = async () => {
    setLoadingPrompts(true);
    setPrompts([]);
    setSelectedPrompt(null);

    try {
      const res = await generateAiBannerPrompts({
        title,
        description,
        theme,
        decisionDomain,
        targetMarket: targetMarket || (ageGroup !== "All Ages" ? ageGroup : "") || "General audience",
        brandIdentity,
        count: N,
      });

      if (!res.success || !res.prompts?.length) {
        throw new Error(res.error || "No prompts returned");
      }

      setPrompts(res.prompts);
      setStep("pick");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate banner prompts");
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleGenerateImage = async () => {
    if (selectedPrompt === null) return;
    setLoadingImage(true);
    setImageUrl(null);

    try {
      const brandId = user?.ownedBrands?.[0]?.id ?? user?.id ?? "";
      const res = await generateImage(prompts[selectedPrompt], brandId, "brand");
      if (!res.success || !res.image) {
        throw new Error(res.error || "Image generation failed");
      }
      const objectUrl = base64ToObjectUrl(res.image.data, res.image.mimeType);
      const file = base64ToFile(res.image.data, res.image.mimeType, `banner-${Date.now()}.png`);
      setImageUrl(objectUrl);
      setImageFile(file);
      setStep("preview");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate banner image");
    } finally {
      setLoadingImage(false);
    }
  };

  const handleUse = () => {
    if (!imageUrl || !imageFile) return;
    onApplyImage?.(imageFile, imageUrl);
    toast.success("Banner image applied!");
  };

  // ── Shared header ─────────────────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 border-b border-border/40">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
        <div>
          <p className="font-black text-foreground text-[10px] sm:text-sm uppercase tracking-tight">Banner Studio</p>
          <p className="hidden sm:block text-xs text-muted-foreground">AI-crafted 16:9 banner — no text rendered</p>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // ── Locked state ──────────────────────────────────────────────────────────


  if (!isFormReady) {
    const missing: string[] = [];
    if (!title.trim()) missing.push("event title");
    if (description.trim().length < 20) missing.push("description (min 20 chars)");
    if (!decisionDomain.trim()) missing.push("decision domain");

    return (
      <div className="flex flex-col">
        {header}
        <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
          <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground mb-1">Fill the form first</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Banner generation uses your event details. Still missing:{" "}
              <span className="text-foreground/70 font-medium">{missing.join(", ")}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active states ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {header}
      <div className="px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-3.5 sm:gap-5">
      {/* Context preview — shows what was pulled from the form */}
      <div className="bg-muted/30 border border-border/40 rounded-xl px-3 py-2 sm:px-4 sm:py-3 flex flex-col gap-0.5 sm:gap-1">
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 mb-0.5">Pulled from your form</p>
        <p className="text-xs font-black text-foreground truncate">{title}</p>
        {decisionDomain && (
          <p className="text-[10px] text-muted-foreground">{decisionDomain}</p>
        )}
      </div>

      {step === "inputs" && (
        <>
          {/* Visual Theme */}
          <div>
            <FieldLabel>Visual Theme <span className="normal-case font-normal text-muted-foreground">(optional)</span></FieldLabel>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Dark moody, vibrant neon..."
              className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Target Market override */}
          <div>
            <FieldLabel>Target Market <span className="normal-case font-normal text-muted-foreground/50 ml-1">(optional override)</span></FieldLabel>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
              {TARGET_MARKETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setTargetMarket(targetMarket === m ? "" : m)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-all",
                    targetMarket === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            {!targetMarket && ageGroup && ageGroup !== "All Ages" && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Using form value: <span className="text-foreground/70">{ageGroup}</span>
              </p>
            )}
          </div>

          {/* N */}
          <div>
            <FieldLabel>Prompt Options (N)</FieldLabel>
            <Stepper
              value={N}
              min={1}
              max={6}
              onChange={setN}
              label={`prompt${N !== 1 ? "s" : ""} to generate (max 6)`}
            />
          </div>

          <button
            onClick={handleGeneratePrompts}
            disabled={loadingPrompts}
            className="bg-primary text-primary-foreground w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          >
            {loadingPrompts ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loadingPrompts ? "Generating Prompts…" : `Generate ${N > 1 ? `${N} Prompts` : "Prompt"}`}
          </button>
        </>
      )}

      {step === "pick" && (
        <>
          <button
            onClick={() => setStep("inputs")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors -mb-1"
          >
            ← Edit options
          </button>
          <PromptSelector
            prompts={prompts}
            selected={selectedPrompt}
            onSelect={setSelectedPrompt}
            onConfirm={handleGenerateImage}
            generating={loadingImage}
          />
        </>
      )}

      {step === "preview" && imageUrl && (
        <ImagePreview
          imageUrl={imageUrl}
          onUse={handleUse}
          onBack={() => { setStep("pick"); setImageUrl(null); setImageFile(null); }}
        />
      )}
      </div>
    </div>
  );
}
