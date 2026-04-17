"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Activity,
    Search,
    Menu,
    X,
    LogOut,
    Loader2,
} from 'lucide-react';
import { usePrivy } from "@privy-io/react-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { ready, authenticated, logout: privyLogout, getAccessToken } = usePrivy();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [checking, setChecking] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

    useEffect(() => {
        if (!ready) return;

        if (!authenticated) {
            router.replace("/explore");
            return;
        }

        getAccessToken().then(async (token) => {
            if (!token) { router.replace("/explore"); return; }
            try {
                const res = await fetch(`${API_URL}/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) { router.replace("/explore"); return; }
                setAllowed(true);
                setChecking(false);
            } catch {
                router.replace("/explore");
            }
        });
    }, [ready, authenticated]);

    const handleLogout = async () => {
        await privyLogout();
        router.replace("/explore");
    };

    if (!ready || checking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-white" />
            </div>
        );
    }

    if (!allowed) return null;

    const menuGroups = [
        {
            title: "MAIN MENU",
            items: [
                { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
                { label: 'Applications', href: '/admin/applications', icon: ShoppingBag },
                { label: 'Users', href: '/admin/users', icon: Users },
                { label: 'Activity', href: '/admin/activity', icon: Activity },
            ]
        }
    ];

    const filteredMenuGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(group => group.items.length > 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex font-sans">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-black border-r border-gray-200 dark:border-zinc-800 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:relative lg:translate-x-0 flex flex-col`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                            <span className="text-white dark:text-black font-bold text-lg">A</span>
                        </div>
                        <h1 className="font-bold text-gray-900 dark:text-white leading-none">Aris Admin</h1>
                    </div>
                    <button className="ml-auto lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm border-none focus:ring-1 focus:ring-gray-200 dark:focus:ring-zinc-700 placeholder-gray-400 text-gray-900 dark:text-gray-300"
                        />
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-6">
                    {filteredMenuGroups.length > 0 ? (
                        filteredMenuGroups.map((group, idx) => (
                            <div key={idx}>
                                <h3 className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 mb-2 px-2 tracking-wider">{group.title}</h3>
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all group ${isActive
                                                    ? 'bg-orange-50 dark:bg-zinc-900 text-orange-600 dark:text-white'
                                                    : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900'
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <item.icon className={`w-4 h-4 mr-3 ${isActive ? 'text-orange-600 dark:text-orange-500' : 'text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300'}`} />
                                                    {item.label}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No menu items found</p>
                        </div>
                    )}
                </nav>

                {/* Logout */}
                <div className="p-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors font-medium text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-black">
                <header className="lg:hidden h-16 bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-800 flex items-center px-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 text-lg font-semibold text-gray-900 dark:text-white">Aris Admin</span>
                </header>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
