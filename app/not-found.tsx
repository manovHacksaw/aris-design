"use client";

import Link from "next/link";
import SidebarLayout from "@/components/home/SidebarLayout";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
            <SidebarLayout>
                <main className="flex-1 flex flex-col w-full items-center justify-center min-h-[80vh]">
                    <div className="text-center space-y-6 max-w-md px-4">
                        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>

                        <h1 className="text-5xl font-bold">404</h1>
                        <h2 className="text-xl text-gray-400 font-medium">Page Not Found</h2>

                        <p className="text-gray-500">
                            The page you are looking for doesn't exist or has been moved.
                        </p>

                        <Link
                            href="/home"
                            className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-[16px] hover:bg-primary/90 hover:-translate-y-[1px] transition-all duration-150 ease-out shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                        >
                            Back to Home
                        </Link>
                    </div>
                </main>
            </SidebarLayout>
        </div>
    );
}
