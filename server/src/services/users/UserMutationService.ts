import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { XpService } from '../xp/xpService';

export class UserMutationService {
    /**
     * Upsert user (create or update)
     */
    static async upsertUser(data: any, authUserId?: string) {
        const {
            email,
            displayName,
            avatarUrl,
            walletAddress,
            socialLinks,
            preferredBrands,
            preferredCategories,
            isOnboarded,
            gender,
            dateOfBirth,
        } = data;

        if (authUserId) {
            // Authenticated update
            const currentUser = await prisma.user.findUnique({
                where: { id: authUserId },
            });

            if (!currentUser) {
                throw new Error('User not found');
            }

            const updateData: any = {
                lastLoginAt: new Date(),
            };

            // Allow email update only if current email is a placeholder
            if (email !== undefined && currentUser.email.includes('@wallet.local') && email && !email.includes('@wallet.local')) {
                updateData.email = email;
                updateData.emailVerified = true;
            }

            if (displayName !== undefined) updateData.displayName = displayName;
            if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
            if (walletAddress !== undefined) updateData.walletAddress = walletAddress;
            if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
            if (preferredBrands !== undefined) updateData.preferredBrands = preferredBrands;
            if (preferredCategories !== undefined) updateData.preferredCategories = preferredCategories;
            if (isOnboarded !== undefined) updateData.isOnboarded = isOnboarded;
            if (gender !== undefined) updateData.gender = gender;
            if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

            return prisma.user.update({
                where: { id: authUserId },
                data: updateData,
            });
        } else {
            // Unauthenticated upsert (requires email)
            if (!email) {
                throw new Error('Email is required when not authenticated');
            }

            const updateData: any = {
                lastLoginAt: new Date(),
            };

            if (displayName !== undefined) updateData.displayName = displayName;
            if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
            if (walletAddress !== undefined) updateData.walletAddress = walletAddress;
            if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
            if (preferredBrands !== undefined) updateData.preferredBrands = preferredBrands;
            if (preferredCategories !== undefined) updateData.preferredCategories = preferredCategories;
            if (gender !== undefined) updateData.gender = gender;
            if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

            return prisma.user.upsert({
                where: { email },
                update: updateData,
                create: {
                    email,
                    displayName: displayName || null,
                    avatarUrl: avatarUrl || null,
                    walletAddress: walletAddress || null,
                    socialLinks: socialLinks || null,
                    preferredBrands: preferredBrands || [],
                    preferredCategories: preferredCategories || [],
                    lastLoginAt: new Date(),
                },
            });
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId: string, data: any) {
        const {
            displayName,
            avatarUrl,
            bio,
            username,
            socialLinks,
            preferredBrands,
            preferredCategories,
            isOnboarded,
            phoneNumber,
            gender,
            dateOfBirth,
            web3Level,
            intentGoals,
            contentFormat,
            creatorCategories,
            onboardingStep,
        } = data;

        // Validate bio
        if (bio !== undefined && bio !== null && bio.length > 200) {
            throw new Error('Bio must be 200 characters or less');
        }

        // Validate username
        if (username) {
            if (username.length < 3) {
                throw new Error('Username must be at least 3 characters');
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                throw new Error('Username can only contain letters, numbers, and underscores');
            }

            const currentUser = await prisma.user.findUnique({ where: { id: userId } });
            if (currentUser?.username !== username) {
                const existing = await prisma.user.findUnique({ where: { username } });
                if (existing) {
                    throw new Error('Username is already taken');
                }
            }
        }

        const updateData: any = {};

        if (displayName !== undefined) updateData.displayName = displayName;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (bio !== undefined) updateData.bio = bio ? bio.trim() : null;
        if (username !== undefined) updateData.username = username;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (preferredBrands !== undefined) updateData.preferredBrands = preferredBrands;
        if (preferredCategories !== undefined) updateData.preferredCategories = preferredCategories;
        if (isOnboarded !== undefined) {
            updateData.isOnboarded = isOnboarded;
            // Auto-generate referral code and grant welcome XP on first onboarding completion
            if (isOnboarded === true) {
                const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true, isOnboarded: true } });
                if (!currentUser?.referralCode) {
                    updateData.referralCode = `ARIS-${userId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                }
                // Grant welcome XP only if this is the first time completing onboarding
                if (!currentUser?.isOnboarded) {
                    // Fire-and-forget after the update — we need the updated user xp, so do after save
                    setImmediate(async () => {
                        try {
                            await XpService.grantXp({
                                userId,
                                amount: 10,
                                type: 'MILESTONE_REWARD',
                                description: 'Welcome to Aris!',
                            });
                        } catch (e) {
                            logger.warn(e, '[updateProfile] Welcome XP grant failed:');
                        }
                    });
                }
            }
        }
        if (gender !== undefined) updateData.gender = gender;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (web3Level !== undefined) updateData.web3Level = web3Level;
        if (intentGoals !== undefined) updateData.intentGoals = intentGoals;
        if (contentFormat !== undefined) updateData.contentFormat = contentFormat;
        if (creatorCategories !== undefined) updateData.creatorCategories = creatorCategories;
        if (onboardingStep !== undefined) updateData.onboardingStep = onboardingStep;

        if (phoneNumber !== undefined) {
            const currentUser = await prisma.user.findUnique({ where: { id: userId } });

            // Normalize phone number: treat empty string as null
            const normalizedPhone = phoneNumber && phoneNumber.trim()
                ? phoneNumber.replace(/[^0-9+]/g, '')
                : null;

            if (currentUser?.phoneNumber !== normalizedPhone) {
                // Check if phone number is already taken by another user
                if (normalizedPhone) {
                    const existingPhoneUser = await prisma.user.findFirst({
                        where: {
                            phoneNumber: normalizedPhone,
                            NOT: { id: userId }
                        }
                    });
                    if (existingPhoneUser) {
                        throw new Error('Phone number is already registered to another account');
                    }
                    updateData.phoneNumber = normalizedPhone;
                    updateData.phoneVerified = false;
                } else {
                    // Set to null if empty or cleared
                    updateData.phoneNumber = null;
                    updateData.phoneVerified = false;
                }
            }
        }

        return prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
    }

    /**
     * Update user's wallet address (smart account address)
     */
    static async updateWalletAddress(userId: string, walletAddress: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { walletAddress: walletAddress.toLowerCase() },
        });

        logger.info(`[UserMutationService] Updated wallet address for user ${userId}: ${walletAddress}`);
        return user;
    }

    /**
     * Save (upsert) onboarding analytics — analytics-only, not exposed in UI
     */
    static async saveOnboardingAnalytics(userId: string, data: {
        adsSeenDaily?: string;
        referralSource?: string;
        joinMotivation?: string[];
        socialPlatforms?: string[];
        rewardPreference?: string[];
        engagementStyle?: string;
    }) {
        return prisma.onboardingAnalytics.upsert({
            where: { userId },
            update: { ...data, updatedAt: new Date() },
            create: { userId, ...data },
        });
    }
}
