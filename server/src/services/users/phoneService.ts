import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { firebaseAdmin } from '../../lib/firebaseAdmin';

export class PhoneService {
    /**
     * Check if phone number is available
     */
    static async checkAvailability(phoneNumber: string, currentUserId: string) {
        const existingUser = await prisma.user.findFirst({
            where: {
                phoneNumber: phoneNumber,
                NOT: { id: currentUserId },
            },
        });

        return !existingUser;
    }

    /**
     * Verify Firebase ID token and update user's phone number
     */
    static async verifyFirebasePhone(idToken: string, userId: string) {
        let phoneNumber: string | undefined;

        const apiKey = process.env.FIREBASE_API_KEY;
        if (!apiKey) {
            logger.warn("FIREBASE_API_KEY not found in server env, trying to use Admin SDK...");
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
            phoneNumber = decodedToken.phone_number;
        } else {
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });

            if (!response.ok) {
                throw new Error(`Identity Toolkit API Error: ${response.statusText}`);
            }

            const data: any = await response.json();
            if (!data.users || data.users.length === 0) {
                throw new Error("Invalid ID token: No user found");
            }

            phoneNumber = data.users[0].phoneNumber;
        }

        if (!phoneNumber) {
            throw new Error('No phone number found in the token');
        }

        // Check if phone number is already used
        const existingUser = await prisma.user.findFirst({
            where: {
                phoneNumber: phoneNumber,
                NOT: { id: userId },
            },
        });

        if (existingUser) {
            throw new Error('Phone number is already registered to another account');
        }

        // Update user
        return prisma.user.update({
            where: { id: userId },
            data: {
                phoneNumber: phoneNumber,
                phoneVerified: true,
            },
        });
    }
    /**
     * Bypass verification and update phone (used when verification is disabled)
     */
    static async bypassVerification(phoneNumber: string, userId: string) {
        // Check availability
        const existingUser = await prisma.user.findFirst({
            where: {
                phoneNumber: phoneNumber,
                NOT: { id: userId },
            },
        });

        if (existingUser) {
            throw new Error('Phone number is already registered to another account');
        }

        return prisma.user.update({
            where: { id: userId },
            data: {
                phoneNumber: phoneNumber,
                phoneVerified: true,
            },
        });
    }
}
