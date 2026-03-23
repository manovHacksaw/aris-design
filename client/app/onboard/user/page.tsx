"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, IdCard, Target, Heart, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import type { OnboardingData } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { saveOnboardingAnalytics, applyReferralCode } from "@/services/user.service";

import OnboardingShell, { type StepMeta } from "@/components/onboarding/OnboardingShell";
import StepIdentity, { type IdentityData } from "@/components/onboarding/steps/StepIdentity";
import StepPersonalDetails, { type PersonalDetailsData } from "@/components/onboarding/steps/StepPersonalDetails";
import StepIntent, { type IntentData } from "@/components/onboarding/steps/StepIntent";
import StepInterests, { type InterestsData } from "@/components/onboarding/steps/StepInterests";
import StepBehavior, { type BehaviorData } from "@/components/onboarding/steps/StepBehavior";
import StepNetwork, { type NetworkData } from "@/components/onboarding/steps/StepNetwork";
import StepComplete from "@/components/onboarding/steps/StepComplete";

const STEP_META: StepMeta[] = [
  {
    Icon: User,
    title: "Account\nSetup",
    subtitle: "Add your identity details to create your public Aris profile.",
    hints: [
      "Name and username are required",
      "Bio and profile photo are optional",
      "Add a referral code now if you have one",
    ],
    bg: "https://images.unsplash.com/photo-1574164908900-6275ca361157?q=80&w=735&auto=format&fit=crop",
  },
  {
    Icon: IdCard,
    title: "Personal\nDetails",
    subtitle: "Set your age and gender so we can personalize safely.",
    hints: [
      "Minimum age is 16 years",
      "Gender options: Male, Female, Other",
      "This can be updated later in settings",
    ],
    bg: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Target,
    title: "Your\nInterest",
    subtitle: "Choose how you want to engage on Aris.",
    hints: [
      "Pick one or multiple options",
      "This helps personalize recommendations",
      "You can change this later",
    ],
    bg: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Heart,
    title: "Brand + Domain\nPreferences",
    subtitle: "Select categories and domains you want to see first.",
    hints: [
      "Choose at least one brand category",
      "Choose at least one domain",
      "These preferences shape your initial feed",
    ],
    bg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1170&auto=format&fit=crop",
  },
  {
    Icon: Sparkles,
    title: "Discovery +\nTheme",
    subtitle: "Tell us how you found us and pick Bright or Dark mode.",
    hints: [
      "Source selection is optional",
      "Theme applies immediately",
      "You can toggle theme anytime",
    ],
    bg: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1074&auto=format&fit=crop",
  },
  {
    Icon: Users,
    title: "Follow Brands\n& Creators",
    subtitle: "Seed your feed by following profiles now, or skip.",
    hints: [
      "Completely optional step",
      "Unfollow anytime later",
      "This only affects initial feed quality",
    ],
    bg: "https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1074&auto=format&fit=crop",
  },
  {
    Icon: Sparkles,
    title: "Welcome\nTo Aris",
    subtitle: "Finish onboarding and choose whether to run the brief platform tour.",
    hints: [
      "Tour is 7 short steps",
      "You can skip and start exploring immediately",
      "Welcome bonus is unlocked",
    ],
    bg: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1170&auto=format&fit=crop",
  },
];

interface OnboardingForm {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl: string;
  incomingReferralCode: string;
  gender: string;
  dateOfBirth: string;
  intentGoals: string[];
  preferredCategories: string[];
  preferredDomains: string[];
  analyticsData: Partial<BehaviorData>;
  followedBrands: string[];
  followedCreators: string[];
}

