"use client";

import { useState } from "react";
import { Sparkles, Loader2, Image as ImageIcon, Check, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateAiVotingOptionPrompts } from "@/services/ai.service";
import { generateImage, base64ToObjectUrl, base64ToFile } from "@/services/image-generation.service";
import { useUser } from "@/context/UserContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AiVotingOptionPanelProps {
  /** From the event form */
  eventTitle?: string;
  eventDescription?: string;
  decisionDomain?: string;
  /** The label/title of this specific option (e.g. "Creamy Chili Oil Noodles") */
  contentTitle?: string;
  /** Brand profile */
  brandName?: string;
  brandBio?: string;
  /** Called when user confirms an image */
  onApply: (file: File, preview: string) => void;
  onClose: () => void;
}

const TARGET_MARKETS = [
  "Gen Z (18–24)",
  "Millennials (25–34)",
  "Adults (35–54)",
  "Students",
  "Professionals",
  "Creators",
  "Athletes",
  "All audiences",
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

// ── Prompt card ───────────────────────────────────────────────────────────────

function PromptCard({
  index,
  prompt,
  selected,
  generating,
  onSelect,
}: {
  index: number;
  prompt: string;
  selected: boolean;
  generating: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={generating}
      className={cn(
        "text-left w-full rounded-2xl border px-4 py-3.5 transition-all text-xs leading-relaxed disabled:opacity-50",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5 transition-all",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground"
          )}
        >
          {selected ? <Check className="w-3 h-3" /> : index + 1}
        </span>
        <span>{prompt}</span>
      </div>
    </button>
  );
}

// ── Image preview step ────────────────────────────────────────────────────────

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
        Image ready. Apply it or go back to pick a different direction.
      </p>
      <div className="aspect-square rounded-2xl overflow-hidden border border-border/60">
        <img src={imageUrl} alt="AI generated option" className="w-full h-full object-cover" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-border text-xs font-black text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        >
          ← Change Direction
        </button>
        <button
          onClick={onUse}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Check className="w-3.5 h-3.5" />
          Use This Image
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiVotingOptionPanel({
  eventTitle = "",
  eventDescription = "",
  decisionDomain = "",
  contentTitle = "",
  brandName = "",
  brandBio = "",
  onApply,
  onClose,
}: AiVotingOptionPanelProps) {
  const { user } = useUser();

  // User-provided inputs (only target market is asked)
  const [targetMarket, setTargetMarket] = useState("");

  // Flow: "pick" shows 3 prompts, "preview" shows generated image
  type Step = "pick" | "preview";
  const [step, setStep] = useState<Step>("pick");

  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const brandIdentity = [
    brandName && `Brand: ${brandName}`,
    brandBio && `Style: ${brandBio}`,
  ].filter(Boolean).join(", ");

  // Generate 3 prompt directions — always fires immediately on mount / regenerate
  const handleGeneratePrompts = async () => {
    setLoadingPrompts(true);
    setPrompts([]);
    setSelectedPrompt(null);

    try {
      const res = await generateAiVotingOptionPrompts({
        eventTitle,
        eventDescription,
        decisionDomain,
        targetMarket: targetMarket || "General audience",
        brandIdentity,
        contentTitle,
      });

      if (!res.success || !res.prompts?.length) {
        throw new Error(res.error || "No prompts returned");
      }
      setPrompts(res.prompts);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate visual directions");
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Generate the actual image from the selected prompt
  const handleGenerateImage = async () => {
    if (selectedPrompt === null) return;
    setLoadingImage(true);
    setImageUrl(null);
    setImageFile(null);

    try {
      const brandId = user?.ownedBrands?.[0]?.id ?? user?.id ?? "";
      const res = await generateImage(prompts[selectedPrompt], brandId, "brand");
      if (!res.success || !res.image) {
        throw new Error(res.error || "Image generation failed");
      }
      const preview = base64ToObjectUrl(res.image.data, res.image.mimeType);
      const file = base64ToFile(res.image.data, res.image.mimeType, `option-${Date.now()}.png`);
      setImageUrl(preview);
      setImageFile(file);
      setStep("preview");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate image");
    } finally {
      setLoadingImage(false);
    }
  };

  const handleUse = () => {
    if (!imageUrl || !imageFile) return;
    onApply(imageFile, imageUrl);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-lg max-h-[75vh] sm:max-h-[85vh] bg-card border border-border rounded-[24px] sm:rounded-3xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          <div>
            <p className="font-black text-foreground text-xs sm:text-sm uppercase tracking-tight">Visual Directions</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
              {contentTitle || "Option image"}
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

      <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* Target market selector — always visible on pick step */}
        {step === "pick" && (
          <div>
            <FieldLabel>Target Market <span className="normal-case font-normal text-muted-foreground">(optional)</span></FieldLabel>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
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
          </div>
        )}

        {/* Context chip */}
        {step === "pick" && eventTitle && (
          <div className="bg-muted/30 border border-border/40 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">Event context</p>
            <p className="text-xs font-black text-foreground truncate">{eventTitle}</p>
            {decisionDomain && <p className="text-[10px] text-muted-foreground">{decisionDomain}</p>}
          </div>
        )}

        {/* Pick step — prompt list or generate button */}
        {step === "pick" && (
          <>
            {prompts.length === 0 ? (
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
                {loadingPrompts ? "Generating Directions…" : "Generate 3 Visual Directions"}
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-foreground">3 Visual Directions</p>
                  <button
                    onClick={handleGeneratePrompts}
                    disabled={loadingPrompts}
                    className="text-xs text-primary hover:opacity-70 transition-opacity font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    {loadingPrompts ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Regenerate
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {prompts.map((p, i) => (
                    <PromptCard
                      key={i}
                      index={i}
                      prompt={p}
                      selected={selectedPrompt === i}
                      generating={loadingImage}
                      onSelect={() => setSelectedPrompt(selectedPrompt === i ? null : i)}
                    />
                  ))}
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={selectedPrompt === null || loadingImage}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                >
                  {loadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  {loadingImage ? "Generating Image…" : "Generate Image from Selected"}
                </button>
              </>
            )}
          </>
        )}

        {/* Preview step */}
        {step === "preview" && imageUrl && (
          <ImagePreview
            imageUrl={imageUrl}
            onUse={handleUse}
            onBack={() => {
              setStep("pick");
              setImageUrl(null);
              setImageFile(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
