"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { useSocket } from "./SocketContext";
import { useUser } from "./UserContext";
import { toast } from "sonner";
import { perfLog, perfNow } from "@/lib/perf";
import { apiRequest } from "@/services/api";

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    metadata?: any;
    isRead: boolean;
    createdAt: string;
    brand?: {
        id: string;
        name: string;
        logoCid?: string | null;
    } | null;
}

const PAGE_SIZE = 20;

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const cursorRef = useRef<string | null>(null);
    const loadingMoreRef = useRef(false);

    const { socket, isConnected } = useSocket();
    const { user } = useUser();

    useEffect(() => {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(true);
        setHasMore(false);
        cursorRef.current = null;
    }, [user?.id]);

    const fetchPage = useCallback(async (cursor: string | null, append: boolean) => {
        if (!user?.id) {
            setNotifications([]);
            setUnreadCount(0);
            setIsLoading(false);
            return;
        }

        const start = perfNow();
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
            if (cursor) params.set("cursor", cursor);

            const data = await apiRequest<{
                notifications: Notification[];
                nextCursor?: string;
                unreadCount?: number;
            }>(`/notifications?${params}`);

            const items: Notification[] = data.notifications || [];

            setNotifications(prev => append ? [...prev, ...items] : items);
            setHasMore(!!data.nextCursor);
            cursorRef.current = data.nextCursor ?? null;

            // Use server-provided unread count when available, else compute from first page
            if (!append) {
                setUnreadCount(
                    data.unreadCount !== undefined
                        ? data.unreadCount
                        : items.filter((n: Notification) => !n.isRead).length
                );
            }

            perfLog("notifications", `fetched page in ${(perfNow() - start).toFixed(1)}ms`, {
                count: items.length,
                append,
            });
        } catch (error: any) {
            if (error?.status === 404) {
                if (!append) { setNotifications([]); setUnreadCount(0); }
            } else {
                console.error("Failed to fetch notifications:", error);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    // Initial load
    useEffect(() => {
        if (!user?.id) return;

        const run = () => fetchPage(null, false);
        const idle =
            typeof window !== "undefined" && "requestIdleCallback" in window
                ? (window as any).requestIdleCallback(run, { timeout: 1500 })
                : null;
        const timer = idle ? null : setTimeout(run, 800);

        return () => {
            if (idle && typeof window !== "undefined" && "cancelIdleCallback" in window)
                (window as any).cancelIdleCallback(idle);
            if (timer) clearTimeout(timer);
        };
    }, [user?.id, fetchPage]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !hasMore || !cursorRef.current) return;
        loadingMoreRef.current = true;
        try {
            await fetchPage(cursorRef.current, true);
        } finally {
            loadingMoreRef.current = false;
        }
    }, [hasMore, fetchPage]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            setNotifications((prev) => {
                const target = prev.find((n) => n.id === notificationId);
                if (!target || target.isRead) return prev;
                setUnreadCount((c) => Math.max(0, c - 1));
                return prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
            });
            await apiRequest(`/notifications/${notificationId}/read`, { method: "PATCH" });
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await apiRequest("/notifications/read-all", { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    }, []);

    const refreshNotifications = useCallback(async () => {
        cursorRef.current = null;
        await fetchPage(null, false);
    }, [fetchPage]);

    // Real-time socket events
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNotification = (notification: Notification) => {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            toast.success(notification.title, {
                description: notification.message,
                duration: 5000,
            });
        };

        socket.on("notification", handleNotification);
        socket.on("personal-notification", handleNotification);

        return () => {
            socket.off("notification", handleNotification);
            socket.off("personal-notification", handleNotification);
        };
    }, [socket, isConnected]);

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, isLoading, hasMore, loadMore, markAsRead, markAllAsRead, refreshNotifications }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
    return context;
}
