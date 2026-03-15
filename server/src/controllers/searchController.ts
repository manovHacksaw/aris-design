import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { getIPFSUrl } from '../services/ipfsService';

/**
 * Transform brand with optimized IPFS logo URLs
 */
function addBrandLogoUrls(brand: any): any {
    if (!brand) return brand;

    const transformed = { ...brand };

    if (brand.logoCid) {
        transformed.logoUrls = {
            thumbnail: getIPFSUrl(brand.logoCid, 'thumbnail'),
            medium: getIPFSUrl(brand.logoCid, 'medium'),
            full: getIPFSUrl(brand.logoCid, 'full'),
        };
    }

    return transformed;
}

/**
 * Search users by username, display name, or email
 * GET /api/search/users?q=searchTerm&limit=10
 */
export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { q, limit = '10' } = req.query;

        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Search query is required',
            });
            return;
        }

        const searchTerm = q.trim();
        if (searchTerm.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Search term must be at least 2 characters',
            });
            return;
        }

        const limitNum = Math.min(parseInt(limit as string) || 10, 50);

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { username: { contains: searchTerm, mode: 'insensitive' } },
                            { displayName: { contains: searchTerm, mode: 'insensitive' } },
                            { email: { contains: searchTerm, mode: 'insensitive' } },
                        ],
                    },
                    {
                        role: UserRole.USER, // Only search regular users, not brand owners
                        isOnboarded: true, // Only show onboarded users
                    },
                ],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                xp: true,
                isOnboarded: true,
                createdAt: true,
            },
            take: limitNum,
            orderBy: [
                { xp: 'desc' }, // Prioritize users with more XP
                { createdAt: 'desc' },
            ],
        });

        res.json({
            success: true,
            results: users,
            count: users.length,
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search users',
        });
    }
};

/**
 * Search brands by name, tagline, or description
 * GET /api/search/brands?q=searchTerm&limit=10
 */
export const searchBrands = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { q, limit = '10' } = req.query;

        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Search query is required',
            });
            return;
        }

        const searchTerm = q.trim();
        if (searchTerm.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Search term must be at least 2 characters',
            });
            return;
        }

        const limitNum = Math.min(parseInt(limit as string) || 10, 50);

        const brands = await prisma.brand.findMany({
            where: {
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { tagline: { contains: searchTerm, mode: 'insensitive' } },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                    { categories: { hasSome: [searchTerm] } },
                ],
            },
            select: {
                id: true,
                name: true,
                tagline: true,
                description: true,
                logoCid: true,
                categories: true,
                websiteUrl: true,
                socialLinks: true,
                createdAt: true,
                _count: {
                    select: {
                        subscriptions: true,
                    },
                },
            },
            take: limitNum,
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({
            success: true,
            results: brands.map(brand => addBrandLogoUrls(brand)),
            count: brands.length,
        });
    } catch (error) {
        console.error('Error searching brands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search brands',
        });
    }
};

/**
 * Search events by title
 * GET /api/search/events?q=searchTerm&limit=10
 */
export const searchEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { q, limit = '10' } = req.query;

        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Search query is required',
            });
            return;
        }

        const searchTerm = q.trim();
        if (searchTerm.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Search term must be at least 2 characters',
            });
            return;
        }

        const limitNum = Math.min(parseInt(limit as string) || 10, 50);

        const where: any = {
            isDeleted: false,
            blockchainStatus: { in: ['ACTIVE', 'PENDING', 'PENDING_BLOCKCHAIN', 'COMPLETED'] }, // Show confirmed, pending, and completed events
            title: { contains: searchTerm, mode: 'insensitive' },
            status: { in: ['posting', 'voting', 'completed'] },
        };

        const events = await prisma.event.findMany({
            where,
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true,
                        logoCid: true,
                    },
                },
            },
            take: limitNum,
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Add IPFS URLs for images
        const { EventService } = await import('../services/eventService.js');
        const results = events.map(event => (EventService as any).addImageUrls(event));

        res.json({
            success: true,
            results,
            count: events.length,
        });
    } catch (error) {
        console.error('Error searching events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search events',
        });
    }
};

