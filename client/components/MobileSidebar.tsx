"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    IoTrophyOutline, IoTrophy,
    IoPersonOutline, IoPerson,
    IoSettingsOutline,
    IoPulseOutline,
    IoBookmarkOutline,
    IoWarningOutline,
    IoDocumentTextOutline,
    IoLogOutOutline,
    IoPersonAddOutline,
    IoCloseOutline,
} from "react-icons/io5";
import { useSidebar } from "@/context/SidebarContext";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@/context/WalletContext";
import { useLoginModal } from "@/context/LoginModalContext";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

const primaryItems = [
    { label: "Leaderboard", href: "/leaderboard", icon: IoTrophyOutline, activeIcon: IoTrophy, requiresAuth: false },
    { label: "Profile", href: "/profile", icon: IoPersonOutline, activeIcon: IoPerson, requiresAuth: true },
];

const authItems = [
    { label: "Settings", href: "/settings", icon: IoSettingsOutline },
];

const publicItems = [
    { label: "Report a Problem", href: "/report", icon: IoWarningOutline },
    { label: "Terms & Conditions", href: "/terms", icon: IoDocumentTextOutline },
];

export default function MobileSidebar() {
    const pathname = usePathname();
    const { isMobileOpen, setMobileOpen } = useSidebar();
    const { logout } = usePrivy();
    const { isAuthenticated } = useWallet();
    const { openLoginModal } = useLoginModal();
    const { user } = useUser();

    const close = () => setMobileOpen(false);

    const handleProtectedClick = (e: React.MouseEvent, item: typeof primaryItems[0]) => {
        if (item.requiresAuth && !isAuthenticated) {
            e.preventDefault();
            close();
            openLoginModal();
            return;
        }
        close();
    };

    return (
        <AnimatePresence>
            {isMobileOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={close}
                        className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        key="drawer"
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="md:hidden fixed top-0 left-0 h-full w-72 z-[61] bg-card border-r border-border/50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                    <span className="text-primary-foreground font-bold text-sm">A</span>
                                </div>
                                <span className="text-lg font-bold tracking-tight text-foreground">Aris</span>
                            </div>
                            <button onClick={close} className="p-1.5 rounded-lg hover:bg-secondary text-foreground/60 transition-colors">
                                <IoCloseOutline size={20} />
                            </button>
                        </div>

                        {/* User info */}
                        {isAuthenticated && user && (
                            <div className="px-5 py-4 border-b border-border/50">
                                <div className="flex items-center gap-3">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                            <span className="text-primary font-bold text-sm">{user.username?.[0]?.toUpperCase() ?? "U"}</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{user.username}</p>
                                        <p className="text-xs text-foreground/40">{user.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Nav items */}
                        <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
                            {primaryItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = isActive ? item.activeIcon : item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={(e) => handleProtectedClick(e, item)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-foreground/60 hover:text-foreground hover:bg-secondary"
                                        )}
                                    >
                                        <Icon size={20} />
                                        {item.label}
                                    </Link>
                                );
                            })}

                            <div className="h-px bg-border my-2 mx-2" />

                            {isAuthenticated && authItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={close}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    <item.icon size={20} />
                                    {item.label}
                                </Link>
                            ))}

                            {publicItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={close}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    <item.icon size={20} />
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* Footer: sign out / sign in */}
                        <div className="px-3 py-4 border-t border-border/50">
                            {isAuthenticated ? (
                                <button
                                    onClick={() => { close(); logout(); }}
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/8 transition-colors"
                                >
                                    <IoLogOutOutline size={20} />
                                    Sign out
                                </button>
                            ) : (
                                <button
                                    onClick={() => { close(); openLoginModal(); }}
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                                >
                                    <IoPersonAddOutline size={20} />
                                    Sign in to Aris
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
