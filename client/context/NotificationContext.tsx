"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useSocket } from "./SocketContext";
import { useUser } from "./UserContext";
import { toast } from "sonner";

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: string;
}

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { socket, isConnected } = useSocket();
    const { user } = useUser();

    useEffect(() => {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(true);
    }, [user?.id]);

    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("authToken");

            if (!token || !user?.id) {
                setNotifications([]);
                setUnreadCount(0);
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(
                    (data.notifications || []).filter((n: Notification) => !n.isRead).length
                );
            } else if (response.status === 404) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            // Optimistically update state first, only decrement if it was unread
            setNotifications((prev) => {
                const target = prev.find((n) => n.id === notificationId);
                if (!target || target.isRead) return prev; // already read, no-op
                setUnreadCount((c) => Math.max(0, c - 1));
                return prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
            });

            await fetch(`${API_URL}/notifications/${notificationId}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return;

            const response = await fetch(`${API_URL}/notifications/read-all`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    }, []);

    const refreshNotifications = useCallback(async () => {
        await fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (user?.id) fetchNotifications();
    }, [user?.id, fetchNotifications]);

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
            value={{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications }}
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
