"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Download,
    Edit,
    Trash2,
    ShieldCheck,
    ArrowRight,
    LogOut,
    X,
    Users,
    Building2,
    Clock,
    Activity
} from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    totalBrands: number;
    pendingApplications: number;
    activeSessions: number;
}

interface Application {
    id: string;
    brandName: string;
    companyName: string;
    contactEmail: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    submittedAt: string;
    categories: string[];
    logoCid?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [showStats, setShowStats] = useState(true);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);
    const [adminName, setAdminName] = useState('Admin');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        if (!auth) {
            router.push('/admin/login');
        } else {
            try {
                const decoded = atob(auth);
                const username = decoded.split(':')[0];
                setAdminName(username.charAt(0).toUpperCase() + username.slice(1));
            } catch { /* ignore */ }
        }
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const auth = localStorage.getItem('adminAuth');
            const headers = { 'Authorization': `Basic ${auth}` };
            const [statsRes, appsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/stats`, { headers }),
                fetch(`${API_BASE_URL}/admin/applications`, { headers })
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (appsRes.ok) {
                const data = await appsRes.json();
                setApplications(data.applications || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        router.push('/admin/login');
    };

    if (!isSessionConfirmed) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">Session Active</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        You are currently logged in as{' '}
                        <span className="text-gray-900 dark:text-foreground font-mono text-sm">{adminName}</span>
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => { setIsSessionConfirmed(true); fetchData(); }}
                            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 h-12 text-base font-medium rounded-lg transition-colors"
                        >
                            Continue with this account
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 h-12 text-base font-medium rounded-lg transition-colors"
                        >
                            <LogOut className="mr-2 w-4 h-4" />
                            Logout & Switch Account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const filteredApplications = applications.filter(app => {
        const matchesSearch = searchTerm === '' ||
            app.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || app.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const toggleSelection = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</span>;
            case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>;
            case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Completed</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Pending</span>;
        }
    };

    const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: number; icon: any; description: string }) => (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-foreground">{loading ? '...' : value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
    );

    return (
        <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-black min-h-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Admin Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of brand applications and system activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={handleLogout}
                        className="h-9 px-4 flex items-center gap-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Stats toggle + filters */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Statistics</span>
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${showStats ? 'bg-orange-500' : 'bg-gray-300 dark:bg-zinc-700'}`}
                    >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${showStats ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search applications..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 h-10 w-64 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none text-gray-900 dark:text-foreground"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            {showStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Brands" value={stats?.totalBrands ?? 0} icon={Building2} description="Registered brands" />
                    <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} description="Active user accounts" />
                    <StatCard title="Pending Applications" value={stats?.pendingApplications ?? 0} icon={Clock} description="Awaiting review" />
                    <StatCard title="Active Sessions" value={stats?.activeSessions ?? 0} icon={Activity} description="Currently online" />
                </div>
            )}

            {/* Applications table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground">Brand Applications</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage and review brand registration requests</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.length === filteredApplications.length && filteredApplications.length > 0}
                                        onChange={() => setSelectedItems(
                                            selectedItems.length === filteredApplications.length ? [] : filteredApplications.map(a => a.id)
                                        )}
                                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Brand Name</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Company</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Contact Email</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Submitted</th>
                                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading data...</td>
                                </tr>
                            ) : filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No applications found</td>
                                </tr>
                            ) : (
                                filteredApplications.map((app) => (
                                    <tr
                                        key={app.id}
                                        className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/admin/applications/${app.id}`)}
                                    >
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(app.id)}
                                                onChange={() => toggleSelection(app.id)}
                                                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-zinc-700">
                                                    {app.logoCid ? (
                                                        <img src={app.logoCid} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">{app.brandName.substring(0, 2).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-foreground">{app.brandName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{app.companyName}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{app.contactEmail}</td>
                                        <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {new Date(app.submittedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <button
                                                className="h-8 px-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm transition-colors"
                                                onClick={() => router.push(`/admin/applications/${app.id}`)}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && filteredApplications.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800">
                        <span className="text-sm text-gray-500">
                            Showing {filteredApplications.length} of {applications.length} applications
                        </span>
                    </div>
                )}
            </div>

            {/* Floating action bar */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 shadow-xl border border-gray-200 dark:border-zinc-800 rounded-full px-6 py-3 flex items-center gap-6 z-50">
                    <span className="text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-zinc-800 pr-6">
                        {selectedItems.length} Selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button className="h-8 px-3 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-sm">
                            <Edit className="w-4 h-4" /> Bulk Edit
                        </button>
                        <button className="h-8 px-3 flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-sm">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                    <div className="border-l border-gray-200 dark:border-zinc-800 pl-4">
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                            onClick={() => setSelectedItems([])}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