function detectResumeStep(d: Partial<OnboardingData> | null): number {
  if (!d) return 1;
  if (!d.displayName || !d.username) return 1;
  if (!d.dateOfBirth || !d.gender) return 2;
  if (!d.intentGoals?.length) return 3;
  if (!d.preferredCategories?.length) return 4;
  return 5;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export default function UserOnboarding() {
  const router = useRouter();
  const { isConnected, isInitialized, isLoading: walletLoading, userInfo } = useWallet();
  const { completeOnboarding, setOnboardingData, isOnboarded, onboardingData, isLoading: authLoading } = useAuth();
  const { updateProfile } = useUser();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const hasResumed = useRef(false);

  const [form, setForm] = useState<OnboardingForm>({
    displayName: onboardingData?.displayName || userInfo?.name || "",
    username: onboardingData?.username || "",
    email: onboardingData?.email || userInfo?.email || "",
    bio: onboardingData?.bio || "",
    avatarUrl: onboardingData?.avatarUrl || userInfo?.profileImage || "",
    incomingReferralCode: onboardingData?.incomingReferralCode || "",
    gender: onboardingData?.gender || "",
    dateOfBirth: onboardingData?.dateOfBirth || "",
    intentGoals: onboardingData?.intentGoals || [],
    preferredCategories: onboardingData?.preferredCategories || [],
    preferredDomains: onboardingData?.preferredDomains || [],
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
    if (!authLoading && onboardingData && !hasResumed.current) {
      hasResumed.current = true;
      const resumeStep = detectResumeStep(onboardingData);
      if (resumeStep > 1) setStep(resumeStep);
    }
  }, [authLoading, onboardingData]);

  useEffect(() => {
    if (userInfo?.name && !form.displayName) setForm(f => ({ ...f, displayName: userInfo.name! }));
    if (userInfo?.profileImage && !form.avatarUrl) setForm(f => ({ ...f, avatarUrl: userInfo.profileImage! }));
    if (userInfo?.email && !form.email) setForm(f => ({ ...f, email: userInfo.email! }));
  }, [userInfo, form.displayName, form.avatarUrl, form.email]);

  const advance = (partial: Partial<OnboardingForm>) => {
    const next = { ...form, ...partial };
    setForm(next);
    setOnboardingData({
      role: "user",
      displayName: next.displayName,
      username: next.username,
      email: next.email,
      bio: next.bio,
      avatarUrl: next.avatarUrl,
      incomingReferralCode: next.incomingReferralCode,
      gender: next.gender,
      dateOfBirth: next.dateOfBirth,
      intentGoals: next.intentGoals,
      preferredCategories: next.preferredCategories,
      preferredDomains: next.preferredDomains,
      analyticsData: next.analyticsData,
      followedBrands: next.followedBrands,
      followedCreators: next.followedCreators,
      onboardingStep: step + 1,
    });
    setStep(s => s + 1);
  };

  const back = () => setStep(s => Math.max(1, s - 1));

  const handleComplete = async (startTour: boolean) => {
    setIsSaving(true);
    try {
      await updateProfile({
        email: form.email || undefined,
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        preferredCategories: form.preferredCategories,
        creatorCategories: form.preferredDomains,
        isOnboarded: true,
        intentGoals: form.intentGoals,
        onboardingStep: 7,
      });

      if (form.analyticsData.referralSource || form.analyticsData.themePreference) {
        saveOnboardingAnalytics({
          referralSource: form.analyticsData.referralSource,
        }).catch(err => console.warn("Analytics save failed:", err));
      }

      if (form.incomingReferralCode) {
        try {
          const result = await applyReferralCode(form.incomingReferralCode);
          toast.success(result.message || "Referral applied!");
        } catch (err: unknown) {
          toast.warning(getErrorMessage(err, "Referral code could not be applied."));
        }
      }

      completeOnboarding({
        role: "user",
        displayName: form.displayName,
        username: form.username,
        email: form.email,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        incomingReferralCode: form.incomingReferralCode,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        intentGoals: form.intentGoals,
        preferredCategories: form.preferredCategories,
        preferredDomains: form.preferredDomains,
        followedBrands: form.followedBrands,
        followedCreators: form.followedCreators,
        themePreference:
          form.analyticsData.themePreference === "light" || form.analyticsData.themePreference === "dark"
            ? form.analyticsData.themePreference
            : undefined,
        isOnboarded: true,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("aris_start_platform_tour", startTour ? "true" : "false");
      }

      toast.success("Welcome to Aris!");
      router.push("/");
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, "Something went wrong. Please try again."));
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
    <OnboardingShell step={step} total={7} meta={meta}>

      {step === 1 && (
        <StepIdentity
          initial={{
            displayName: form.displayName,
            username: form.username,
            email: form.email,
            bio: form.bio,
            avatarUrl: form.avatarUrl,
            incomingReferralCode: form.incomingReferralCode,
          }}
          prefillName={userInfo?.name}
          prefillAvatar={userInfo?.profileImage}
          onNext={(data: IdentityData) => advance(data)}
        />
      )}

      {step === 2 && (
        <StepPersonalDetails
          initial={{ dateOfBirth: form.dateOfBirth, gender: form.gender }}
          onNext={(data: PersonalDetailsData) => advance(data)}
          onBack={back}
        />
      )}

      {step === 3 && (
        <StepIntent
          initial={{ intentGoals: form.intentGoals }}
          onNext={(data: IntentData) => advance(data)}
          onBack={back}
        />
      )}

      {step === 4 && (
        <StepInterests
          initial={{ preferredBrandCategories: form.preferredCategories, preferredDomains: form.preferredDomains }}
          onNext={(data: InterestsData) =>
            advance({
              preferredCategories: data.preferredBrandCategories,
              preferredDomains: data.preferredDomains,
            })
          }
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
          preferredCategories={form.preferredCategories}
          onNext={(data: NetworkData) => advance(data)}
          onBack={back}
        />
      )}

      {step === 7 && (
        <StepComplete
          displayName={form.displayName}
          isSaving={isSaving}
          onComplete={(startTour) => handleComplete(startTour)}
          onBack={back}
        />
      )}

    </OnboardingShell>
  );
}
