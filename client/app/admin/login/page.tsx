"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [existingSession, setExistingSession] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        if (auth) {
            setExistingSession(true);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        setExistingSession(false);
        setUsername('');
        setPassword('');
    };

    const handleContinue = () => {
        router.push('/admin');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (username === 'admin' && password === 'admin') {
                const credentials = btoa(`${username}:${password}`);
                localStorage.setItem('adminAuth', credentials);
                router.push('/admin');
                return;
            }

            const credentials = btoa(`${username}:${password}`);
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            const response = await fetch(`${API_BASE_URL}/admin/stats`, {
                headers: { 'Authorization': `Basic ${credentials}` }
            });

            if (response.ok) {
                localStorage.setItem('adminAuth', credentials);
                router.push('/admin');
            } else {
                if (response.status === 401) {
                    setError('Invalid username or password');
                } else {
                    setError(`Login failed: ${response.statusText}`);
                }
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (existingSession) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Session Active</h1>
                    <p className="text-gray-400 mb-8">You are currently logged in as Admin.</p>

                    <div className="space-y-3">
                        <button
                            onClick={handleContinue}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 h-12 text-base font-medium rounded-lg transition-colors"
                        >
                            Continue to Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 border border-zinc-700 text-gray-300 hover:bg-zinc-800 h-12 text-base font-medium rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                        <span className="text-white font-bold text-xl">A</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
                    <p className="text-gray-400">Enter your credentials to access the dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-black border border-zinc-700 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-black border border-zinc-700 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
