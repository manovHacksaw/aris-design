"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wand2,
  Sparkles,
  Send,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  generateImage,
  checkGenerationLimit,
  base64ToFile,
  base64ToObjectUrl,
} from "@/services/image-generation.service";

interface BrandImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToOption: (file: File, preview: string) => void;
  brandId: string;
  /** Event context injected into the prompt */
  eventTitle?: string;
  eventDescription?: string;
  /** Brand name shown in header and injected into prompt */
  brandName?: string;
  /** Label for the option this image is going into, e.g. "Option 2" */
  optionLabel?: string;
  /** Whether this modal is generating the event banner (vs a vote option image) */
  isBanner?: boolean;
}

interface GeneratedImage {
  data: string;
  mimeType: string;
  objectUrl: string;
}

const MAX_DAILY = 5;

function buildBannerPrompt(userPrompt: string, title?: string, brandName?: string): string {
  const lines: string[] = [
    "Create a wide-format (16:9) event banner image.",
    "Rules:",
    "- NO text, words, titles, or captions anywhere on the image.",
    "- NO overlaid graphics, labels, or watermarks.",
    brandName
      ? `- Place the brand logo or brand name "${brandName}" only in the top-left corner, small and unobtrusive.`
      : "- Keep the top-left corner clear for a brand logo overlay.",
    "- The rest of the image must be a clean, visually rich scene — no typography.",
    "",
  ];
  if (title) lines.push(`Event Theme: "${title}"`);
  lines.push(`Visual Direction: ${userPrompt}`);
  lines.push("", "Generate a cinematic, high-quality banner that fits the event theme.");
  return lines.join("\n");
}

function buildOptionPrompt(userPrompt: string, title?: string, brandName?: string, optionLabel?: string): string {
  const lines: string[] = [
    `Create a square voting option image${optionLabel ? ` for "${optionLabel}"` : ""}.`,
    "Rules:",
    "- NO text, words, labels, or captions anywhere on the image.",
    "- NO overlaid graphics or watermarks.",
    brandName
      ? `- Place the brand logo or brand name "${brandName}" only in the top-left corner, small and subtle.`
      : "- Keep the top-left corner clear for a brand logo overlay.",
    "- The image must stand alone as a compelling visual choice for voters.",
    "",
  ];
  if (title) lines.push(`Event Theme: "${title}"`);
  lines.push(`Visual Direction: ${userPrompt}`);
  lines.push("", "Generate a clean, high-quality image suitable as a voting option.");
  return lines.join("\n");
}

