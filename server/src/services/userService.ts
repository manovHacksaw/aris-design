import { prisma } from '../lib/prisma.js';
import { LoginStreakService } from './loginStreakService.js';

export class UserService {
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
                sessions: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
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
                sessions: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
                ownedBrands: true,
                loginStreak: true,
            },
        });
    }

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
            // Auto-generate referral code on first onboarding completion
            if (isOnboarded === true) {
                const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
                if (!currentUser?.referralCode) {
                    updateData.referralCode = `ARIS-${userId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
     * Get user statistics
     */
    static async getUserStats(userId: string) {
        try {
            console.log(`[getUserStats] Fetching stats for user: ${userId}`);

            // Verify user exists first
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true },
            });

            if (!user) {
                console.error(`[getUserStats] User not found: ${userId}`);
                throw new Error('User not found');
            }

            // Update login streak in background (don't block stats response)
            LoginStreakService.recordDailyLogin(userId).catch((streakError) => {
                console.error('[getUserStats] Failed to update login streak:', streakError);
            });

            // Run all queries in parallel for faster response
            const [
                followersCount,
                followingCount,
                brandSubscriptionsCount,
                submissionsCount,
                votesCount,
                submissionsVotes,
                eventsParticipated,
                rewardClaims,
                otherEarnings,
            ] = await Promise.all([
                // 1. Followers (Subscribers)
                prisma.userFollowers.count({
                    where: { followingId: userId },
                }),
                // 2. Following
                prisma.userFollowers.count({
                    where: { followerId: userId },
                }),
                // 3. Brand Subscriptions
                prisma.brandSubscription.count({
                    where: { userId },
                }),
                // 4. Posts (Submissions)
                prisma.submission.count({
                    where: { userId },
                }),
                // 5. Votes Cast
                prisma.vote.count({
                    where: { userId },
                }),
                // 5b. Votes Received (total votes on user's content)
                prisma.submission.aggregate({
                    where: { userId },
                    _sum: { voteCount: true },
                }),
                // 6. Events Participated
                prisma.vote.findMany({
                    where: { userId },
                    select: { eventId: true },
                    distinct: ['eventId'],
                }),
                // 7. Reward Claims
                prisma.rewardClaim.aggregate({
                    where: {
                        userId,
                        status: 'CLAIMED',
                    },
                    _sum: { finalAmount: true },
                }),
                // 8. Other Earnings
                prisma.tokenActivityLog.aggregate({
                    where: {
                        userId,
                        actionType: { in: ['EARNING', 'AIRDROP'] },
                    },
                    _sum: { amount: true },
                }),
            ]);

            const totalEarnings = (rewardClaims._sum.finalAmount || 0) + (otherEarnings._sum.amount || 0);
            const votesReceived = (submissionsVotes._sum.voteCount || 0);

            const stats = {
                subscribers: followersCount,
                subscriptions: followingCount + brandSubscriptionsCount,
                posts: submissionsCount,
                votes: votesCount, // Legacy compat
                votesCast: votesCount,
                votesReceived: votesReceived,
                events: eventsParticipated.length,
                earnings: totalEarnings,
            };

            console.log(`[getUserStats] Stats for ${userId}:`, JSON.stringify(stats));

            return stats;
        } catch (error) {
            console.error('[getUserStats] Critical error:', error);
            throw error;
        }
    }

    /**
     * Follow a user
     */
    static async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) {
            throw new Error('Cannot follow yourself');
        }

        const existingFollow = await prisma.userFollowers.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (existingFollow) {
            return { success: false, message: 'Already following this user' };
        }

        await prisma.userFollowers.create({
            data: {
                followerId,
                followingId,
            },
        });

        return { success: true, message: 'Successfully followed user' };
    }

    /**
     * Unfollow a user
     */
    static async unfollowUser(followerId: string, followingId: string) {
        const existingFollow = await prisma.userFollowers.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (!existingFollow) {
            return { success: false, message: 'Not following this user' };
        }

        await prisma.userFollowers.delete({
            where: {
                id: existingFollow.id,
            },
        });

        return { success: true, message: 'Successfully unfollowed user' };
    }

    /**
     * Get user followers
     */
    static async getFollowers(userId: string) {
        const followers = await prisma.userFollowers.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return followers.map(f => ({
            ...f.follower,
            followedAt: f.createdAt,
        }));
    }

    /**
     * Get users followed by user (following)
     */
    static async getFollowing(userId: string) {
        const following = await prisma.userFollowers.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return following.map(f => ({
            ...f.following,
            followedAt: f.createdAt,
        }));
    }

    /**
     * Update user's wallet address (smart account address)
     */
    static async updateWalletAddress(userId: string, walletAddress: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { walletAddress: walletAddress.toLowerCase() },
        });

        console.log(`[UserService] Updated wallet address for user ${userId}: ${walletAddress}`);
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

    /**
     * Validate a referral code without applying it
     * Returns the referrer's display name if valid
     */
    static async validateReferralCode(referralCode: string, requestingUserId: string) {
        const referrer = await prisma.user.findUnique({
            where: { referralCode },
            select: { id: true, displayName: true, username: true },
        });

        if (!referrer) return { valid: false, reason: 'Invalid code' };
        if (referrer.id === requestingUserId) return { valid: false, reason: 'Cannot use your own code' };

        const alreadyUsed = await prisma.referral.findUnique({ where: { referredId: requestingUserId } });
        if (alreadyUsed) return { valid: false, reason: 'You have already used a referral code' };

        return { valid: true, referrerName: referrer.displayName || referrer.username || 'a friend' };
    }

    /**
     * Apply a referral code — links referrer to new user and awards XP to referrer
     */
    static async applyReferral(referredId: string, referralCode: string) {
        // Find the referrer by their code
        const referrer = await prisma.user.findUnique({
            where: { referralCode },
            select: { id: true, xp: true },
        });

        if (!referrer) throw new Error('Invalid referral code');
        if (referrer.id === referredId) throw new Error('You cannot use your own referral code');

        // Make sure this user hasn't already been referred
        const existing = await prisma.referral.findUnique({
            where: { referredId },
        });
        if (existing) throw new Error('You have already used a referral code');

        // Create the referral record and award XP to referrer atomically
        await prisma.$transaction([
            prisma.referral.create({
                data: { referrerId: referrer.id, referredId, xpAwarded: 5 },
            }),
            prisma.user.update({
                where: { id: referrer.id },
                data: { xp: { increment: 5 } },
            }),
            prisma.xpTransaction.create({
                data: {
                    userId: referrer.id,
                    amount: 5,
                    type: 'REFERRAL_BASE',
                    description: `Referral bonus — friend joined using your code`,
                    balanceAfter: referrer.xp + 5,
                },
            }),
        ]);

        return { success: true };
    }
}
