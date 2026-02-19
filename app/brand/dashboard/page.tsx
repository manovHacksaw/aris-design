"use client";

import BrandDashboardCharts from "@/components/BrandDashboardCharts";
import { Plus, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function BrandDashboard() {
    return (
        <div className="space-y-8 pb-32 md:pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Overview</h1>
                    <p className="text-muted-foreground">Welcome back, Nike Inc.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/brand/create-event"
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Create Campaign</span>
                        <span className="md:hidden">New</span>
                    </Link>
                </div>
            </header>

            <BrandDashboardCharts />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity / Submissions */}
                <section className="lg:col-span-2 bg-card border border-border rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h3 className="font-bold text-lg">Active Campaigns</h3>
                        <Link href="/brand/events" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Campaign</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Pool</th>
                                    <th className="px-6 py-4 text-right">Engagement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {[
                                    { title: "Neon Dreams", status: "Active", pool: "$5,000", filled: "84%", end: "2d left" },
                                    { title: "Summer Vibes Test", status: "Draft", pool: "$2,000", filled: "0%", end: "-" },
                                    { title: "Tech Review 2024", status: "Ended", pool: "$10,000", filled: "100%", end: "Completed" },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-secondary/30 transition-colors group cursor-pointer" onClick={() => window.location.href = '#'} >
                                        <td className="px-6 py-4 font-bold text-foreground">
                                            {row.title}
                                            <div className="text-xs text-muted-foreground font-medium mt-0.5">{row.end}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                                row.status === "Active" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                    row.status === "Draft" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                                        "bg-muted text-muted-foreground border-border"
                                            )}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground font-bold">{row.pool}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-xs font-bold">{row.filled}</span>
                                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: row.filled }}></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="md:hidden divide-y divide-border">
                        {[
                            { title: "Neon Dreams", status: "Active", pool: "$5,000", filled: "84%", end: "2d left" },
                            { title: "Summer Vibes Test", status: "Draft", pool: "$2,000", filled: "0%", end: "-" },
                            { title: "Tech Review 2024", status: "Ended", pool: "$10,000", filled: "100%", end: "Completed" },
                        ].map((row, i) => (
                            <div key={i} className="p-4 flex items-center justify-between active:bg-secondary/50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                            row.status === "Active" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                row.status === "Draft" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                                    "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {row.status}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-sm text-foreground mb-1">{row.title}</h4>
                                    <p className="text-xs text-muted-foreground">{row.end} • {row.pool}</p>
                                </div>
                                <div className="text-right">
                                    <div className="w-12 h-12 rounded-full border-4 border-secondary flex items-center justify-center relative">
                                        {/* Simple visual progress hack */}
                                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent border-l-transparent rotate-45" style={{ opacity: parseInt(row.filled) / 100 }} />
                                        <span className="text-[10px] font-bold">{row.filled}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quick Actions & Notifications */}
                <aside className="space-y-6">
                    <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4">Needs Attention</h3>
                        <div className="space-y-3">
                            {[
                                { text: "Low reward pool balance", type: "warning", time: "2h ago" },
                                { text: "3 new high-value submissions", type: "info", time: "5h ago" },
                                { text: "Campaign 'Neon Dreams' ending soon", type: "alert", time: "1d ago" },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/30 border border-border/50">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                        item.type === 'warning' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                                            item.type === 'alert' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                    )} />
                                    <div>
                                        <p className="text-sm font-bold leading-tight">{item.text}</p>
                                        <span className="text-[10px] text-muted-foreground mt-1 block font-medium uppercase tracking-wide">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-[24px] p-6">
                        <h3 className="font-bold text-primary mb-2">Pro Tip</h3>
                        <p className="text-sm text-muted-foreground mb-4 font-medium">
                            Campaigns with video requirements get 40% higher engagement on average.
                        </p>
                        <Link href="#" className="text-xs font-black text-primary flex items-center gap-1 hover:underline uppercase tracking-wide">
                            Read Case Study <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
