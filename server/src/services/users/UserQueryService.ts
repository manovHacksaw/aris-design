import { prisma } from '../../lib/prisma';

export class UserQueryService {
    /**
     * Get all users
     */
    static async getUsers(take = 10) {
        return prisma.user.findMany({
            take,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Search users by username or displayName
     */
    static async searchUsers(query: string, take = 20) {
        if (!query || query.trim().length < 2) return [];
        const q = query.trim();
        return prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: q, mode: 'insensitive' } },
                    { displayName: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                xp: true,
                level: true,
                isOnboarded: true,
                _count: {
                    select: { followers: true },
                },
            },
            orderBy: { xp: 'desc' },
            take,
        });
    }

    /**
     * Get user by ID
     */
    static async getUserById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                ownedBrands: true,
                loginStreak: true,
            },
        });
    }

    /**
     * Get user by Username
     */
    static async getUserByUsername(username: string) {
        return prisma.user.findUnique({
            where: { username },
            include: {
                ownedBrands: true,
                loginStreak: true,
            },
        });
    }

    /**
     * Check username availability
     */
    static async checkUsernameAvailability(username: string) {
        if (username.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            throw new Error('Username can only contain letters, numbers, and underscores');
        }

        const user = await prisma.user.findUnique({
            where: { username },
        });

        return !user;
    }
}
