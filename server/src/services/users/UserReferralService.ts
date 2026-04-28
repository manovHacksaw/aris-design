import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { XpService } from '../xp/xpService';

/**
 * UserReferralService handles user-to-user referral links and associated XP rewards.
 * Note: This logic complements the existing ReferralService. Consolidate in future iterations.
 */
export class UserReferralService {
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
                    balanceAfter: (referrer.xp || 0) + 5,
                },
            }),
        ]);

        // Also grant XP bonus to the referred user for using a referral code
        try {
            await XpService.grantXp({
                userId: referredId,
                amount: 5,
                type: 'REFERRAL_BASE',
                description: 'Joined with a referral code',
            });
        } catch (e) {
            logger.warn(e, '[UserReferralService.applyReferral] Referred-user XP grant failed:');
        }

        return { success: true };
    }
}
