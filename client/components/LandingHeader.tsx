"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingHeader() {
    const navLinks = [
        { label: "Home", href: "/" },
        { label: "How it Works", href: "#how-it-works" },
        { label: "For Brands", href: "#brands" },
        { label: "About", href: "#about" },
    ];

    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 w-full max-w-[1400px] mx-auto"
        >
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tighter text-foreground">ARIS</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/70">
                {navLinks.map((link) => (
                    <Link
                        key={link.label}
                        href={link.href}
                        className="hover:text-primary transition-colors duration-200"
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <div className="hidden md:block">
                    <ThemeToggle />
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden p-2 text-foreground/80 hover:text-foreground">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </motion.header>
    );
}
