"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, BRANDS } from "@/types/onboarding";

interface StepPersonalizationProps {
    selectedCategories: string[];
    selectedBrands: string[];
    onCategoriesChange: (categories: string[]) => void;
    onBrandsChange: (brands: string[]) => void;
}

export default function StepPersonalization({
    selectedCategories,
    selectedBrands,
    onCategoriesChange,
    onBrandsChange,
}: StepPersonalizationProps) {
    const toggleCategory = (id: string) => {
        onCategoriesChange(
            selectedCategories.includes(id)
                ? selectedCategories.filter(c => c !== id)
                : [...selectedCategories, id]
        );
    };

    const toggleBrand = (id: string) => {
        onBrandsChange(
            selectedBrands.includes(id)
                ? selectedBrands.filter(b => b !== id)
                : [...selectedBrands, id]
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-black text-foreground tracking-tighter"
                >
                    Personalize Your Feed
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs text-foreground/40 font-bold"
                >
                    Select what interests you. We&apos;ll tailor your experience.
                </motion.p>
            </div>

            {/* Categories */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <h3 className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                                    isSelected
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-secondary border-border/40 text-foreground/60 hover:border-border"
                                )}
                            >
                                {isSelected && <Check className="w-3 h-3" />}
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Brands */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-3">Follow Brands</h3>
                <div className="grid grid-cols-2 gap-3">
                    {BRANDS.map((brand) => {
                        const isSelected = selectedBrands.includes(brand.id);
                        return (
                            <button
                                key={brand.id}
                                onClick={() => toggleBrand(brand.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3.5 rounded-[14px] border transition-all text-left",
                                    isSelected
                                        ? "bg-primary/5 border-primary/30"
                                        : "bg-card border-border/40 hover:border-border"
                                )}
                            >
                                <img
                                    src={brand.avatar}
                                    alt={brand.name}
                                    className="w-9 h-9 rounded-xl object-cover shrink-0"
                                />
                                <span className={cn(
                                    "text-xs font-black tracking-tight transition-colors",
                                    isSelected ? "text-foreground" : "text-foreground/60"
                                )}>
                                    {brand.name}
                                </span>
                                <div className="ml-auto shrink-0">
                                    {isSelected ? (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-foreground/15" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
