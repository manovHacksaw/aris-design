"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "./UserContext";
import { SOCKET_URL, getAuthToken } from "@/services/api";
import { perfLog, perfNow } from "@/lib/perf";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user, isLoading } = useUser();

    const connect = useCallback(async () => {
        if (socket?.connected) return;
        const start = perfNow();

        const token = await getAuthToken();
        if (!token) return;

        const newSocket = io(SOCKET_URL, {
            autoConnect: false,
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        newSocket.on("connect", () => {
            console.log("✅ Socket connected:", newSocket.id);
            perfLog("socket", `connected in ${(perfNow() - start).toFixed(1)}ms`);
            setIsConnected(true);
        });

        newSocket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", reason);
            setIsConnected(false);
        });

        newSocket.on("connect_error", (error) => {
            console.error("Socket connection error:", error.message);
            setIsConnected(false);
        });

        newSocket.on("error", (error) => {
            console.error("Socket error:", error);
        });

        newSocket.connect();
        setSocket(newSocket);
    }, [socket]);

    const disconnect = useCallback(() => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    }, [socket]);

    useEffect(() => {
        if (isLoading) return;
        if (user && !socket) {
            const timer = setTimeout(() => connect(), 1200);
            return () => clearTimeout(timer);
        }
        if (!user && socket) {
            const timer = setTimeout(() => disconnect(), 0);
            return () => clearTimeout(timer);
        }
    }, [user, isLoading, socket, connect, disconnect]);

    useEffect(() => {
        return () => {
            if (socket) socket.disconnect();
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) throw new Error("useSocket must be used within a SocketProvider");
    return context;
}
