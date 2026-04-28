"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

interface Application {
    id: string;
    brandName: string;
    companyName: string;
    contactEmail: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    submittedAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function ApplicationsPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    useEffect(() => {
        const fetchApplications = async () => {
            const auth = localStorage.getItem('adminAuth');
            if (!auth) { router.push('/admin/login'); return; }
            try {
                const res = await fetch(`${API_BASE_URL}/admin/applications`, {
                    headers: { 'Authorization': `Basic ${auth}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setApplications(data.applications || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, [router]);

    const filtered = applications.filter(app => {
        const matchesSearch = searchTerm === '' ||
            app.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || app.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</span>;
            case 'REJECTED': return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>;
            case 'COMPLETED': return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Completed</span>;
            default: return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Pending</span>;
        }
    };

    return (
        <div className="p-8 bg-gray-50/50 dark:bg-black min-h-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Brand Applications</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Review and manage brand registration requests</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 h-10 w-64 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s
                                ? 'bg-orange-500 text-white'
                                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                }`}
                        >
                            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Brand Name</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Contact</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Submitted</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No applications found</td>
                                </tr>
                            ) : (
                                filtered.map(app => (
                                    <tr
                                        key={app.id}
                                        className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/admin/applications/${app.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{app.brandName}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{app.companyName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{app.contactEmail}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {new Date(app.submittedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
