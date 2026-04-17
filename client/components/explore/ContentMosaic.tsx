"use client";

import { motion } from "framer-motion";
import { Heart, User } from "lucide-react";
import { useRouter } from "next/navigation";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";

interface ContentMosaicProps {
    submissions: any[];
}

export default function ContentMosaic({ submissions }: ContentMosaicProps) {
    const router = useRouter();

    if (!submissions || submissions.length === 0) return null;

    return (
        <div className="columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4 pb-12">
            {submissions.map((sub, i) => {
                const image = sub.imageUrl || (sub.imageCid ? `${PINATA_GW}/${sub.imageCid}` : "");
                const avatar = sub.user?.avatarUrl;
                return (
                    <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (i % 10) * 0.05 }}
                        className="break-inside-avoid cursor-pointer group relative rounded-2xl overflow-hidden bg-foreground/5"
                        onClick={() => router.push(`/events/${sub.eventId}?submission=${sub.id}`)}
                    >
                        {image ? (
                            <img src={image} alt="Submission" className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className="w-full aspect-square flex items-center justify-center p-4 text-center text-white/40 text-sm">
                                {sub.caption || "Text Submission"}
                            </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/80 via-black/10 dark:via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0">
                                        {avatar ? (
                                            <img src={avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-white" />
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-white uppercase truncate">
                                        @{sub.user?.username || "anonymous"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full shrink-0">
                                    <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                                    <span className="text-[10px] font-black text-white">{sub.voteCount || 0}</span>
                                </div>
                            </div>
                            {sub.event && (
                                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-2 truncate">
                                    {sub.event.title}
                                </p>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
