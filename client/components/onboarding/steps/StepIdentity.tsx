"use client";

import { useState, useRef, useCallback } from "react";
import { User, AtSign, FileText, Camera, X, Loader2, ArrowRight, Check, Mail, Gift } from "lucide-react";
import { toast } from "sonner";
import { uploadToPinata, validateImageFile } from "@/lib/pinata-upload";
import { validateReferralCode } from "@/services/user.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export interface IdentityData {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl: string;
  incomingReferralCode: string;
}

interface Props {
  initial: IdentityData;
  prefillName?: string;
  prefillAvatar?: string;
  onNext: (data: IdentityData) => void;
}

export default function StepIdentity({ initial, prefillName, prefillAvatar, onNext }: Props) {
  const [form, setForm] = useState<IdentityData>({
    displayName: initial.displayName || prefillName || "",
    username: initial.username || "",
    email: initial.email || "",
    bio: initial.bio || "",
    avatarUrl: initial.avatarUrl || prefillAvatar || "",
    incomingReferralCode: initial.incomingReferralCode || "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial.avatarUrl || prefillAvatar || null
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [isReferralChecking, setIsReferralChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameStatus(value.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(value)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    try {
      const res = await fetch(`${API_BASE}/users/check-username?username=${encodeURIComponent(value)}`);
      if (res.ok) {
        const { available } = await res.json();
        setUsernameStatus(available ? "available" : "taken");
      } else { setUsernameStatus("idle"); }
    } catch { setUsernameStatus("idle"); }
  }, []);

  const handleUsernameChange = (raw: string) => {
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setForm(f => ({ ...f, username: cleaned }));
    setUsernameStatus("idle");
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(() => checkUsername(cleaned), 500);
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { toast.error(validation.error); return; }
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setIsUploadingAvatar(true);
    try {
      const { imageUrl } = await uploadToPinata(file);
      setForm(f => ({ ...f, avatarUrl: imageUrl }));
      setAvatarPreview(imageUrl);
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Upload failed. Try again.");
      setAvatarPreview(form.avatarUrl || null);
    } finally { setIsUploadingAvatar(false); }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setForm(f => ({ ...f, avatarUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNext = () => {
    if (!form.displayName.trim()) { toast.error("Display name is required"); return; }
    if (!form.username.trim()) { toast.error("Username is required"); return; }
    if (usernameStatus === "taken") { toast.error("That username is already taken"); return; }
    if (usernameStatus === "invalid" || form.username.length < 3) {
      toast.error("Username must be 3+ chars (letters, numbers, underscore)"); return;
    }
    if (usernameStatus === "checking") { toast.error("Please wait while we check username availability"); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    onNext({ ...form, incomingReferralCode: form.incomingReferralCode.trim().toUpperCase() });
  };

  const handleReferralBlur = async () => {
    const code = form.incomingReferralCode.trim().toUpperCase();
    if (!code) return;
    setIsReferralChecking(true);
    try {
      const result = await validateReferralCode(code);
      if (!result.valid) {
        toast.warning(result.reason || "Referral code looks invalid. You can still continue.");
      }
    } catch {
      // non-blocking check
    } finally {
      setIsReferralChecking(false);
    }
  };

  const bioLength = form.bio.length;

  const usernameHint = () => {
    if (!form.username) return null;
    if (usernameStatus === "checking") return <span className="text-foreground/40 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking…</span>;
    if (usernameStatus === "available") return <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Available</span>;
    if (usernameStatus === "taken") return <span className="text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> Taken</span>;
    if (usernameStatus === "invalid") return <span className="text-amber-400">Min 3 chars, letters/numbers/_ only</span>;
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest">Step 1 of 7</p>
        <h1 className="text-2xl font-black text-foreground tracking-tighter">Your Identity</h1>
        <p className="text-sm text-foreground/40">Set your account details to get started.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarSelect} />

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div
            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
            className="w-20 h-20 rounded-2xl bg-card border-2 border-dashed border-border/60 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden group"
          >
            {avatarPreview ? (
              <>
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-foreground" />
                </div>
              </>
            ) : (
              <Camera className="w-6 h-6 text-foreground/30 group-hover:text-primary/60 transition-colors" />
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              </div>
            )}
          </div>
          {avatarPreview && !isUploadingAvatar && (
            <button onClick={removeAvatar} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
              <X className="w-2.5 h-2.5 text-foreground" />
            </button>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">Profile Photo</p>
          <p className="text-xs text-foreground/40 leading-relaxed">JPEG, PNG, GIF, WebP — max 5 MB.<br />Stored on IPFS.</p>
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar} className="text-xs text-primary font-bold hover:underline disabled:opacity-40">
            {avatarPreview ? "Change photo" : "Upload photo"}
          </button>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Display Name</label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input
            type="text"
            value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="Your full name"
            className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Username
        </label>
        <div className="relative">
          <AtSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${usernameStatus === "available" ? "text-emerald-400" : usernameStatus === "taken" ? "text-red-400" : "text-foreground/30"}`} />
          <input
            type="text"
            value={form.username}
            onChange={e => handleUsernameChange(e.target.value)}
            placeholder="username"
            maxLength={30}
            className={`w-full bg-card border rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none transition-colors ${usernameStatus === "available" ? "border-emerald-400/50 focus:border-emerald-400" : usernameStatus === "taken" ? "border-red-400/50 focus:border-red-400" : "border-border/50 focus:border-primary/50"}`}
          />
        </div>
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] text-foreground/30">Letters, numbers, underscores only</p>
          <div className="text-[11px] font-medium">{usernameHint()}</div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
            Bio <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
          </label>
          <span className={`text-[11px] font-medium tabular-nums ${bioLength > 140 ? "text-amber-400" : "text-foreground/25"}`}>{bioLength}/160</span>
        </div>
        <div className="relative">
          <FileText className="absolute left-4 top-4 w-4 h-4 text-foreground/30" />
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 160) }))}
            placeholder="Tell the community about yourself..."
            rows={3}
            className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Email <span className="text-foreground/20 normal-case font-normal tracking-normal">optional</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Referral */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
          Referral Code <span className="text-foreground/20 normal-case font-normal tracking-normal">if you have one</span>
        </label>
        <div className="relative">
          <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input
            type="text"
            value={form.incomingReferralCode}
            onChange={e => setForm(f => ({ ...f, incomingReferralCode: e.target.value.toUpperCase() }))}
            onBlur={handleReferralBlur}
            placeholder="ARIS-XXXXXX-XXXX"
            className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-10 py-4 text-sm font-mono font-bold placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
          />
          {isReferralChecking && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 animate-spin" />
          )}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={isUploadingAvatar}
        className="w-full py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploadingAvatar ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}
