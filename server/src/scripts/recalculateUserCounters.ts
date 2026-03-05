import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateUserCounters() {
    console.log('🔄 Recalculating user counters based on actual data...\n');

    try {
        // Get all users
        const users = await prisma.user.findMany({
            select: { id: true, email: true, displayName: true }
        });

        console.log(`📍 Found ${users.length} users to process\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                // Count actual votes
                const totalVotes = await prisma.vote.count({
                    where: { userId: user.id }
                });

                // Count actual submissions
                const totalSubmissions = await prisma.submission.count({
                    where: { userId: user.id }
                });

                // Count unique events participated in (voted or submitted)
                const votedEvents = await prisma.vote.findMany({
                    where: { userId: user.id },
                    select: { eventId: true },
                    distinct: ['eventId']
                });

                const submittedEvents = await prisma.submission.findMany({
                    where: { userId: user.id },
                    select: { eventId: true },
                    distinct: ['eventId']
                });

                const uniqueEventIds = new Set([
                    ...votedEvents.map(v => v.eventId),
                    ...submittedEvents.map(s => s.eventId)
                ]);
                const totalEventsParticipated = uniqueEventIds.size;

                // Count actual claimed rewards
                const totalRewardsClaimed = await prisma.rewardClaim.count({
                    where: {
                        userId: user.id,
                        status: 'CLAIMED'
                    }
                });

                // Calculate total earnings from claimed rewards
                const claimedRewards = await prisma.rewardClaim.findMany({
                    where: {
                        userId: user.id,
                        status: 'CLAIMED'
                    },
                    select: { finalAmount: true }
                });
                const totalEarnings = claimedRewards.reduce((sum, claim) => sum + claim.finalAmount, 0);

                // Update user with calculated values
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        totalVotes,
                        totalSubmissions,
                        totalEventsParticipated,
                        totalRewardsClaimed,
                        totalEarnings
                    }
                });

                console.log(`✅ ${user.displayName || user.email}: votes=${totalVotes}, submissions=${totalSubmissions}, events=${totalEventsParticipated}, rewards=${totalRewardsClaimed}, earnings=$${totalEarnings.toFixed(2)}`);
                successCount++;
            } catch (error: any) {
                console.error(`❌ Failed for user ${user.id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log('\n✨ User counter recalculation completed!');
    } catch (error) {
        console.error('\n❌ Error during recalculation:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

recalculateUserCounters()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
