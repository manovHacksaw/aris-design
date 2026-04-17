"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

declare global {
  interface Window {
    cloudinary?: any;
  }
}

interface PinturaImageEditorProps {
  isOpen: boolean;
  imageSrc: string; // object URL or base64 data URL
  onDone: (editedFile: File, editedPreview: string) => void;
  onClose: () => void;
}

type Stage = "uploading" | "editing" | "exporting" | "error";

export function PinturaImageEditor({
  isOpen,
  imageSrc,
  onDone,
  onClose,
}: PinturaImageEditorProps) {
  const [stage, setStage] = useState<Stage>("uploading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const widgetRef = useRef<any>(null);

  // When the modal opens, pre-upload the local blob to Cloudinary then open the widget
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    let cancelled = false;

    async function run() {
      setStage("uploading");
      setErrorMsg(null);

      try {
        // Convert imageSrc (object URL or base64 data URL) to a File
        let blob: Blob;
        if (imageSrc.startsWith("data:")) {
          // base64 data URL — decode directly without fetch
          const [header, b64] = imageSrc.split(",");
          const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
          const binary = atob(b64);
          const arr = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
          blob = new Blob([arr], { type: mime });
        } else {
          // blob: object URL
          const res = await fetch(imageSrc);
          if (!res.ok) throw new Error(`Could not read image (${res.status})`);
          blob = await res.blob();
        }

        const file = new File([blob], "image-to-edit.png", { type: blob.type || "image/png" });

        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}));
          throw new Error(errBody?.error ?? `Upload failed (${uploadRes.status})`);
        }

        const { publicId } = await uploadRes.json();
        if (cancelled) return;

        setStage("editing");

        // Wait for the Cloudinary script to be available
        let attempts = 0;
        while (!window.cloudinary && attempts < 40) {
          await new Promise((r) => setTimeout(r, 250));
          attempts++;
        }
        if (!window.cloudinary) throw new Error("Cloudinary editor failed to load");
        if (cancelled) return;

        const widget = window.cloudinary.mediaEditor();
        widget.update({
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          publicIds: [publicId],
        });
        widgetRef.current = widget;

        widget.on("export", async (data: any) => {
          if (cancelled) return;
          setStage("exporting");

          try {
            const exportedUrl: string =
              data?.assets?.[0]?.secureUrl ??
              data?.assets?.[0]?.secure_url ??
              data?.assets?.[0]?.url;

            if (!exportedUrl) throw new Error("No export URL returned");

            const imgRes = await fetch(exportedUrl);
            const imgBlob = await imgRes.blob();
            const editedFile = new File([imgBlob], "edited-image.png", {
              type: imgBlob.type || "image/png",
            });
            const editedPreview = URL.createObjectURL(imgBlob);

            widgetRef.current = null;
            onDone(editedFile, editedPreview);
          } catch (err: any) {
            setStage("error");
            setErrorMsg(err?.message || "Failed to save edited image");
          }
        });

        widget.on("close", () => {
          if (!cancelled) onClose();
          widgetRef.current = null;
        });

        widget.show();
      } catch (err: any) {
        if (!cancelled) {
          setStage("error");
          setErrorMsg(err?.message || "Something went wrong");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      if (widgetRef.current) {
        try { widgetRef.current.destroy?.(); } catch {}
        widgetRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  // Only show our overlay for uploading/exporting/error states.
  // While "editing", the Cloudinary widget renders its own full-screen UI.
  if (stage === "editing") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-300 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative flex flex-col items-center justify-center gap-4 rounded-3xl px-10 py-10"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            style={{
              background: "rgba(10, 10, 12, 0.96)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}
          >
            {stage === "error" ? (
              <>
                <p className="text-sm text-red-400 font-medium max-w-xs text-center">
                  {errorMsg}
                </p>
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground/60">
                  {stage === "uploading" ? "Uploading image…" : "Saving edits…"}
                </p>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
