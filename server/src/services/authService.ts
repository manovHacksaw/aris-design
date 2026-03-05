import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';
import { AuthResponse } from '../types/auth';
import { NotificationService } from './notificationService';
import { LoginStreakService } from './loginStreakService';

// Session expiration time (7 days)
const SESSION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Generate a unique username from a base string (email prefix, name, or fallback) */
async function generateUniqueUsername(base: string): Promise<string> {
    // Sanitise: lowercase, replace spaces/dots/hyphens with _, strip everything else
    const cleaned = base
        .toLowerCase()
        .replace(/[@.+\-\s]/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 20) || 'user';

    // Try the clean base first, then append random suffix until unique
    let candidate = cleaned;
    let attempts = 0;
    while (attempts < 10) {
        const existing = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
        if (!existing) return candidate;
        candidate = `${cleaned}_${Math.floor(1000 + Math.random() * 9000)}`;
        attempts++;
    }
    // Last resort: full random
    return `user_${Math.random().toString(36).slice(2, 10)}`;
}

export class AuthService {

    /**
     * Authenticate user via Privy token (no signature required)
     */
    static async privyLogin(
        verifiedClaims: { userId: string },
        walletAddress?: string,
        email?: string,
        deviceInfo?: string,
        ip?: string,
        avatarUrl?: string,
        eoaAddress?: string
    ): Promise<AuthResponse> {
        const targetWalletAddress = walletAddress?.toLowerCase();
        const targetEoaAddress = eoaAddress?.toLowerCase();
        const privyId = verifiedClaims.userId;

        // 1. Find user by Privy ID first (most robust)
        let user = await prisma.user.findUnique({
            where: { privyId },
            include: { ownedBrands: true }
        });

        // 2. Fallback to Email if provided
        if (!user && email) {
            user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                include: { ownedBrands: true }
            });

            // If found by email, link the privyId for future logins
            if (user) {
                console.log(`Linking Privy ID ${privyId} to existing user ${user.email}`);
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { privyId },
                });
            }
        }

        // 3. Fallback to Wallet Address
        if (!user && targetWalletAddress) {
            user = await prisma.user.findUnique({
                where: { walletAddress: targetWalletAddress },
                include: { ownedBrands: true }
            });

            // If found by wallet but they have a DIFFERENT privyId or email, 
            // then this wallet belongs to someone else. 
            // We should NOT blindly log them in as the brand owner.
            if (user && user.privyId && user.privyId !== privyId) {
                console.warn(`Wallet ${targetWalletAddress} is already linked to Privy ID ${user.privyId}. This login is for ${privyId}.`);
                user = null; // Force creation of a NEW user for this Privy account
            } else if (user) {
                // Same wallet, link the privyId if missing
                console.log(`Linking Privy ID ${privyId} to existing user via wallet ${targetWalletAddress}`);
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { privyId },
                });
            }
        }

        if (!user) {
            // Create new user
            const isVerificationEnabled = process.env.ENABLE_VERIFICATION === 'true';
            // If the wallet is already taken, this new user gets NO wallet link initially (or a placeholder)
            // to avoid unique constraint violations. They can link a wallet later if it's freed.
            let creationWallet = targetWalletAddress;
            if (targetWalletAddress) {
                const existingWalletUser = await prisma.user.findUnique({ where: { walletAddress: targetWalletAddress } });
                if (existingWalletUser) {
                    console.warn(`Wallet ${targetWalletAddress} is already in use. Creating user without wallet link.`);
                    creationWallet = undefined;
                }
            }

            const placeholderAddress = creationWallet || `privy:${privyId}`;
            const emailBase = email ? email.split('@')[0] : 'user';
            const username = await generateUniqueUsername(emailBase);

            user = await prisma.user.create({
                data: {
                    privyId,
                    email: email?.toLowerCase() || `${placeholderAddress}@wallet.local`,
                    username,
                    displayName: email ? email.split('@')[0] : undefined,
                    avatarUrl: avatarUrl || null,
                    walletAddress: creationWallet || null,
                    eoaAddress: targetEoaAddress || null,
                    lastLoginAt: new Date(),
                    emailVerified: !isVerificationEnabled,
                    phoneVerified: !isVerificationEnabled,
                },
            });

            // Generate referral code for new user (async, don't block)
            (async () => {
                try {
                    const { ReferralService } = await import('./referralService');
                    await ReferralService.generateReferralCode(user!.id);
                } catch (error) {
                    console.error('Failed to generate referral code:', error);
                }
            })();
        } else {
            // Update last login, sync wallet addresses, and backfill avatarUrl
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    ...(targetWalletAddress ? { walletAddress: targetWalletAddress } : {}),
                    ...(targetEoaAddress ? { eoaAddress: targetEoaAddress } : {}),
                    ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
                },
                include: { ownedBrands: true }
            });
        }

        // Create session
        const session = await prisma.userSession.create({
            data: {
                userId: user.id,
                deviceInfo: deviceInfo || null,
                ip: ip || null,
                expiredAt: new Date(Date.now() + SESSION_EXPIRATION_MS),
                isActive: true,
            },
        });

        // Send notifications and streak updates (async, don't block)
        (async () => {
            try {
                await NotificationService.createWelcomeNotification(user!.id);
                const streakResult = await LoginStreakService.recordDailyLogin(user!.id);
                if (streakResult.currentStreak >= 2) {
                    await NotificationService.createStreakNotification(user!.id, streakResult.currentStreak);
                }
                for (const milestone of streakResult.newMilestonesClaimed) {
                    try {
                        await NotificationService.createXpMilestoneNotification(user!.id, milestone);
                    } catch (err) {
                        console.error('Failed to send XP milestone notification:', err);
                    }
                }
            } catch (error) {
                console.error('Failed to create login notifications:', error);
            }
        })();

        const token = generateToken({
            userId: user.id,
            address: user.walletAddress!,
            email: user.email,
            sessionId: session.id,
        });

        return {
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                walletAddress: user.walletAddress,
                isOnboarded: user.isOnboarded,
                xp: user.xp,
                level: user.level,
                preferredBrands: user.preferredBrands,
                preferredCategories: user.preferredCategories,
                socialLinks: user.socialLinks,
                emailVerified: user.emailVerified,
                phoneNumber: user.phoneNumber,
                phoneVerified: user.phoneVerified,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                role: user.role,
                ownedBrands: user.ownedBrands || [],
            },
        };
    }

    /**
     * Logout user
     */
    static async logout(sessionId: string): Promise<void> {
        await prisma.userSession.update({
            where: { id: sessionId },
            data: { isActive: false },
        });
    }
}
