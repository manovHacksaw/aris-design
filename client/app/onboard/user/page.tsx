"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Target, Globe, Heart, BarChart2, Users, Wallet, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { saveOnboardingAnalytics, applyReferralCode } from "@/services/user.service";

import OnboardingShell, { type StepMeta } from "@/components/onboarding/OnboardingShell";
import StepIdentity, { type IdentityData } from "@/components/onboarding/steps/StepIdentity";
import StepIntent, { type IntentData } from "@/components/onboarding/steps/StepIntent";
import StepWeb3, { type Web3Data } from "@/components/onboarding/steps/StepWeb3";
import StepInterests, { type InterestsData } from "@/components/onboarding/steps/StepInterests";
import StepBehavior, { type BehaviorData } from "@/components/onboarding/steps/StepBehavior";
import StepNetwork, { type NetworkData } from "@/components/onboarding/steps/StepNetwork";
import StepWalletIntro from "@/components/onboarding/steps/StepWalletIntro";
import StepComplete from "@/components/onboarding/steps/StepComplete";

// ─── Step metadata (left panel content) ──────────────────────────────────────

const STEP_META: StepMeta[] = [
  {
    Icon: User,
    title: "Create Your\nIdentity",
    subtitle: "Set up your Aris profile. Choose a unique username.",
    hints: [
      "Display name is visible to everyone and can be changed later",
      "Username — lowercase letters and numbers only",
      "Upload a profile photo to stand out in the community",
    ],
    bg: "https://images.unsplash.com/flagged/photo-1574164908900-6275ca361157?q=80&w=735&auto=format&fit=crop",
  },
  {
    Icon: Target,
    title: "Your Goals\nOn Aris",
    subtitle: "Tell us why you're here so we can personalise your experience from day one.",
    hints: [
      "Select everything that interests you — no wrong answers",
      "Your goals shape your feed, notifications, and recommendations",
      "You can update your goals later in profile settings",
    ],
    bg: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Globe,
    title: "Web3\nComfort Level",
    subtitle: "This helps us adjust hints, tooltips, and feature visibility to match your experience.",
    hints: [
      "Beginners get step-by-step guidance throughout the app",
      "Advanced users unlock power features like raw wallet control",
      "You can change this in settings as you learn more",
    ],
    bg: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1332&auto=format&fit=crop",
  },
  {
    Icon: Heart,
    title: "Find Your\nTribe",
    subtitle: "Pick your interests to personalise your feed and unlock relevant campaigns.",
    hints: [
      "Select at least 3 interests to continue",
      "More specific selections lead to better brand matches",
      "You can always update these from your profile settings",
    ],
    bg: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: BarChart2,
    title: "Help Us\nImprove",
    subtitle: "Quick anonymous questions that help us build a better platform for everyone.",
    hints: [
      "All answers are anonymous and for internal analytics only",
      "This data is never shown back to you or made public",
      "Skipping individual questions is totally fine",
    ],
    bg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Users,
    title: "Seed Your\nFeed",
    subtitle: "Follow brands and creators you like to get a personalised feed from the start.",
    hints: [
      "Suggestions are based on your interests and goals",
      "You can unfollow at any time from their profiles",
      "Skip this step if you prefer to discover organically",
    ],
    bg: "https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1074&auto=format&fit=crop",
  },
  {
    Icon: Wallet,
    title: "Your Wallet\nIs Ready",
    subtitle: "A gasless smart account was created for you automatically. Here's how rewards work.",
    hints: [
      "No seed phrase needed — your wallet is secured by your login",
      "All transactions are gasless — we cover the fees for you",
      "Rewards are paid in USDC directly to your smart account",
    ],
    bg: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1332&auto=format&fit=crop",
  },
  {
    Icon: Sparkles,
    title: "You're\nAll Set!",
    subtitle: "Your profile is live. Jump into your first campaign and start earning.",
    hints: [
      "You've earned +10 XP just for completing onboarding",
      "Your Early Explorer badge has been unlocked",
      "Your personalised feed is ready — dive in!",
    ],
    bg: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1074&auto=format&fit=crop",
  },
];

