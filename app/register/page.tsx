"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { RoleCard } from "@/components/RoleCard";
import { ArrowRight, Check } from "lucide-react";

export default function Register() {
    const [selectedRole, setSelectedRole] = useState<"user" | "brand" | null>("user"); // Default selected as per requirement
    const router = useRouter();

    const handleContinue = () => {
        if (selectedRole === "user") {
            router.push("/signup/user");
        } else if (selectedRole === "brand") {
            router.push("/signup/brand");
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-white font-sans selection:bg-primary/30">
            {/* Top Hero Image */}
            <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-background/90 to-background z-10" />
                <AnimatePresence mode="wait">
                    <motion.img
                        key={selectedRole}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        src={selectedRole === "brand"
                            ? "https://images.unsplash.com/photo-1599658880436-c61792e70672?q=80&w=1170&auto=format&fit=crop"
                            : "https://images.unsplash.com/flagged/photo-1574164908900-6275ca361157?q=80&w=735&auto=format&fit=crop"
                        }
                        alt="Hero Background"
                        className="w-full h-full object-cover absolute inset-0"
                    />
                </AnimatePresence>
            </div>

            <div className="relative z-20 flex flex-col flex-1 items-center px-6 md:px-0 max-w-md mx-auto w-full pt-32 pb-12">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center mb-10 space-y-3"
                >
                    <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
                        Choose your path
                    </h1>
                    <p className="text-white/60 text-base font-medium leading-relaxed max-w-lg mx-auto">
                        Join as a creator to verify your attention and earn real rewards, <br className="hidden md:block" /> or sign up as a brand to launch immense campaigns and grow your audience.
                    </p>
                </motion.div>

                {/* Selection Cards */}
                <div className="w-full space-y-4 mb-10">
                    <RoleCard
                        title="Register as User"
                        description="View ads, create content, vote on community posts, and earn real money for your attention and engagement."
                        isSelected={selectedRole === "user"}
                        onClick={() => setSelectedRole("user")}
                        delay={0.1}
                    />

                    <RoleCard
                        title="Register as Brand"
                        description="Launch ad challenges, collect creative submissions from thousands of users, and track real-time engagement data."
                        isSelected={selectedRole === "brand"}
                        onClick={() => setSelectedRole("brand")}
                        delay={0.2}
                    />
                </div>

                {/* Continue Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-full mt-auto mb-6"
                >
                    <motion.button
                        onClick={handleContinue}
                        disabled={!selectedRole}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                            "w-full py-4 rounded-[16px] font-bold text-lg transition-all duration-150 ease-out shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
                            selectedRole
                                ? "bg-primary text-white hover:bg-primary/90 hover:-translate-y-[1px] cursor-pointer"
                                : "bg-card text-white/20 cursor-not-allowed border border-border"
                        )}
                    >
                        Continue
                    </motion.button>
                </motion.div>

            </div>
        </div>
    );
}
