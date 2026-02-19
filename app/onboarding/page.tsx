"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, Zap, Shield, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    OnboardingStep,
    OnboardingData,
    INITIAL_ONBOARDING_DATA,
} from "@/types/onboarding";
import StepWelcome from "@/components/onboarding/StepWelcome";
import StepGoals from "@/components/onboarding/StepGoals";
import StepProfile from "@/components/onboarding/StepProfile";
import StepPersonalization from "@/components/onboarding/StepPersonalization";
import StepWallet from "@/components/onboarding/StepWallet";
import StepEducation from "@/components/onboarding/StepEducation";
import StepFirstAction from "@/components/onboarding/StepFirstAction";

const TOTAL_STEPS = 7;

const STEPS_INFO = [
    { id: 1, label: "Welcome", visual: { icon: Sparkles, text: "Join the Revolution" } },
    { id: 2, label: "Goals", visual: { icon: Zap, text: "Define Your Path" } },
    { id: 3, label: "Profile", visual: { icon: Shield, text: "Create Identity" } },
    { id: 4, label: "Personalize", visual: { icon: Sparkles, text: "Curate Feed" } },
    { id: 5, label: "Wallet", visual: { icon: Shield, text: "Secure Assets" } },
    { id: 6, label: "Learn", visual: { icon: Rocket, text: "Master Aris" } },
    { id: 7, label: "Start", visual: { icon: Rocket, text: "Launch" } },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<OnboardingStep | 7>(1);
    const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
    const [direction, setDirection] = useState(1);

    const canContinue = useCallback(() => {
        switch (step) {
            case 1: return data.intent !== null;
            case 2: return (data.goals?.length ?? 0) > 0;
            case 3: return data.profile.displayName.trim() !== "" && data.profile.username.trim() !== "";
            case 4: return data.preferredCategories.length > 0;
            case 5: return true;
            case 6: return true;
            case 7: return true;
            default: return false;
        }
    }, [step, data]);

    const goNext = () => {
        if (step < TOTAL_STEPS && canContinue()) {
            setDirection(1);
            setStep((s) => (s + 1) as OnboardingStep | 7);
        }
    };

    const goBack = () => {
        if (step > 1) {
            setDirection(-1);
            setStep((s) => (s - 1) as OnboardingStep | 7);
        }
    };

    const handleComplete = () => {
        router.push("/home");
    };

    const handleWalletConnect = () => {
        setData(prev => ({
            ...prev,
            walletAddress: "0x1a2b...3c4d5e6f7890",
            walletSkipped: false,
        }));
    };

    const handleWalletSkip = () => {
        setData(prev => ({ ...prev, walletSkipped: true }));
        goNext();
    };

    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
    };

    const VisualIcon = STEPS_INFO[step - 1].visual.icon;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden">
            {/* Left Panel - Visuals (Desktop Only) */}
            <div className="hidden lg:flex w-5/12 relative bg-[#050505] items-center justify-center overflow-hidden border-r border-white/5">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80" />

                <div className="relative z-10 p-12 w-full max-w-lg">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-6"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center">
                                <VisualIcon className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-tight">
                                {STEPS_INFO[step - 1].visual.text}
                            </h2>
                            <div className="flex gap-2">
                                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-500",
                                            i + 1 === step ? "w-12 bg-white" : "w-3 bg-white/20"
                                        )}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={goBack}
                        disabled={step === 1}
                        className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                            step === 1
                                ? "text-foreground/10 cursor-not-allowed"
                                : "text-foreground/40 hover:text-foreground hover:bg-secondary"
                        )}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1.5">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1 rounded-full transition-all duration-300",
                                    i + 1 === step ? "w-6 bg-primary" : "w-1.5 bg-secondary"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-8 lg:justify-center">
                    <div className="lg:min-h-[400px]">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.35, ease: "circOut" }}
                            >
                                {step === 1 && (
                                    <StepWelcome
                                        intent={data.intent}
                                        onIntentChange={(intent) => {
                                            setData(prev => ({ ...prev, intent }));
                                            // Auto advance for better UX
                                            setTimeout(() => setStep(2), 250);
                                        }}
                                    />
                                )}

                                {step === 2 && (
                                    <StepGoals
                                        selectedGoals={data.goals || []}
                                        onGoalsChange={(goals) => setData(prev => ({ ...prev, goals }))}
                                    />
                                )}

                                {step === 3 && (
                                    <StepProfile
                                        profile={data.profile}
                                        onProfileChange={(profile) => setData(prev => ({ ...prev, profile }))}
                                    />
                                )}

                                {step === 4 && (
                                    <StepPersonalization
                                        selectedCategories={data.preferredCategories}
                                        selectedBrands={data.preferredBrands}
                                        onCategoriesChange={(cats) => setData(prev => ({ ...prev, preferredCategories: cats }))}
                                        onBrandsChange={(brands) => setData(prev => ({ ...prev, preferredBrands: brands }))}
                                    />
                                )}

                                {step === 5 && (
                                    <StepWallet
                                        walletAddress={data.walletAddress}
                                        onConnect={handleWalletConnect}
                                        onSkip={handleWalletSkip}
                                    />
                                )}

                                {step === 6 && <StepEducation />}

                                {step === 7 && <StepFirstAction intent={data.intent} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Desktop Navigation (Bottom) */}
                    <div className="pt-10 mt-auto">
                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={goBack}
                                disabled={step === 1}
                                className={cn(
                                    "hidden lg:flex px-6 py-4 rounded-[16px] font-bold text-sm uppercase tracking-widest items-center gap-2 transition-all",
                                    step === 1
                                        ? "text-foreground/10 cursor-not-allowed"
                                        : "text-foreground/40 hover:text-foreground hover:bg-secondary"
                                )}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>

                            {step < TOTAL_STEPS ? (
                                <button
                                    onClick={goNext}
                                    disabled={!canContinue()}
                                    className={cn(
                                        "w-full lg:w-auto px-10 py-4 rounded-[16px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg",
                                        canContinue()
                                            ? "bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95"
                                            : "bg-secondary text-foreground/20 cursor-not-allowed shadow-none"
                                    )}
                                >
                                    Continue
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    className="w-full lg:w-auto px-10 py-4 rounded-[16px] bg-primary text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Check className="w-4 h-4" />
                                    Launch Aris
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