export function BrandImageGeneratorModal({
  isOpen,
  onClose,
  onAddToOption,
  brandId,
  eventTitle,
  eventDescription,
  brandName,
  optionLabel,
  isBanner = false,
}: BrandImageGeneratorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);
  const [isFirstGen, setIsFirstGen] = useState(true);

  const isGeneratingRef = useRef(false);
  const limitCheckedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check limit on open
  useEffect(() => {
    if (isOpen && brandId && !limitCheckedRef.current) {
      limitCheckedRef.current = true;
      checkGenerationLimit(brandId, "brand").then((info) => {
        setRemainingGenerations(info.remainingGenerations);
      });
    }
  }, [isOpen, brandId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setPrompt("");
      setError(null);
      setIsGenerating(false);
      setIsFirstGen(true);
      limitCheckedRef.current = false;
      isGeneratingRef.current = false;
      if (generatedImage?.objectUrl) {
        URL.revokeObjectURL(generatedImage.objectUrl);
      }
      setGeneratedImage(null);
      setRemainingGenerations(null);
    }
  }, [isOpen]);

  const handleGenerate = async (userPrompt: string) => {
    if (isGeneratingRef.current || !userPrompt.trim()) return;
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError(null);

    if (generatedImage?.objectUrl) {
      URL.revokeObjectURL(generatedImage.objectUrl);
      setGeneratedImage(null);
    }

    const apiPrompt = isBanner
      ? buildBannerPrompt(userPrompt, eventTitle, brandName)
      : buildOptionPrompt(userPrompt, eventTitle, brandName, optionLabel);
    const result = await generateImage(apiPrompt, brandId, "brand");

    if (result.remainingGenerations !== undefined) {
      setRemainingGenerations(result.remainingGenerations);
    }

    isGeneratingRef.current = false;
    setIsGenerating(false);

    if (!result.success || !result.image) {
      setError(result.error || "Generation failed. Please try again.");
      return;
    }

    const objectUrl = base64ToObjectUrl(result.image.data, result.image.mimeType);
    setGeneratedImage({ data: result.image.data, mimeType: result.image.mimeType, objectUrl });
    setIsFirstGen(false);
  };

  const handleSend = () => {
    const raw = prompt.trim();
    if (!raw) return;
    setPrompt("");
    handleGenerate(raw);
  };

  const handleAddToOption = () => {
    if (!generatedImage) return;
    const { data, mimeType, objectUrl } = generatedImage;
    // Null out before closing so the cleanup effect doesn't revoke the URL
    // that was just handed off to the parent as bannerPreview
    setGeneratedImage(null);
    const file = base64ToFile(data, mimeType, "ai-generated.png");
    onAddToOption(file, objectUrl);
    onClose();
  };

  const handleDiscard = () => {
    if (generatedImage?.objectUrl) URL.revokeObjectURL(generatedImage.objectUrl);
    setGeneratedImage(null);
    setError(null);
    setPrompt("");
  };

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isGenerating && onClose()}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            style={{
              background: "rgba(12, 12, 14, 0.96)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">
                    AI Image Generator
                  </p>
                  {optionLabel && (
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                      For {optionLabel}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {remainingGenerations !== null && (
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                    {remainingGenerations}/{MAX_DAILY} left
                  </span>
                )}
                <button
                  onClick={() => !isGenerating && onClose()}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Event context chips */}
              {(eventTitle || eventDescription) && (
                <div className="flex items-start gap-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Sparkles className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-0.5">
                      Using event context
                    </p>
                    {eventTitle && (
                      <p className="text-[10px] font-bold text-white/60 truncate">{eventTitle}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Generated image preview */}
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 py-10"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                      </div>
                      <motion.div
                        className="absolute inset-0 rounded-2xl border border-primary/20"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white tracking-tight">Generating…</p>
                      <p className="text-[10px] text-white/30 font-medium mt-1">
                        This takes a few seconds
                      </p>
                    </div>
                  </motion.div>
                ) : generatedImage ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {/* Image */}
                    <div className="relative rounded-xl overflow-hidden aspect-square bg-white/5">
                      <img
                        src={generatedImage.objectUrl}
                        alt="AI generated"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md">
                        <Sparkles className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] font-black text-white uppercase tracking-wider">
                          AI
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleDiscard}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/8 hover:text-white/60 transition-all active:scale-95"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleAddToOption}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3 h-3" />
                        Okay
                      </button>
                    </div>

                    {/* Regenerate */}
                    <button
                      onClick={() => prompt ? handleGenerate(prompt) : null}
                      disabled={!prompt.trim() || remainingGenerations === 0}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-white/25 uppercase tracking-widest hover:text-white/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate with same prompt
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {/* Hint suggestions */}
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider ml-0.5">
                      Try a prompt
                    </p>
                    {[
                      "Product on a clean white background",
                      "Lifestyle shot in natural light",
                      "Bold graphic with brand colors",
                    ].map((hint) => (
                      <button
                        key={hint}
                        onClick={() => setPrompt(hint)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/6 text-xs font-medium text-white/35 hover:text-white/60 hover:bg-white/7 transition-all"
                      >
                        "{hint}"
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-red-300">{error}</p>
                </div>
              )}
            </div>

            {/* Bottom input */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 focus-within:border-primary/40 transition-colors">
                {!isFirstGen && (
                  <span className="text-[10px] font-black text-primary/60 shrink-0">/image</span>
                )}
                <input
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isFirstGen ? "Describe the image…" : "Describe another image…"}
                  disabled={isGenerating}
                  className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-white placeholder:text-white/20 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!prompt.trim() || isGenerating || remainingGenerations === 0}
                  className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  ) : (
                    <Send className="w-3 h-3 text-white" />
                  )}
                </button>
              </div>
              {remainingGenerations === 0 && (
                <p className="text-[10px] font-bold text-amber-400/60 text-center mt-2">
                  Daily limit reached (5/day) — resets tomorrow
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
