import { ethers } from 'ethers';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { verifySignature, createAuthMessage } from '../utils/signatureVerification';
import { getProvider } from '../utils/provider';
import { generateToken } from '../utils/jwt';
import { NonceResponse, AuthResponse } from '../types/auth';
import { NotificationService } from './notificationService';
import { LoginStreakService } from './loginStreakService';
import { ReferralService } from './referralService';

// In-memory nonce store (in production, use Redis or database)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

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

// Nonce expiration time (5 minutes)
const NONCE_EXPIRATION_MS = 5 * 60 * 1000;

// Session expiration time (7 days)
const SESSION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
    /**
     * Generate a nonce for an address
     */
    static async getNonce(address: string): Promise<NonceResponse> {
        if (!address || !ethers.isAddress(address)) {
            throw new Error('Valid Ethereum address is required');
        }

        // Check if a valid nonce already exists (debounce: return existing if < 30s old)
        const existing = nonceStore.get(address.toLowerCase());
        if (existing && existing.expiresAt > Date.now() + (NONCE_EXPIRATION_MS - 30000)) {
            return {
                nonce: existing.nonce,
                message: createAuthMessage(address, existing.nonce),
            };
        }

        // Generate a random nonce
        const nonce = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + NONCE_EXPIRATION_MS;

        // Store nonce
        nonceStore.set(address.toLowerCase(), { nonce, expiresAt });

        // Create message for user to sign
        const message = createAuthMessage(address, nonce);

        return {
            nonce,
            message,
        };
    }

    /**
     * Authenticate user with signature
     */
    static async login(
        address: string,
        signature: string,
        message: string,
        nonce: string,
        deviceInfo?: string,
        ip?: string,
        email?: string, // Optional email for linking
        referralCode?: string, // Optional referral code for new users
        smartAccountAddress?: string // Enforced Smart Account address
    ): Promise<AuthResponse> {
        // Validate input
        if (!address || !signature || !message || !nonce) {
            throw new Error('Missing required fields');
        }

        if (!ethers.isAddress(address)) {
            throw new Error('Invalid Ethereum address');
        }

        // Verify nonce
        const storedNonce = nonceStore.get(address.toLowerCase());
        if (!storedNonce || storedNonce.nonce !== nonce) {
            throw new Error('Invalid or expired nonce');
        }

        if (Date.now() > storedNonce.expiresAt) {
            nonceStore.delete(address.toLowerCase());
            throw new Error('Nonce has expired');
        }

        // Verify signature
        const provider = getProvider();
        const isValid = await verifySignature(message, signature, address, provider);

        if (!isValid) {
            throw new Error('Invalid signature');
        }

        // Delete used nonce
        nonceStore.delete(address.toLowerCase());

        // Determine the target wallet address to use for the user record
        // We strictly prefer the Smart Account (Kernel) address for rewards distribution
        const targetWalletAddress = (smartAccountAddress || address).toLowerCase();

        // Find or create user by preferred wallet address
        let user = await prisma.user.findUnique({
            where: { walletAddress: targetWalletAddress },
        });

        // Fallback: Check if user exists with the EOA address (if different from smart account)
        if (!user && smartAccountAddress && smartAccountAddress.toLowerCase() !== address.toLowerCase()) {
            user = await prisma.user.findUnique({
                where: { walletAddress: address.toLowerCase() },
            });

            if (user) {
                console.log(`Syncing user ${user.id} from EOA ${address} to Smart Account ${smartAccountAddress}`);
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { walletAddress: smartAccountAddress.toLowerCase() }
                });
            }
        }

        // Check for merge scenario: Wallet belongs to a placeholder user, but we have a verified email for a real user
        if (user && email && user.email.endsWith('@wallet.local') && !user.isOnboarded) {
            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (existingUser) {
                console.log(`Merging placeholder user ${user.id} into existing user ${existingUser.id}`);

                // Delete placeholder user (must be deleted first to free up the wallet address unique constraint)
                // We also need to delete any sessions associated with this placeholder user
                await prisma.userSession.deleteMany({
                    where: { userId: user.id }
                });

                await prisma.user.delete({
                    where: { id: user.id }
                });

                // Link wallet to existing user
                user = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        walletAddress: targetWalletAddress,
                        lastLoginAt: new Date()
                    },
                });
            }
        }

        if (!user) {
            // User not found by wallet.
            // Check if we can link to an existing user by email (if provided)
            if (email) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: email.toLowerCase() },
                });

                if (existingUser) {
                    console.log(`Linking wallet ${address} to existing user ${existingUser.email}`);
                    // Link new wallet to existing user
                    user = await prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            walletAddress: targetWalletAddress,
                            lastLoginAt: new Date()
                        },
                    });
                }
            }

            // If still no user, create a new one
            if (!user) {
                // Create new user if doesn't exist
                // ============================================================================
                // TEMPORARILY DISABLED: Email/Phone Verification
                // ============================================================================
                const isVerificationEnabled = process.env.ENABLE_VERIFICATION === 'true';
                const emailBase2 = email ? email.split('@')[0] : 'user';
                const username2 = await generateUniqueUsername(emailBase2);
                user = await prisma.user.create({
                    data: {
                        email: email?.toLowerCase() || `${targetWalletAddress}@wallet.local`, // Use provided email or placeholder
                        username: username2,
                        displayName: email ? email.split('@')[0] : undefined,
                        walletAddress: targetWalletAddress,
                        lastLoginAt: new Date(),
                        // Auto-verify users when verification is disabled
                        emailVerified: !isVerificationEnabled,
                        phoneVerified: !isVerificationEnabled,
                    },
                });

                // Generate referral code for new user (async, don't block)
                (async () => {
                    try {
                        await ReferralService.generateReferralCode(user.id);
                        console.log(`Generated referral code for new user ${user.id}`);
                    } catch (error) {
                        console.error('Failed to generate referral code:', error);
                        // Don't fail login for referral code generation errors
                    }
                })();

                // Process referral for new user (if referral code provided)
                if (referralCode) {
                    (async () => {
                        try {
                            await ReferralService.processReferral(user.id, referralCode);
                            console.log(`Processed referral for new user ${user.id} with code ${referralCode}`);
                        } catch (error) {
                            console.error('Failed to process referral:', error);
                            // Don't fail login for referral errors
                        }
                    })();
                }
            }
        } else {
            // Update last login
            user = await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
        }

        // Create a new session
        const session = await prisma.userSession.create({
            data: {
                userId: user.id,
                deviceInfo: deviceInfo || null,
                ip: ip || null,
                expiredAt: new Date(Date.now() + SESSION_EXPIRATION_MS),
                isActive: true,
            },
        });

        // Send welcome and streak notifications (async, don't block login)
        (async () => {
            try {
                // Send welcome notification for first-time users
                await NotificationService.createWelcomeNotification(user.id);

                // Update login streak and check milestones using LoginStreakService
                const streakResult = await LoginStreakService.recordDailyLogin(user.id);

                // Send streak notification
                if (streakResult.currentStreak >= 2) {
                    await NotificationService.createStreakNotification(user.id, streakResult.currentStreak);
                }

                // Send XP milestone notifications for any claimed
                if (streakResult.newMilestonesClaimed.length > 0) {
                    for (const milestone of streakResult.newMilestonesClaimed) {
                        try {
                            await NotificationService.createXpMilestoneNotification(user.id, milestone);
                        } catch (err) {
                            console.error('Failed to send XP milestone notification:', err);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to create login notifications:', error);
                // Don't throw - notifications shouldn't break login
            }
        })();

        // Generate JWT token
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
            },
        };
    }

    /**
     * Authenticate user via Privy token (no signature required)
     */
    static async privyLogin(
        verifiedClaims: { userId: string },
        walletAddress?: string,
        email?: string,
        deviceInfo?: string,
        ip?: string,
        avatarUrl?: string
    ): Promise<AuthResponse> {
        const targetWalletAddress = walletAddress?.toLowerCase();
        const privyId = verifiedClaims.userId;

        // 1. Find user by Privy ID first (most robust)
        let user = await prisma.user.findUnique({
            where: { privyId },
        });

        // 2. Fallback to Email if provided
        if (!user && email) {
            user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
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
                    walletAddress: creationWallet || null, // Don't use "privy:..." in walletAddress field anymore
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
            // Update last login and backfill avatarUrl
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
                },
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
            },
        };
    }

    /**
     * Verify signature (helper for testing)
     */
    static async verifySignature(address: string, signature: string, message: string): Promise<boolean> {
        const provider = getProvider();
        return verifySignature(message, signature, address, provider);
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
