"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    expandSidebar: () => void;
    collapseSidebar: () => void;
    isMobileOpen: boolean;
    toggleMobileSidebar: () => void;
    setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // Default to collapsed as per user request
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Load state from localStorage on mount
        const storedState = localStorage.getItem("sidebar-collapsed");
        if (storedState !== null) {
            setIsCollapsed(storedState === "true");
        }
        setIsInitialized(true);
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed((prev) => {
            const newState = !prev;
            localStorage.setItem("sidebar-collapsed", String(newState));
            return newState;
        });
    };

    const expandSidebar = () => {
        setIsCollapsed(false);
        localStorage.setItem("sidebar-collapsed", "false");
    };

    const collapseSidebar = () => {
        setIsCollapsed(true);
        localStorage.setItem("sidebar-collapsed", "true");
    };

    const toggleMobileSidebar = () => setIsMobileOpen(prev => !prev);
    const setMobileOpen = (open: boolean) => setIsMobileOpen(open);

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                toggleSidebar,
                expandSidebar,
                collapseSidebar,
                isMobileOpen,
                toggleMobileSidebar,
                setMobileOpen,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}
