"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface ChallengeCardProps {
    brand: string;
    title: string;
    rewardPool: string;
    progress: number;
    image: string;
}

export default function ChallengeCard({ brand, title, rewardPool, progress, image }: ChallengeCardProps) {
    return (
        <Link href={`/events/${brand.toLowerCase().replace(/ /g, '-')}`} className="block h-full">
            <motion.div
                whileHover={{ y: -4 }}
                className="bg-card rounded-[24px] overflow-hidden group cursor-pointer flex flex-col h-full hover:bg-card/90 transition-all relative border border-border shadow-spotify hover:shadow-xl"
            >
                {/* Image Area */}
                <div className="relative h-44 overflow-hidden">
                    <img
                        src={image}
                        alt={brand}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent opacity-60"></div>

                    <div className="absolute bottom-4 left-4">
                        <h4 className="font-black text-foreground text-xl leading-tight tracking-tight">{brand}</h4>
                        <p className="text-xs text-foreground/60 font-medium">{title}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1 justify-end">
                    <div className="mb-4">
                        <div className="text-3xl font-black text-foreground tracking-tighter mb-0.5">{rewardPool}</div>
                        <div className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Total Reward Pool</div>
                    </div>

                    <div className="w-full bg-secondary rounded-full h-1.5 mb-6 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>

                    <button className="w-full bg-foreground text-background text-xs font-black py-3.5 rounded-[16px] active:scale-[0.98] transition-all duration-150 ease-out shadow-lg hover:bg-foreground/90">
                        Participate
                    </button>
                </div>
            </motion.div>
        </Link>
    );
}
