import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
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
 * Get current authenticated brand with application data
 * GET /api/brands/me
 * Returns brand data with locked fields (fields that came from the application)
 */
export const getCurrentBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
            return;
        }

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            include: {
                applications: {
                    where: {
                        status: 'COMPLETED'
                    },
                    orderBy: {
                        submittedAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        if (!brand) {
            res.status(404).json({
                success: false,
                error: 'Brand not found',
            });
            return;
        }

        // Determine which fields are locked (came from the application)
        const application = brand.applications?.[0];
        const lockedFields = application ? [
            'name',
            'companyName',
            'categories',
            'websiteUrl',
            'contactEmail',
            'contactName',
            'contactRole',
            'contactPhone',
            'gstNumber',
            'panNumber'
        ] : [];

        res.json(addBrandLogoUrls({
            ...brand,
            lockedFields,
            // Brand XP/Level info
            levelInfo: {
                level: brand.level,
                discountPercent: brand.discountPercent,
                totalUsdcGiven: brand.totalUsdcGiven,
                eventsCreated: brand.eventsCreated,
                uniqueParticipants: brand.uniqueParticipants,
            },
            applicationData: application ? {
                companyName: application.companyName,
                gstNumber: application.gstNumber,
                panNumber: application.panNumber,
                contactPersonName: application.contactPersonName,
                contactRole: application.contactRole,
                phoneNumber: application.phoneNumber,
            } : null
        }));
    } catch (error) {
        console.error('Error fetching current brand:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brand details',
        });
    }
};

/**
 * Create or update brand profile (upsert)
 * POST /api/brands
 * Used during brand onboarding to update editable fields
 */
export const upsertBrandProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { name, tagline, description, logoCid, categories, socialLinks } = req.body;

    try {
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
            return;
        }

        // Get user to check role and update if needed
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        // If user is not yet BRAND_OWNER but has a brand, update their role
        // This handles the case where the role wasn't set during claim
        const existingBrandCheck = await prisma.brand.findFirst({
            where: { ownerId: userId },
        });

        if (existingBrandCheck && user.role !== UserRole.BRAND_OWNER) {
            // Update user role to BRAND_OWNER
            await prisma.user.update({
                where: { id: userId },
                data: { role: UserRole.BRAND_OWNER },
            });
        }

        // Find existing brand for this user
        let existingBrand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            include: {
                applications: {
                    where: { status: 'COMPLETED' },
                    orderBy: { submittedAt: 'desc' },
                    take: 1,
                },
            },
        });

        // Fallback: If brand not found by ownerId but name is provided, check if brand exists by name
        // This handles the case where the brand was created but ownership wasn't properly set
        if (!existingBrand && name) {
            const brandByName = await prisma.brand.findUnique({
                where: { name },
                include: {
                    applications: {
                        where: { status: 'COMPLETED' },
                        orderBy: { submittedAt: 'desc' },
                        take: 1,
                    },
                },
            });

            // If this brand exists and has no owner, or the owner is this user, claim it
            if (brandByName && (!brandByName.ownerId || brandByName.ownerId === userId)) {
                // Update ownership
                existingBrand = await prisma.brand.update({
                    where: { id: brandByName.id },
                    data: { ownerId: userId },
                    include: {
                        applications: {
                            where: { status: 'COMPLETED' },
                            orderBy: { submittedAt: 'desc' },
                            take: 1,
                        },
                    },
                });
            }
        }

        // Determine which fields are locked (from application)
        const lockedFields = existingBrand?.applications?.[0] ? [
            'name',
            'companyName',
            'categories',
            'websiteUrl',
            'contactEmail',
            'contactName',
            'contactRole',
            'contactPhone',
            'gstNumber',
            'panNumber'
        ] : [];

        // Build update data - only include fields that aren't locked
        const updateData: any = {};

        if (!lockedFields.includes('name') && name) updateData.name = name;
        if (!lockedFields.includes('tagline') && tagline !== undefined) updateData.tagline = tagline;
        if (!lockedFields.includes('description') && description !== undefined) updateData.description = description;
        if (!lockedFields.includes('logoCid') && logoCid !== undefined) updateData.logoCid = logoCid;
        if (!lockedFields.includes('categories') && categories) updateData.categories = categories;

        // Social links - only lock websiteUrl, other socials are editable
        if (socialLinks) {
            const existingSocialLinks = existingBrand?.socialLinks as any || {};
            updateData.socialLinks = {
                ...existingSocialLinks,
                ...socialLinks,
            };
            // Preserve locked website URL if it exists
            if (lockedFields.includes('websiteUrl') && existingBrand?.websiteUrl) {
                updateData.socialLinks.website = existingBrand.websiteUrl;
            }
        }

        let brand;

        if (existingBrand) {
            // Update existing brand with only non-locked fields
            // Only update if there's data to update
            if (Object.keys(updateData).length > 0) {
                brand = await prisma.brand.update({
                    where: { id: existingBrand.id },
                    data: updateData,
                });
            } else {
                // No updates needed, just return existing brand
                brand = existingBrand;
            }
        } else {
            // Create new brand (no locked fields)
            // Ensure we have required fields for creation
            if (!name) {
                res.status(400).json({
                    success: false,
                    error: 'Brand name is required to create a new brand',
                });
                return;
            }

            brand = await prisma.brand.create({
                data: {
                    name,
                    tagline: tagline || null,
                    description: description || null,
                    logoCid: logoCid || null,
                    categories: categories || [],
                    socialLinks: socialLinks || {},
                    ownerId: userId,
                    isActive: true,
                },
            });
        }

        res.json({
            success: true,
            brand,
        });
    } catch (error: any) {
        console.error('Error upserting brand profile:', error);

        // Handle unique constraint violations
        if (error.code === 'P2002') {
            // Check if this user already owns a brand with this name
            const userBrand = await prisma.brand.findFirst({
                where: {
                    name: name,
                    ownerId: userId,
                },
            });

            if (userBrand) {
                // User already owns this brand - return it instead of error
                res.json({
                    success: true,
                    brand: userBrand,
                });
                return;
            }

            res.status(409).json({
                success: false,
                error: 'A brand with this name already exists and is owned by another user',
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update brand profile',
        });
    }
};
/**
 * Get brand milestones and statistics
 * GET /api/brands/milestones
 */
