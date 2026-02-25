"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    Globe,
    Mail,
    Phone,
    MessageCircle,
    FileText,
    CheckCircle2,
    XCircle,
    Calendar,
    ExternalLink,
    Download,
    Loader2,
    X,
    Copy,
    AlertTriangle
} from 'lucide-react';

interface ApplicationDetails {
    id: string;
    brandName: string;
    companyName: string;
    tagline?: string;
    description: string;
    logoCid?: string;
    categories: string[];
    contactEmail: string;
    phoneNumber?: string;
    telegramHandle?: string;
    socialLinks?: {
        website?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
    };
    gstNumber?: string;
    panNumber?: string;
    documents?: Array<{ name: string; url: string; size?: string; type?: string }>;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    submittedAt: string;
    reviewedBy?: string;
    rejectionReason?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function ApplicationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [application, setApplication] = useState<ApplicationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTemplate, setEmailTemplate] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; title: string; message: string } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [rejectReason, setRejectReason] = useState('Does not meet criteria');

    useEffect(() => {
        fetchApplication();
    }, [params.id]);

    const fetchApplication = async () => {
        try {
            const auth = localStorage.getItem('adminAuth');
            if (!auth) { router.push('/admin/login'); return; }
            const res = await fetch(`${API_BASE_URL}/admin/applications/${params.id}`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            if (!res.ok) throw new Error('Failed to fetch application');
            setApplication(await res.json());
        } catch (err) {
            setError('Error loading application details');
        } finally {
            setLoading(false);
        }
    };

    const initiateAction = (type: 'approve' | 'reject') => {
        setConfirmAction({
            type,
            title: type === 'approve' ? 'Approve Application' : 'Reject Application',
            message: type === 'approve'
                ? 'Approving will generate a claim token and email template for the brand owner.'
                : 'Are you sure you want to reject this application?'
        });
        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        if (!confirmAction) return;
        setShowConfirmModal(false);
        setProcessing(true);

        try {
            const auth = localStorage.getItem('adminAuth');
            let res;

            if (confirmAction.type === 'approve') {
                res = await fetch(`${API_BASE_URL}/admin/brands/${params.id}/approve`, {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }
                });
            } else {
                res = await fetch(`${API_BASE_URL}/admin/applications/${params.id}/reject`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: rejectReason })
                });
            }

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${confirmAction.type} application`);
            }

            const data = await res.json();

            if (confirmAction.type === 'approve' && data.data?.emailTemplate) {
                // Fix the URL to use the correct app base URL and query param format
                const correctedTemplate = data.data.emailTemplate
                    .replace(/https?:\/\/[^/\s]+/g, APP_BASE_URL)
                    .replace(/\/claim-brand\/([a-zA-Z0-9_-]+)/g, '/claim-brand?token=$1');
                setEmailTemplate(correctedTemplate);
                setShowEmailModal(true);
                fetchApplication();
            } else {
                await fetchApplication();
                setSuccessMessage('Application rejected successfully');
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 2500);
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setProcessing(false);
            setConfirmAction(null);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(emailTemplate);
        setSuccessMessage('Email template copied to clipboard!');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2500);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'COMPLETED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50/50 dark:bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (error || !application) {
        return (
            <div className="min-h-screen bg-gray-50/50 dark:bg-black p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error</h1>
                <p className="text-red-500 mb-6">{error || 'Application not found'}</p>
                <button onClick={() => router.back()} className="px-4 py-2 bg-orange-500 text-white rounded-lg">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                {application.brandName}
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(application.status)}`}>
                                    {application.status}
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Application ID: {application.id}</p>
                        </div>
                    </div>

                    {application.status === 'PENDING' && (
                        <div className="flex gap-3">
                            <button
                                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                onClick={() => initiateAction('reject')}
                                disabled={processing}
                            >
                                <XCircle className="w-4 h-4" /> Reject
                            </button>
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                onClick={() => initiateAction('approve')}
                                disabled={processing}
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Approve
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Brand details */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-gray-400" /> Brand Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company Name</label>
                                    <p className="mt-1 text-gray-900 dark:text-white font-medium">{application.companyName || '—'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tagline</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{application.tagline || '—'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</label>
                                    <p className="mt-1 text-gray-900 dark:text-white text-sm leading-relaxed">{application.description}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categories</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {application.categories.map((cat, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Legal & Docs */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-400" /> Legal & Documents
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">GST Number</label>
                                    <p className="mt-1 text-gray-900 dark:text-white font-mono">{application.gstNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PAN Number</label>
                                    <p className="mt-1 text-gray-900 dark:text-white font-mono">{application.panNumber || 'N/A'}</p>
                                </div>
                            </div>
                            {application.documents && application.documents.length > 0 ? (
                                <div className="space-y-3">
                                    {application.documents.map((doc, i) => (
                                        <div key={i} className="border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg p-4 bg-gray-50 dark:bg-black/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                                                    {doc.size && <p className="text-xs text-gray-500">{doc.type} · {doc.size}</p>}
                                                </div>
                                            </div>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                                    <Download className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg p-6 bg-gray-50 dark:bg-black/50 text-center">
                                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No documents uploaded</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Contact */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Details</h2>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{application.contactEmail}</p>
                                    </div>
                                </div>
                                {application.phoneNumber && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <Phone className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{application.phoneNumber}</p>
                                        </div>
                                    </div>
                                )}
                                {application.telegramHandle && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                            <MessageCircle className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Telegram</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{application.telegramHandle}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Social links */}
                        {application.socialLinks && Object.values(application.socialLinks).some(Boolean) && (
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Presence</h2>
                                <div className="space-y-3">
                                    {application.socialLinks.website && (
                                        <a href={application.socialLinks.website} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <Globe className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Website</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-gray-400" />
                                        </a>
                                    )}
                                    {application.socialLinks.twitter && (
                                        <a href={application.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <Globe className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Twitter / X</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-gray-400" />
                                        </a>
                                    )}
                                    {application.socialLinks.instagram && (
                                        <a href={application.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <Globe className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Instagram</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-gray-400" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Submitted</span>
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {new Date(application.submittedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {application.reviewedBy && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Reviewed By</span>
                                        <span className="text-gray-900 dark:text-white font-medium">{application.reviewedBy}</span>
                                    </div>
                                )}
                                {application.rejectionReason && (
                                    <div>
                                        <span className="text-gray-500 block mb-1">Rejection Reason</span>
                                        <p className="text-red-500 text-xs">{application.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirmModal && confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-zinc-800">
                        <div className="p-6 text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction.type === 'approve' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                {confirmAction.type === 'approve'
                                    ? <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    : <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                }
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmAction.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">{confirmAction.message}</p>

                            {confirmAction.type === 'reject' && (
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Rejection reason..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-white mb-4 resize-none"
                                    rows={2}
                                />
                            )}

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeAction}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${confirmAction.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Template Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    Application Approved
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Send this email to the brand owner to activate their account.
                                </p>
                            </div>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="bg-gray-50 dark:bg-black rounded-lg border border-gray-200 dark:border-zinc-800 p-4 font-mono text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                                {emailTemplate}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
                            <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                                Close
                            </button>
                            <button onClick={copyToClipboard} className="px-4 py-2 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                                <Copy className="w-4 h-4" /> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success toast */}
            {showSuccessModal && (
                <div className="fixed bottom-8 right-8 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-green-200 dark:border-green-900/30 p-4 flex items-center gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{successMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
