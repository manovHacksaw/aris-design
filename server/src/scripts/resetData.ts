import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetData() {
    console.log('🔄 Starting data reset...\n');

    try {
        // 1. Find Nike brand
        const nikeBrand = await prisma.brand.findFirst({
            where: { name: { contains: 'Nike', mode: 'insensitive' } }
        });

        if (nikeBrand) {
            console.log(`📍 Found Nike brand: ${nikeBrand.name} (ID: ${nikeBrand.id})`);

            // Delete all events for Nike brand (cascade will handle related data)
            const deletedEvents = await prisma.event.deleteMany({
                where: { brandId: nikeBrand.id }
            });
            console.log(`✅ Deleted ${deletedEvents.count} Nike events (and related data)`);
        } else {
            console.log('⚠️  Nike brand not found');
        }

        // 2. Delete all reward claims (user earnings are tracked here)
        const deletedClaims = await prisma.rewardClaim.deleteMany({});
        console.log(`✅ Deleted ${deletedClaims.count} reward claims`);

        // 3. Delete all token activity logs (earnings history)
        const deletedLogs = await prisma.tokenActivityLog.deleteMany({});
        console.log(`✅ Deleted ${deletedLogs.count} token activity logs`);

        // 4. Delete all reward pools
        const deletedPools = await prisma.eventRewardsPool.deleteMany({});
        console.log(`✅ Deleted ${deletedPools.count} reward pools`);

        // 5. Reset all brands' USDC distributed to 0
        const updatedBrands = await prisma.brand.updateMany({
            data: {
                totalUsdcGiven: 0
            }
        });
        console.log(`✅ Reset USDC distributed for ${updatedBrands.count} brands to 0`);

        // 6. Reset all users' achievement counters to 0
        const updatedUsers = await prisma.user.updateMany({
            data: {
                totalEarnings: 0,
                totalVotes: 0,
                totalSubmissions: 0,
                totalEventsParticipated: 0,
                totalRewardsClaimed: 0,
            }
        });
        console.log(`✅ Reset all counters for ${updatedUsers.count} users to 0`);

        console.log('\n✨ Data reset completed successfully!');
    } catch (error) {
        console.error('\n❌ Error during data reset:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetData()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