/**
 * Combined search - searches both users and brands
 * GET /api/search/all?q=searchTerm&limit=10
 */
export const searchAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { q, limit = '10' } = req.query;

        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Search query is required',
            });
            return;
        }

        const searchTerm = q.trim();
        if (searchTerm.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Search term must be at least 2 characters',
            });
            return;
        }

        const limitNum = Math.min(parseInt(limit as string) || 10, 50);
        const perCategory = Math.ceil(limitNum / 2);

        // Search users
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { username: { contains: searchTerm, mode: 'insensitive' } },
                            { displayName: { contains: searchTerm, mode: 'insensitive' } },
                            { email: { contains: searchTerm, mode: 'insensitive' } },
                        ],
                    },
                    {
                        role: UserRole.USER,
                        isOnboarded: true,
                    },
                ],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                xp: true,
                isOnboarded: true,
                createdAt: true,
            },
            take: perCategory,
            orderBy: [
                { xp: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        // Search brands
        const brands = await prisma.brand.findMany({
            where: {
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { tagline: { contains: searchTerm, mode: 'insensitive' } },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                    { categories: { hasSome: [searchTerm] } },
                ],
            },
            select: {
                id: true,
                name: true,
                tagline: true,
                description: true,
                logoCid: true,
                categories: true,
                websiteUrl: true,
                socialLinks: true,
                createdAt: true,
                _count: {
                    select: {
                        subscriptions: true,
                    },
                },
            },
            take: perCategory,
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Search events
        const events = await prisma.event.findMany({
            where: {
                isDeleted: false,
                blockchainStatus: { in: ['ACTIVE', 'PENDING', 'PENDING_BLOCKCHAIN', 'COMPLETED'] }, // Show confirmed, pending, and completed events
                title: { contains: searchTerm, mode: 'insensitive' },
                status: { in: ['posting', 'voting', 'completed'] },
            },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true,
                        logoCid: true,
                    },
                },
            },
            take: perCategory,
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Add IPFS URLs for events
        const { EventService } = await import('../services/eventService.js');
        const eventResults = events.map(event => (EventService as any).addImageUrls(event));

        res.json({
            success: true,
            results: {
                users,
                brands: brands.map(brand => addBrandLogoUrls(brand)),
                events: eventResults,
            },
            count: {
                users: users.length,
                brands: brands.length,
                events: events.length,
                total: users.length + brands.length + events.length,
            },
        });
    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search',
        });
    }
};

/**
 * Get user profile by username
 * GET /api/search/user/:username
 */
export const getUserByUsername = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { username } = req.params;

        if (!username) {
            res.status(400).json({
                success: false,
                error: 'Username is required',
            });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                xp: true,
                isOnboarded: true,
                socialLinks: true,
                preferredBrands: true,
                preferredCategories: true,
                createdAt: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    },
                },
            },
        });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Error fetching user by username:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
        });
    }
};

/**
 * Get brand by ID or name
 * GET /api/search/brand/:identifier
 */
export const getBrandByIdentifier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { identifier } = req.params;

        if (!identifier) {
            res.status(400).json({
                success: false,
                error: 'Brand identifier is required',
            });
            return;
        }

        // Try to find by ID first, then by name
        const brand = await prisma.brand.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { name: { equals: identifier, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                tagline: true,
                description: true,
                logoCid: true,
                categories: true,
                websiteUrl: true,
                socialLinks: true,
                createdAt: true,
                _count: {
                    select: {
                        subscriptions: true,
                    },
                },
            },
        });

        if (!brand) {
            res.status(404).json({
                success: false,
                error: 'Brand not found',
            });
            return;
        }

        res.json({
            success: true,
            brand: addBrandLogoUrls(brand),
        });
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brand',
        });
    }
};
