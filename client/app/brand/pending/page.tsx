"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, Mail, LogOut, RefreshCw } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useUser } from "@/context/UserContext";

export default function BrandPendingPage() {
  const router = useRouter();
  const { disconnect, isConnected } = useWallet();
  const { user, refreshUser } = useUser();

  // If the brand gets approved and claims, redirect them to dashboard
  useEffect(() => {
    if (user?.ownedBrands?.[0]?.isActive === true) {
      router.replace("/brand/dashboard");
    }
  }, [user, router]);

  const handleRefresh = async () => {
    await refreshUser();
  };

  const handleLogout = async () => {
    await disconnect();
    router.replace("/register");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Status card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Under Review</h1>
          <p className="text-zinc-400 leading-relaxed">
            Your brand application has been submitted and is being reviewed by our team.
            You'll receive an email with an activation link once approved.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">What happens next</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Application submitted</p>
                <p className="text-xs text-zinc-500 mt-0.5">Your brand details have been received</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Admin review</p>
                <p className="text-xs text-zinc-500 mt-0.5">Our team will review your application</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">Activation email</p>
                <p className="text-xs text-zinc-600 mt-0.5">You'll receive a link to activate your brand account</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Check Status
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-900/50 bg-red-900/10 text-red-400 hover:bg-red-900/20 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Already have an activation link?{" "}
          <a href="/claim-brand" className="text-orange-500 hover:text-orange-400 transition-colors">
            Activate your brand
          </a>
        </p>
      </div>
    </div>
  );
}
