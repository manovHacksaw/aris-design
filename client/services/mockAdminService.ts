import { v4 as uuidv4 } from 'uuid';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface AdminUser {
    id: string;
    username: string;
    walletAddress: string;
    role: 'user' | 'creator';
    status: 'active' | 'suspended' | 'banned';
    trustScore: number;
    xp: number;
    streak: number;
    createdAt: string;
    lastActive: string;
}

export interface AdminBrand {
    id: string;
    name: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    walletAddress?: string;
    credibilityScore: number;
    createdAt: string;
    contactEmail: string;
}

export interface AdminEvent {
    id: string;
    title: string;
    brandId: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    rewardPool: number;
    submissionsCount: number;
    createdAt: string;
    endTime: string;
}

export interface AdminModerationQueueItem {
    id: string;
    type: 'submission' | 'user' | 'comment';
    targetId: string;
    reportedBy: string;
    reason: string;
    status: 'pending' | 'resolved' | 'dismissed';
    createdAt: string;
    severity: 'low' | 'medium' | 'high';
}

export interface AdminTransaction {
    id: string;
    type: 'reward_payout' | 'deposit' | 'withdrawal';
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed';
    toAddress: string;
    timestamp: string;
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

let mockUsers: AdminUser[] = [
    { id: 'usr-1', username: 'alex_creative', walletAddress: '0x123...abc', role: 'creator', status: 'active', trustScore: 98, xp: 14500, streak: 12, createdAt: '2025-01-10T00:00:00Z', lastActive: new Date().toISOString() },
    { id: 'usr-2', username: 'crypto_ninja', walletAddress: '0x456...def', role: 'user', status: 'suspended', trustScore: 45, xp: 230, streak: 0, createdAt: '2026-02-01T00:00:00Z', lastActive: '2026-02-20T00:00:00Z' },
    { id: 'usr-3', username: 'design_pro', walletAddress: '0x789...ghi', role: 'creator', status: 'active', trustScore: 85, xp: 8900, streak: 4, createdAt: '2025-11-15T00:00:00Z', lastActive: new Date().toISOString() },
    { id: 'usr-4', username: 'spam_bot_99', walletAddress: '0x999...zzz', role: 'user', status: 'banned', trustScore: 10, xp: 0, streak: 0, createdAt: '2026-02-25T00:00:00Z', lastActive: '2026-02-25T00:00:00Z' },
];

let mockBrands: AdminBrand[] = [
    { id: 'brd-1', name: 'Nike', status: 'approved', walletAddress: '0xabc...123', credibilityScore: 99, createdAt: '2025-06-01T00:00:00Z', contactEmail: 'web3@nike.com' },
    { id: 'brd-2', name: 'Energy Drink Co', status: 'pending', credibilityScore: 60, createdAt: '2026-02-24T00:00:00Z', contactEmail: 'marketing@energy.com' },
    { id: 'brd-3', name: 'Scam Project', status: 'rejected', credibilityScore: 15, createdAt: '2026-02-10T00:00:00Z', contactEmail: 'admin@scam.io' },
];

let mockEvents: AdminEvent[] = [
    { id: 'evt-1', title: 'Air Max Design Challenge', brandId: 'brd-1', status: 'active', rewardPool: 5000, submissionsCount: 342, createdAt: '2026-02-20T00:00:00Z', endTime: '2026-03-01T00:00:00Z' },
    { id: 'evt-2', title: 'Just Do It Video Contest', brandId: 'brd-1', status: 'completed', rewardPool: 10000, submissionsCount: 890, createdAt: '2026-01-15T00:00:00Z', endTime: '2026-02-15T00:00:00Z' },
];

let mockModerationQueue: AdminModerationQueueItem[] = [
    { id: 'mod-1', type: 'submission', targetId: 'sub-xyz', reportedBy: 'usr-1', reason: 'Copyright infringement', status: 'pending', createdAt: '2026-02-26T10:00:00Z', severity: 'high' },
    { id: 'mod-2', type: 'user', targetId: 'usr-4', reportedBy: 'usr-3', reason: 'Spamming comments', status: 'resolved', createdAt: '2026-02-25T15:00:00Z', severity: 'medium' },
];

let mockTransactions: AdminTransaction[] = [
    { id: 'tx-1', type: 'reward_payout', amount: 500, currency: 'USDC', status: 'completed', toAddress: '0x123...abc', timestamp: '2026-02-16T12:00:00Z' },
    { id: 'tx-2', type: 'deposit', amount: 10000, currency: 'USDC', status: 'completed', toAddress: 'SystemPool', timestamp: '2026-01-10T12:00:00Z' },
];

// ─── Service Methods ──────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const mockAdminService = {
    // ---- Dashboard ----
    async getPlatformStats() {
        await delay(500);
        return {
            totalUsers: mockUsers.length,
            totalBrands: mockBrands.length,
            pendingApplications: mockBrands.filter(b => b.status === 'pending').length,
            activeSessions: Math.floor(mockUsers.length * 0.4),
            totalEvents: mockEvents.length,
            moderationQueueCount: mockModerationQueue.filter(m => m.status === 'pending').length,
            totalUSDCDistributed: mockTransactions.filter(t => t.type === 'reward_payout' && t.status === 'completed').reduce((acc, curr) => acc + curr.amount, 0)
        };
    },

    // ---- Users ----
    async getUsers(): Promise<AdminUser[]> {
        await delay(600);
        return [...mockUsers];
    },

    async getUser(id: string): Promise<AdminUser | undefined> {
        await delay(300);
        return mockUsers.find(u => u.id === id);
    },

    async updateUserStatus(id: string, status: AdminUser['status']) {
        await delay(500);
        const user = mockUsers.find(u => u.id === id);
        if (user) {
            user.status = status;
            return { success: true, user };
        }
        throw new Error('User not found');
    },

    // ---- Brands ----
    async getBrands(): Promise<AdminBrand[]> {
        await delay(600);
        return [...mockBrands];
    },

    async updateBrandStatus(id: string, status: AdminBrand['status']) {
        await delay(500);
        const brand = mockBrands.find(b => b.id === id);
        if (brand) {
            brand.status = status;
            return { success: true, brand };
        }
        throw new Error('Brand not found');
    },

    // ---- Events ----
    async getEvents(): Promise<AdminEvent[]> {
        await delay(600);
        return [...mockEvents];
    },

    async updateEventStatus(id: string, status: AdminEvent['status']) {
        await delay(500);
        const event = mockEvents.find(e => e.id === id);
        if (event) {
            event.status = status;
            return { success: true, event };
        }
        throw new Error('Event not found');
    },

    // ---- Moderation ----
    async getModerationQueue(): Promise<AdminModerationQueueItem[]> {
        await delay(400);
        return [...mockModerationQueue];
    },

    async updateModerationStatus(id: string, status: AdminModerationQueueItem['status']) {
        await delay(400);
        const item = mockModerationQueue.find(m => m.id === id);
        if (item) {
            item.status = status;
            return { success: true, item };
        }
        throw new Error('Queue item not found');
    },

    // ---- Finance ----
    async getTransactions(): Promise<AdminTransaction[]> {
        await delay(700);
        return [...mockTransactions];
    }
};
