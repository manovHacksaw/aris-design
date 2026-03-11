"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wand2,
  Sparkles,
  RefreshCw,
  Send,
  ChevronRight,
  Check,
  Loader2,
  ImageIcon,
  Zap,
  AlertCircle,
  Clock,
  Users,
  Pencil,
} from "lucide-react";
import { getEvents, type Event } from "@/services/event.service";
import { createSubmission } from "@/services/submission.service";
import { uploadToPinata } from "@/lib/pinata-upload";
import {
  generateImage,
  checkGenerationLimit,
  base64ToFile,
  base64ToObjectUrl,
} from "@/services/image-generation.service";
import { PinturaImageEditor } from "@/components/create/PinturaImageEditor";

// ─── Types ─────────────────────────────────────────────────────────────────

type Step = "select_type" | "prompt" | "generating" | "preview" | "selecting_event" | "posting";

interface GeneratedImage {
  data: string;
  mimeType: string;
  objectUrl: string;
}

interface AIGeneratorWindowProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  /** When provided the window skips the type-select step and pre-fills the prompt */
  initialPrompt?: string;
  initialStyle?: string;
  initialRatio?: string;
}

// ─── Event Type Card ────────────────────────────────────────────────────────

const POST_TYPES = [
  {
    id: "post_and_vote",
    label: "Post & Vote",
    description: "Submit a post to a live event and let the community vote",
    icon: "🗳️",
    color: "from-primary/20 to-primary/5",
    borderColor: "border-primary/40",
  },
  {
    id: "post_only",
    label: "Post Only",
    description: "Submit content directly to an open event",
    icon: "📸",
    color: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "border-emerald-500/40",
  },
] as const;

