import { PrismaClient } from '@prisma/client';
import { ReferralService } from '../services/referralService.js';

const prisma = new PrismaClient();

async function generateReferralCodes() {
    console.log('🔄 Generating referral codes for existing users...\n');

    try {
        // Find all users without referral codes
        const usersWithoutCodes = await prisma.user.findMany({
            where: {
                referralCode: null
            },
            select: {
                id: true,
                email: true,
                displayName: true
            }
        });

        console.log(`📍 Found ${usersWithoutCodes.length} users without referral codes\n`);

        if (usersWithoutCodes.length === 0) {
            console.log('✨ All users already have referral codes!');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const user of usersWithoutCodes) {
            try {
                const referralCode = await ReferralService.generateReferralCode(user.id);
                console.log(`✅ Generated code for ${user.displayName || user.email}: ${referralCode}`);
                successCount++;
            } catch (error: any) {
                console.error(`❌ Failed for user ${user.id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log('\n✨ Referral code generation completed!');
    } catch (error) {
        console.error('\n❌ Error during referral code generation:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

generateReferralCodes()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
