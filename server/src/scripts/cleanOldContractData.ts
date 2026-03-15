import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Cleaning Old Contract Data ===\n');

    // Get all reward pools
    const pools = await prisma.eventRewardsPool.findMany({
        include: {
            event: {
                select: { title: true }
            },
            _count: {
                select: { claims: true }
            }
        }
    });

    console.log(`Found ${pools.length} reward pools\n`);

    let totalClaims = 0;
    let totalPools = 0;

    for (const pool of pools) {
        console.log(`Pool: ${pool.event.title}`);
        console.log(`  Claims: ${pool._count.claims}`);
        console.log(`  Status: ${pool.status}`);
        totalClaims += pool._count.claims;
    }

    console.log(`\nTotal: ${totalPools} pools, ${totalClaims} claims`);
    console.log('\nDeleting all reward claims...');

    // Delete all claims first (foreign key constraint)
    const deletedClaims = await prisma.rewardClaim.deleteMany({});
    console.log(`✅ Deleted ${deletedClaims.count} claims`);

    console.log('\nDeleting all reward pools...');
    const deletedPools = await prisma.eventRewardsPool.deleteMany({});
    console.log(`✅ Deleted ${deletedPools.count} pools`);

    console.log('\n✅ Database cleaned! Ready for new contract.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
