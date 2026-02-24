
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEvent(eventId: string, name: string) {
    console.log(`\n📊 Verifying Rewards for ${name} (Event: ${eventId})`);

    const claims = await prisma.rewardClaim.findMany({
        where: { pool: { eventId } },
        include: { user: true }
    });

    if (claims.length === 0) {
        console.log('❌ No claims found.');
        return;
    }

    const leaderboardClaims = claims.filter(c => c.claimType === 'LEADERBOARD');
    const creatorClaims = claims.filter(c => c.claimType === 'CREATOR');
    const topClaims = claims.filter(c => c.claimType === 'TOP_VOTER');
    const baseClaims = claims.filter(c => c.claimType === 'BASE_VOTER');

    console.log(`\n--- Summary ---`);
    console.log(`Total Claims: ${claims.length}`);
    console.log(`Leaderboard Claims: ${leaderboardClaims.length}`);
    console.log(`Creator Claims: ${creatorClaims.length}`);
    console.log(`Top Voter Claims: ${topClaims.length}`);
    console.log(`Base Voter Claims: ${baseClaims.length}`);

    const sample = claims[0];
    if (sample && sample.transactionHash && sample.transactionHash.startsWith('0x') && !sample.transactionHash.includes('_')) {
        console.log(`✅ Transaction Hash Confirmed: ${sample.transactionHash} (Batch)`);
    } else {
        console.log(`⚠️ Transaction Hash Missing or Mock: ${sample?.transactionHash}`);
    }

    // Detailed Payouts for inspection
    if (leaderboardClaims.length > 0) {
        console.log(`   Detailed Leaderboard: ${leaderboardClaims.map(c => `${c.user.username}($${c.finalAmount})`).join(', ')}`);
    }
}

async function main() {
    await verifyEvent('c9428ccf-9d90-41a0-a73d-3a7203d0ec86', 'Post & Vote (Smart Accounts)');
    await verifyEvent('84df2a63-4800-483f-b005-01ecfe37d8b7', 'Vote Only (Smart Accounts)');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