// ─── Form state ───────────────────────────────────────────────────────────────

interface OnboardingForm {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  gender: string;
  phoneNumber: string;
  dateOfBirth: string;
  intentGoals: string[];
  web3Level: "beginner" | "basic" | "intermediate" | "advanced" | "";
  preferredCategories: string[];
  creatorType: string;
  contentFormat: string;
  analyticsData: Partial<BehaviorData>;
  followedBrands: string[];
  followedCreators: string[];
}

function detectResumeStep(d: any): number {
  if (!d) return 1;
  if (!d.displayName || !d.username) return 1;
  if (!d.intentGoals?.length) return 2;
  if (!d.web3Level) return 3;
  if (!d.preferredCategories?.length) return 4;
  return 5;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserOnboarding() {
  const router = useRouter();
  const { isConnected, isInitialized, isLoading: walletLoading, userInfo } = useWallet();
  const { completeOnboarding, setOnboardingData, isOnboarded, onboardingData, isLoading: authLoading } = useAuth();
  const { updateProfile, user } = useUser();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<OnboardingForm>({
    displayName: onboardingData?.displayName || userInfo?.name || "",
    username: onboardingData?.username || "",
    bio: onboardingData?.bio || "",
    avatarUrl: onboardingData?.avatarUrl || userInfo?.profileImage || "",
    gender: onboardingData?.gender || "",
    phoneNumber: onboardingData?.phoneNumber || "",
    dateOfBirth: onboardingData?.dateOfBirth || "",
    intentGoals: onboardingData?.intentGoals || [],
    web3Level: (onboardingData?.web3Level as OnboardingForm["web3Level"]) || "",
    preferredCategories: onboardingData?.preferredCategories || [],
    creatorType: onboardingData?.creatorType || "",
    contentFormat: onboardingData?.contentFormat || "",
    analyticsData: (onboardingData?.analyticsData as Partial<BehaviorData>) || {},
    followedBrands: onboardingData?.followedBrands || [],
    followedCreators: onboardingData?.followedCreators || [],
  });

  useEffect(() => {
    if (!isInitialized || walletLoading) return;
    if (!isConnected) router.replace("/register");
  }, [isConnected, isInitialized, walletLoading, router]);

  useEffect(() => {
    if (!authLoading && isOnboarded) router.replace("/");
  }, [isOnboarded, authLoading, router]);

  useEffect(() => {
    if (!authLoading && onboardingData) {
      const resumeStep = detectResumeStep(onboardingData);
      if (resumeStep > 1) setStep(resumeStep);
    }
  }, [authLoading]);

  useEffect(() => {
    if (userInfo?.name && !form.displayName) setForm(f => ({ ...f, displayName: userInfo.name! }));
    if (userInfo?.profileImage && !form.avatarUrl) setForm(f => ({ ...f, avatarUrl: userInfo.profileImage! }));
  }, [userInfo]);

  const advance = (partial: Partial<OnboardingForm>) => {
    const next = { ...form, ...partial };
    setForm(next);
    setOnboardingData({
      role: "user",
      displayName: next.displayName,
      username: next.username,
      bio: next.bio,
      avatarUrl: next.avatarUrl,
      gender: next.gender,
      phoneNumber: next.phoneNumber,
      dateOfBirth: next.dateOfBirth,
      intentGoals: next.intentGoals,
      web3Level: next.web3Level as any,
      preferredCategories: next.preferredCategories,
      creatorType: next.creatorType,
      contentFormat: next.contentFormat,
      analyticsData: next.analyticsData as any,
      followedBrands: next.followedBrands,
      followedCreators: next.followedCreators,
      onboardingStep: step + 1,
    });
    setStep(s => s + 1);
  };

  const back = () => setStep(s => Math.max(1, s - 1));

  const handleComplete = async (appliedReferralCode?: string) => {
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        gender: form.gender || undefined,
        phoneNumber: form.phoneNumber || undefined,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        preferredCategories: form.preferredCategories,
        isOnboarded: true,
        intentGoals: form.intentGoals,
        web3Level: form.web3Level || undefined,
        contentFormat: form.contentFormat || undefined,
        creatorCategories: form.creatorType ? [form.creatorType] : [],
        onboardingStep: 8,
      });

      if (Object.values(form.analyticsData).some(Boolean)) {
        saveOnboardingAnalytics({
          adsSeenDaily: form.analyticsData.adsSeenDaily,
          referralSource: form.analyticsData.referralSource,
          joinMotivation: form.analyticsData.joinMotivation,
          socialPlatforms: form.analyticsData.socialPlatforms,
          rewardPreference: form.analyticsData.rewardPreference,
          engagementStyle: form.analyticsData.engagementStyle,
        }).catch(err => console.warn("Analytics save failed:", err));
      }

      if (appliedReferralCode) {
        try {
          const result = await applyReferralCode(appliedReferralCode);
          toast.success(result.message || "Referral applied!");
        } catch (err: any) {
          // Non-fatal — warn but don't block onboarding
          toast.warning(err?.message || "Referral code could not be applied.");
        }
      }

      completeOnboarding({
        role: "user",
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        gender: form.gender,
        phoneNumber: form.phoneNumber,
        dateOfBirth: form.dateOfBirth,
        intentGoals: form.intentGoals,
        web3Level: form.web3Level as any,
        preferredCategories: form.preferredCategories,
        creatorType: form.creatorType,
        contentFormat: form.contentFormat,
        followedBrands: form.followedBrands,
        followedCreators: form.followedCreators,
        isOnboarded: true,
      });

      toast.success("Welcome to Aris!");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isInitialized || walletLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isOnboarded) return null;

  const meta = STEP_META[step - 1];

  return (
    <OnboardingShell step={step} total={8} meta={meta}>

      {step === 1 && (
        <StepIdentity
          initial={{ displayName: form.displayName, username: form.username, bio: form.bio, avatarUrl: form.avatarUrl, gender: form.gender, phoneNumber: form.phoneNumber, dateOfBirth: form.dateOfBirth }}
          prefillName={userInfo?.name}
          prefillAvatar={userInfo?.profileImage}
          onNext={(data: IdentityData) => advance(data)}
        />
      )}

      {step === 2 && (
        <StepIntent
          initial={{ intentGoals: form.intentGoals }}
          onNext={(data: IntentData) => advance(data)}
          onBack={back}
        />
      )}

      {step === 3 && (
        <StepWeb3
          initial={{ web3Level: form.web3Level as any }}
          onNext={(data: Web3Data) => advance(data)}
          onBack={back}
        />
      )}

      {step === 4 && (
        <StepInterests
          initial={{ preferredCategories: form.preferredCategories, creatorType: form.creatorType, contentFormat: form.contentFormat }}
          onNext={(data: InterestsData) => advance({ preferredCategories: data.preferredCategories, creatorType: data.creatorType, contentFormat: data.contentFormat })}
          onBack={back}
        />
      )}

      {step === 5 && (
        <StepBehavior
          initial={form.analyticsData}
          onNext={(data: BehaviorData) => advance({ analyticsData: data })}
          onBack={back}
        />
      )}

      {step === 6 && (
        <StepNetwork
          initial={{ followedBrands: form.followedBrands, followedCreators: form.followedCreators }}
          onNext={(data: NetworkData) => advance(data)}
          onBack={back}
        />
      )}

      {step === 7 && (
        <StepWalletIntro
          onNext={() => setStep(8)}
          onBack={back}
        />
      )}

      {step === 8 && (
        <StepComplete
          displayName={form.displayName}
          referralCode={user?.referralCode}
          isSaving={isSaving}
          onComplete={(code) => handleComplete(code)}
          onBack={back}
        />
      )}

    </OnboardingShell>
  );
}
