"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ArrowRight, Check, User, AtSign, FileText } from "lucide-react";
import { toast } from "sonner";

const INTEREST_CATEGORIES = [
  "Fashion", "Tech", "Gaming", "Music", "Sports",
  "Food", "Travel", "Art", "Film", "Fitness",
  "Beauty", "Automotive", "Finance", "Health", "Education",
];

export default function UserSignup() {
  const router = useRouter();
  const { isConnected, isInitialized, isLoading: walletLoading, userInfo, address } = useWallet();
  const { completeOnboarding, isOnboarded, setOnboardingData } = useAuth();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: userInfo?.name || "",
    username: "",
    bio: "",
    preferredCategories: [] as string[],
  });

  // Redirect if not connected
  useEffect(() => {
    if (!isInitialized || walletLoading) return;
    if (!isConnected) {
      router.replace("/register");
    }
  }, [isConnected, isInitialized, walletLoading, router]);

  // Redirect if already onboarded
  useEffect(() => {
    if (isOnboarded) {
      router.replace("/");
    }
  }, [isOnboarded, router]);

  // Prefill from Privy user info
  useEffect(() => {
    if (userInfo?.name && !form.displayName) {
      setForm((f) => ({ ...f, displayName: userInfo.name! }));
    }
  }, [userInfo]);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      preferredCategories: f.preferredCategories.includes(cat)
        ? f.preferredCategories.filter((c) => c !== cat)
        : [...f.preferredCategories, cat],
    }));
  };

  const handleComplete = async () => {
    if (!form.displayName.trim() || !form.username.trim()) {
      toast.error("Please fill in your name and username");
      return;
    }
    if (form.preferredCategories.length === 0) {
      toast.error("Please select at least one interest");
      return;
    }

    setIsSaving(true);
    try {
      completeOnboarding({
        role: "user",
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        preferredCategories: form.preferredCategories,
        avatarUrl: userInfo?.profileImage,
        isOnboarded: true,
      });
      toast.success("Welcome to Aris!");
      router.push("/onboarding");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isInitialized || walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">
      {/* Left Panel */}
      <div className="hidden lg:flex w-5/12 relative bg-[#050505] items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/flagged/photo-1574164908900-6275ca361157?q=80&w=735&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80" />
        <div className="relative z-10 p-12 w-full max-w-lg space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter leading-tight">
            Create Your Identity
          </h2>
          <p className="text-white/50 text-sm font-medium leading-relaxed">
            Set up your Aris profile to start earning rewards for your attention and creativity.
          </p>
          {/* Step indicators */}
          <div className="flex gap-2 pt-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s === step ? "w-12 bg-primary" : s < step ? "w-6 bg-primary/40" : "w-3 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-12 lg:justify-center">

          {/* Google Profile Header */}
          {userInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-white/5 border border-white/10"
            >
              {userInfo.profileImage ? (
                <img
                  src={userInfo.profileImage}
                  alt={userInfo.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{userInfo.name}</p>
                <p className="text-xs text-foreground/40">{userInfo.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Signed in
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-foreground tracking-tighter">
                  Your Profile
                </h1>
                <p className="text-sm text-foreground/40 font-medium">
                  How should the community know you?
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                  Username
                </label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                      }))
                    }
                    placeholder="username"
                    className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                  Bio{" "}
                  <span className="text-foreground/20 normal-case font-normal tracking-normal">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-4 h-4 text-foreground/30" />
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell the community about yourself..."
                    rows={3}
                    className="w-full bg-card border border-border/50 rounded-[14px] pl-11 pr-4 py-4 text-sm font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!form.displayName.trim() || !form.username.trim()) {
                    toast.error("Name and username are required");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-4 rounded-[16px] bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 active:scale-95 transition-all"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-foreground tracking-tighter">
                  Your Interests
                </h1>
                <p className="text-sm text-foreground/40 font-medium">
                  Select categories to personalize your feed.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {INTEREST_CATEGORIES.map((cat) => {
                  const selected = form.preferredCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                        selected
                          ? "bg-primary text-white border border-primary"
                          : "bg-card text-foreground/50 border border-border/40 hover:border-primary/30"
                      }`}
                    >
                      {selected && <Check className="inline w-3 h-3 mr-1" />}
                      {cat}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-foreground/30 font-medium">
                {form.preferredCategories.length} selected
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-[16px] text-foreground/40 hover:text-foreground font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSaving || form.preferredCategories.length === 0}
                  className="flex-1 py-4 rounded-[16px] bg-primary text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Join Aris
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