export const getBrandMilestones = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        const brand = await prisma.brand.findFirst({
            where: { ownerId: userId },
            include: {
                events: {
                    include: {
                        eventAnalytics: true
                    }
                }
            }
        });

        if (!brand) {
            res.status(404).json({ success: false, error: 'Brand not found' });
            return;
        }

        // Calculate stats
        const eventsCreated = brand.eventsCreated || await prisma.event.count({ where: { brandId: brand.id } });

        // Calculate unique participants across all events (simplified approximation if simple count is stored)
        // Or aggregate from event analytics
        let uniqueParticipants = brand.uniqueParticipants;
        if (uniqueParticipants === 0 && brand.events.length > 0) {
            uniqueParticipants = brand.events.reduce((sum, e) => sum + (e.eventAnalytics?.uniqueParticipants || 0), 0);
        }

        // Calculate USDC distributed
        let usdcDistributed = brand.totalUsdcGiven;

        // Milestone logic (replicating frontend tiers for consistency, or ideally fetching from a shared config)
        const calculateLevel = (value: number, type: 'usdc' | 'events' | 'participants') => {
            // Tiers: 1, 2, 3, 4, 5, 6, 7
            // USDC: 10k, 25k, 50k, 100k, 250k, 500k, 1M
            // Events: 3, 6, 9, 20, 50, 75, 100
            // Participants: 1k, 2k, 5k, 10k, 25k, 50k, 100k

            const tiers: Record<string, number[]> = {
                usdc: [10000, 25000, 50000, 100000, 250000, 500000, 1000000],
                events: [3, 6, 9, 20, 50, 75, 100],
                participants: [1000, 2000, 5000, 10000, 25000, 50000, 100000]
            };

            const thresholds = tiers[type];
            let level = 0;
            for (let i = 0; i < thresholds.length; i++) {
                if (value >= thresholds[i]) level = i + 1;
                else break;
            }
            return level;
        };

        const milestones = {
            eventsCreatedLevel: calculateLevel(eventsCreated, 'events'),
            uniqueParticipantsLevel: calculateLevel(uniqueParticipants, 'participants'),
            usdcDistributedLevel: calculateLevel(usdcDistributed, 'usdc')
        };

        res.json({
            success: true,
            eventsCreated,
            uniqueParticipants,
            usdcDistributed,
            milestones
        });
    } catch (error) {
        console.error('Error fetching brand milestones:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brand milestones'
        });
    }
};

/**
 * Get brand profile by name or ID for public view
 * GET /api/brands/public/:identifier
 */
export const getPublicBrandProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { identifier } = req.params;

        if (!identifier) {
            res.status(400).json({ success: false, error: 'Identifier is required' });
            return;
        }

        const brand = await prisma.brand.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { name: { equals: identifier, mode: 'insensitive' } },
                ],
                isActive: true
            },
            include: {
                events: {
                    where: { isDeleted: false },
                    orderBy: { startTime: 'desc' },
                    take: 20
                },
                _count: {
                    select: {
                        subscriptions: true,
                        events: { where: { isDeleted: false } }
                    }
                }
            }
        });

        if (!brand) {
            res.status(404).json({ success: false, error: 'Brand not found' });
            return;
        }

        // Add IPFS URLs for logo
        const transformedBrand = addBrandLogoUrls(brand);

        // Sanitize sensitive info
        const result = {
            id: transformedBrand.id,
            name: transformedBrand.name,
            tagline: transformedBrand.tagline,
            description: transformedBrand.description,
            categories: transformedBrand.categories,
            logoCid: transformedBrand.logoCid,
            logoUrls: transformedBrand.logoUrls,
            websiteUrl: transformedBrand.websiteUrl,
            socialLinks: transformedBrand.socialLinks,
            isVerified: transformedBrand.isVerified,
            isOwner: (req as any).user?.id === transformedBrand.ownerId,
            level: transformedBrand.level,
            totalUsdcGiven: transformedBrand.totalUsdcGiven,
            uniqueParticipants: transformedBrand.uniqueParticipants,
            eventsCreated: transformedBrand._count.events,
            followerCount: transformedBrand._count.subscriptions,
            createdAt: transformedBrand.createdAt,
            events: transformedBrand.events.map((e: any) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                status: e.status,
                eventType: e.eventType,
                category: e.category,
                startTime: e.startTime,
                endTime: e.endTime,
                imageUrl: e.imageUrl,
                imageCid: e.imageCid,
                baseReward: e.baseReward,
                topReward: e.topReward,
                leaderboardPool: e.leaderboardPool,
                capacity: e.capacity,
                _count: { submissions: 0 } // placeholder or fetch if needed
            }))
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching public brand profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brand profile'
        });
    }
};