type PostTypeId = (typeof POST_TYPES)[number]["id"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildEnhancedPrompt(userPrompt: string, event: Event | null, style?: string, ratio?: string): string {
  const parts: string[] = [];

  if (event) {
    if (event.title) parts.push(`Event Theme: "${event.title}"`);
    if (event.description) {
      const desc =
        event.description.length > 200
          ? event.description.slice(0, 200) + "..."
          : event.description;
      parts.push(`Event Context: ${desc}`);
    }
    if (event.brand?.name) parts.push(`Brand: ${event.brand.name}`);
  }

  if (style) parts.push(`Visual Style: ${style}`);
  if (ratio) parts.push(`Aspect Ratio: ${ratio}`);

  if (parts.length === 0) return userPrompt;

  const contextBlock = event
    ? `Create an image for the following request, keeping in mind the event context:\n\n${parts.join("\n")}\n\nUser's Request: ${userPrompt}\n\nGenerate an image that captures the user's request while being relevant to the event theme.`
    : `Create an image based on the following:\n\nUser's Request: ${userPrompt}\n\n${parts.join("\n")}`;

  return contextBlock;
}

function formatTimeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIGeneratorWindow({ isOpen, onClose, userId, initialPrompt = "", initialStyle = "", initialRatio = "" }: AIGeneratorWindowProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("select_type");
  const [selectedType, setSelectedType] = useState<PostTypeId | null>(null);
  const [prompt, setPrompt] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState(""); // displayed after generation
  const [isFirstGeneration, setIsFirstGeneration] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);

  // Event selection
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // Posting
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Pintura editor state
  const [pinturaOpen, setPinturaOpen] = useState(false);
  const [editedImageFile, setEditedImageFile] = useState<File | null>(null);

  const isGeneratingRef = useRef(false);
  const limitCheckedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check limit on open + jump to prompt step if initialPrompt was provided
  useEffect(() => {
    if (isOpen) {
      if (userId && !limitCheckedRef.current) {
        limitCheckedRef.current = true;
        checkGenerationLimit(userId, "user").then((info) => {
          setRemainingGenerations(info.remainingGenerations);
        });
      }
      if (initialPrompt) {
        setPrompt(initialPrompt);
        setStep("prompt");
      }
    }
  }, [isOpen, userId, initialPrompt]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep("select_type");
      setSelectedType(null);
      setPrompt("");
      setCurrentPrompt("");
      setIsFirstGeneration(true);
      setGeneratedImage(null);
      setGenerationError(null);
      setSelectedEvent(null);
      setEvents([]);
      setEventsLoaded(false);
      setIsLoadingEvents(false);
      setIsPosting(false);
      setPostSuccess(false);
      setPostError(null);
      setRemainingGenerations(null);
      setPinturaOpen(false);
      setEditedImageFile(null);
      limitCheckedRef.current = false;
      isGeneratingRef.current = false;
    }
  }, [isOpen]);

  const loadEvents = useCallback(async () => {
    if (eventsLoaded || isLoadingEvents) return;
    setIsLoadingEvents(true);
    try {
      const result = await getEvents({ status: "posting", limit: 50 });
      setEvents(result.events.filter((e) => e.eventType === "post_and_vote" || e.allowSubmissions));
      setEventsLoaded(true);
    } catch {
      // fail silently
    } finally {
      setIsLoadingEvents(false);
    }
  }, [eventsLoaded, isLoadingEvents]);

  const handleGenerate = useCallback(
    async (userPrompt: string, eventCtx?: Event | null) => {
      if (isGeneratingRef.current || !userPrompt.trim()) return;
      isGeneratingRef.current = true;
      setGenerationError(null);
      setStep("generating");

      // Release previous object URL
      if (generatedImage?.objectUrl) {
        URL.revokeObjectURL(generatedImage.objectUrl);
        setGeneratedImage(null);
      }

      const apiPrompt = buildEnhancedPrompt(userPrompt, eventCtx ?? selectedEvent, initialStyle, initialRatio);
      const result = await generateImage(apiPrompt, userId, "user");

      if (result.remainingGenerations !== undefined) {
        setRemainingGenerations(result.remainingGenerations);
      }

      isGeneratingRef.current = false;

      if (!result.success || !result.image) {
        setGenerationError(result.error || "Generation failed. Please try again.");
        setStep("prompt");
        return;
      }

      const objectUrl = base64ToObjectUrl(result.image.data, result.image.mimeType);
      setGeneratedImage({ data: result.image.data, mimeType: result.image.mimeType, objectUrl });
      setCurrentPrompt(userPrompt);
      setIsFirstGeneration(false);
      setStep("preview");
    },
    [userId, selectedEvent, generatedImage]
  );

  const handleSendPrompt = () => {
    const raw = prompt.trim();
    if (!raw) return;

    // Strip /image prefix if user typed it on a re-generation
    const userPrompt = raw.startsWith("/image ") ? raw.slice(7).trim() : raw;
    if (!userPrompt) return;

    setPrompt("");
    handleGenerate(userPrompt);
  };

  const handleRegenerate = () => {
    if (!currentPrompt) return;
    handleGenerate(currentPrompt);
  };

  const handlePost = async () => {
    if (!generatedImage || !selectedEvent) return;
    setIsPosting(true);
    setPostError(null);
    setStep("posting");

    try {
      // Use the Pintura-edited file if available, otherwise convert from base64
      const file = editedImageFile ?? base64ToFile(generatedImage.data, generatedImage.mimeType, "ai-generated.png");
      const { imageUrl } = await uploadToPinata(file);
      await createSubmission({ eventId: selectedEvent.id, imageUrl });
      setPostSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setPostError(err.message || "Failed to post. Please try again.");
      setStep("preview");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDiscard = () => {
    if (generatedImage?.objectUrl) URL.revokeObjectURL(generatedImage.objectUrl);
    setGeneratedImage(null);
    setCurrentPrompt("");
    setSelectedEvent(null);
    setEditedImageFile(null);
    setStep("prompt");
  };

  const handlePinturaDone = (editedFile: File, editedPreview: string) => {
    // Revoke the old preview URL and replace with the Pintura-edited one
    if (generatedImage?.objectUrl) URL.revokeObjectURL(generatedImage.objectUrl);
    setGeneratedImage((prev) =>
      prev ? { ...prev, objectUrl: editedPreview } : prev
    );
    setEditedImageFile(editedFile);
    setPinturaOpen(false);
  };

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isPosting && onClose()}
          />

          {/* Window */}
          <motion.div
            className="relative w-full max-w-lg h-[85vh] flex flex-col rounded-[28px] overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            style={{
              background: "rgba(10, 10, 12, 0.92)",
              backdropFilter: "blur(32px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">
                    Aris AI Engine
                  </p>
                  {remainingGenerations !== null && (
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                      {remainingGenerations} generations left today
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => !isPosting && onClose()}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* STEP 1: Select post type */}
                {step === "select_type" && (
                  <motion.div
                    key="select_type"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter leading-tight">
                        What are you <br />
                        <span className="text-primary italic">creating?</span>
                      </h2>
                      <p className="text-white/40 text-xs font-medium mt-2">
                        Select the type of post you want to generate
                      </p>
                    </div>

                    <div className="space-y-3">
                      {POST_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setSelectedType(type.id);
                            setStep("prompt");
                          }}
                          className={`w-full text-left p-4 rounded-2xl border bg-gradient-to-br ${type.color} ${type.borderColor} hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{type.icon}</span>
                              <div>
                                <p className="text-sm font-black text-white tracking-tight">
                                  {type.label}
                                </p>
                                <p className="text-[10px] font-medium text-white/40 mt-0.5">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Prompt */}
                {step === "prompt" && (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 space-y-6"
                  >
                    <div>
                      {/* Only show back button when not arriving from hero panel */}
                      {!initialPrompt && (
                        <button
                          onClick={() => setStep("select_type")}
                          className="text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors mb-4 flex items-center gap-1"
                        >
                          ← Back
                        </button>
                      )}
                      <h2 className="text-2xl font-black text-white tracking-tighter leading-tight">
                        Describe your <br />
                        <span className="text-primary italic">vision</span>
                      </h2>
                      <p className="text-white/40 text-xs font-medium mt-2">
                        {isFirstGeneration
                          ? "Type anything — press Enter or hit Generate."
                          : "Edit your prompt and generate again."}
                      </p>
                    </div>

                    {/* Style / Ratio chips (shown when passed from hero) */}
                    {(initialStyle || initialRatio) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {initialStyle && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Style</span>
                            <span className="text-[10px] font-black text-primary">{initialStyle}</span>
                          </div>
                        )}
                        {initialRatio && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Ratio</span>
                            <span className="text-[10px] font-black text-white/70">{initialRatio}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prompt hints — only if prompt is empty */}
                    {!prompt && (
                      <div className="space-y-2">
                        {[
                          "A neon city skyline at dusk",
                          "Minimalist product shot on white",
                          "Abstract fluid motion in gold",
                        ].map((hint) => (
                          <button
                            key={hint}
                            onClick={() => setPrompt(hint)}
                            className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
                          >
                            "{hint}"
                          </button>
                        ))}
                      </div>
                    )}

                    {generationError && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-red-300">{generationError}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 3: Generating */}
                {step === "generating" && (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-[60vh] gap-6 p-8"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-[28px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                      </div>
                      <motion.div
                        className="absolute inset-0 rounded-[28px] border border-primary/30"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-white tracking-tight">
                        Generating...
                      </p>
                      <p className="text-xs font-medium text-white/30 mt-1">
                        "{currentPrompt || prompt}"
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 0.15, 0.3].map((delay) => (
                        <motion.div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Preview */}
                {step === "preview" && generatedImage && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 space-y-5"
                  >
                    {/* Image preview */}
                    <div className="relative rounded-2xl overflow-hidden aspect-square bg-white/5">
                      <img
                        src={generatedImage.objectUrl}
                        alt="AI generated"
                        className="w-full h-full object-cover"
                      />
                      {/* AI badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">
                          AI Generated
                        </span>
                      </div>
                      {remainingGenerations !== null && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md">
                          <span className="text-[9px] font-bold text-white/60">
                            {remainingGenerations} left
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] font-medium text-white/40 px-1">
                      "{currentPrompt}"
                    </p>

                    {postError && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-red-300">{postError}</p>
                      </div>
                    )}

                    {/* Actions — Discard | Edit | Post */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleDiscard}
                        className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/50 uppercase tracking-widest hover:bg-white/8 hover:text-white/70 transition-all active:scale-95"
                      >
                        Discard
                      </button>
                      <button
                        onClick={() => setPinturaOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-xs font-black text-white/60 uppercase tracking-widest hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setStep("selecting_event");
                          loadEvents();
                        }}
                        className="flex-1 py-3.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                      >
                        Post
                      </button>
                    </div>

                    {/* Regenerate hint */}
                    <button
                      onClick={handleRegenerate}
                      disabled={remainingGenerations === 0}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  </motion.div>
                )}

                {/* STEP 5: Select event */}
                {step === "selecting_event" && (
                  <motion.div
                    key="selecting_event"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 space-y-5"
                  >
                    <div>
                      <button
                        onClick={() => setStep("preview")}
                        className="text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors mb-4 flex items-center gap-1"
                      >
                        ← Back
                      </button>
                      <h2 className="text-xl font-black text-white tracking-tight">
                        Select an Event
                      </h2>
                      <p className="text-white/40 text-xs font-medium mt-1">
                        Choose where to post your AI creation
                      </p>
                    </div>

                    {isLoadingEvents ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    ) : events.length === 0 ? (
                      <div className="text-center py-12">
                        <ImageIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-sm font-bold text-white/30">No open events right now</p>
                        <p className="text-xs text-white/20 mt-1">Check back later</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {events.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => {
                              setSelectedEvent(event);
                              handlePost();
                            }}
                            className="w-full text-left p-4 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/8 hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Event image */}
                              <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden shrink-0">
                                {event.imageCid ? (
                                  <img
                                    src={`https://gateway.pinata.cloud/ipfs/${event.imageCid}`}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white/20" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate">
                                  {event.title}
                                </p>
                                {event.brand?.name && (
                                  <p className="text-[10px] font-medium text-white/30 mt-0.5">
                                    {event.brand.name}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-white/30">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeLeft(event.endTime)}
                                  </span>
                                  {event.eventAnalytics && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-white/30">
                                      <Users className="w-3 h-3" />
                                      {event.eventAnalytics.uniqueParticipants} joined
                                    </span>
                                  )}
                                </div>
                              </div>

                              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary shrink-0 transition-colors mt-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 6: Posting */}
                {step === "posting" && (
                  <motion.div
                    key="posting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-[60vh] gap-6 p-8"
                  >
                    {postSuccess ? (
                      <>
                        <div className="w-20 h-20 rounded-[24px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                          <Check className="w-9 h-9 text-emerald-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-white tracking-tight">Posted!</p>
                          <p className="text-xs font-medium text-white/30 mt-1">
                            Your creation is live on{" "}
                            <span className="text-white/60">{selectedEvent?.title}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="w-20 h-20 rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Loader2 className="w-9 h-9 text-primary animate-spin" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-white tracking-tight">
                            Uploading...
                          </p>
                          <p className="text-xs font-medium text-white/30 mt-1">
                            Pinning to IPFS and submitting to event
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom input bar — only visible on prompt step */}
            <AnimatePresence>
              {step === "prompt" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="p-4 border-t border-white/5"
                >
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-primary/40 transition-colors">
                    {!isFirstGeneration && (
                      <span className="text-[10px] font-black text-primary/70 shrink-0">/image</span>
                    )}
                    <input
                      autoFocus
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendPrompt();
                        }
                      }}
                      placeholder={
                        isFirstGeneration
                          ? "Describe your image..."
                          : "Describe a new image..."
                      }
                      className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 focus:outline-none"
                    />
                    <button
                      onClick={handleSendPrompt}
                      disabled={!prompt.trim() || remainingGenerations === 0}
                      className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  {remainingGenerations === 0 && (
                    <p className="text-[10px] font-bold text-amber-400/70 text-center mt-2">
                      Daily limit reached — resets tomorrow
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(content, document.body)}
      {generatedImage && (
        <PinturaImageEditor
          isOpen={pinturaOpen}
          imageSrc={generatedImage.objectUrl}
          onDone={handlePinturaDone}
          onClose={() => setPinturaOpen(false)}
        />
      )}
    </>
  );
}
