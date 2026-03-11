"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";

// Pintura imports
import { PinturaEditor } from "@pqina/react-pintura";
import "@pqina/pintura/pintura.css";
import { getEditorDefaults } from "@pqina/pintura";

const editorDefaults = getEditorDefaults({
  // @ts-ignore
  license: process.env.NEXT_PUBLIC_PINTURA_LICENSE,
});

interface PinturaImageEditorProps {
  isOpen: boolean;
  imageSrc: string; // object URL or base64 data URL
  onDone: (editedFile: File, editedPreview: string) => void;
  onClose: () => void;
}

export function PinturaImageEditor({
  isOpen,
  imageSrc,
  onDone,
  onClose,
}: PinturaImageEditorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const editorRef = useRef<any>(null);

  const handleProcess = (imageState: any) => {
    setIsProcessing(false);
    const { dest } = imageState;
    const editedFile = new File([dest], "edited-image.png", {
      type: dest.type || "image/png",
    });
    const editedPreview = URL.createObjectURL(dest);
    onDone(editedFile, editedPreview);
  };

  const handleDoneClick = () => {
    if (editorRef.current?.editor) {
      setIsProcessing(true);
      editorRef.current.editor.processImage();
    }
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isProcessing && onClose()}
          />

          {/* Editor Panel */}
          <motion.div
            className="relative w-[95%] sm:w-[85%] md:w-[75%] lg:w-[65%] h-[90vh] overflow-hidden rounded-[28px] flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            style={{
              background: "rgba(10, 10, 12, 0.96)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
                Edit Image
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDoneClick}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{
                    background: "rgba(var(--primary-rgb, 47,106,255), 0.15)",
                    border: "1px solid rgba(var(--primary-rgb, 47,106,255), 0.4)",
                  }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span className="text-white">
                    {isProcessing ? "Processing…" : "Done"}
                  </span>
                </button>

                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {/* Pintura Editor */}
            <div className="flex-1 relative bg-[#0a0a0c] w-full overflow-hidden">
              <PinturaEditor
                ref={editorRef}
                {...editorDefaults}
                src={imageSrc}
                onProcess={handleProcess}
                onLoaderror={(err: any) =>
                  console.error("Pintura load error:", err)
                }
                className="pintura-editor h-full w-full"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
