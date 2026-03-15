import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = '2a7e1a7c-7348-4d1c-ad76-b4fe6bd77063';

async function main() {
    console.log('=== Checking Reward Claims ===\n');

    // Get the event with pool
    const event = await prisma.event.findUnique({
        where: { id: EVENT_ID },
        include: {
            rewardsPool: {
                include: {
                    claims: {
                        include: {
                            user: {
                                select: { username: true, id: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!event) {
        console.error('Event not found!');
        return;
    }

    console.log(`Event: ${event.title}`);
    console.log(`Pool Status: ${event.rewardsPool?.status || 'NO POOL'}`);

    if (!event.rewardsPool) {
        console.error('\n❌ No rewards pool found for this event!');
        return;
    }

    const pool = event.rewardsPool;

    console.log(`\nPool Details:`);
    console.log(`  Base Pool: ${pool.basePoolUsdc} USDC`);
    console.log(`  Top Pool: ${pool.topPoolUsdc} USDC`);
    console.log(`  Creator Pool: ${pool.creatorPoolUsdc} USDC`);
    console.log(`  Platform Fee: ${pool.platformFeeUsdc} USDC`);
    console.log(`  Max Participants: ${pool.maxParticipants}`);
    console.log(`  Actual Participants: ${pool.participantCount}`);
    console.log(`  Total Disbursed: ${pool.totalDisbursed} USDC`);

    console.log(`\n=== Claims (${pool.claims.length} total) ===\n`);

    // Group by user
    const claimsByUser = new Map<string, any[]>();

    for (const claim of pool.claims) {
        const username = claim.user?.username || 'Unknown';
        if (!claimsByUser.has(username)) {
            claimsByUser.set(username, []);
        }
        claimsByUser.get(username)!.push(claim);
    }

    for (const [username, claims] of claimsByUser.entries()) {
        console.log(`👤 ${username}:`);
        let userTotal = 0;

        for (const claim of claims) {
            console.log(`  - ${claim.claimType}: $${claim.finalAmount.toFixed(4)} USDC (base: ${claim.baseAmount}, mult: ${claim.multiplier}x) [${claim.status}]`);
            userTotal += claim.finalAmount;
        }

        console.log(`  Total: $${userTotal.toFixed(4)} USDC\n`);
    }

    // Summary
    const totalClaimable = pool.claims
        .filter(c => c.status === 'PENDING' || c.status === 'SIGNED')
        .reduce((sum, c) => sum + c.finalAmount, 0);

    const totalClaimed = pool.claims
        .filter(c => c.status === 'CLAIMED')
        .reduce((sum, c) => sum + c.finalAmount, 0);

    console.log(`\n=== Summary ===`);
    console.log(`Total Claimable: $${totalClaimable.toFixed(4)} USDC`);
    console.log(`Total Claimed: $${totalClaimed.toFixed(4)} USDC`);
    console.log(`Total All Claims: $${pool.claims.reduce((sum, c) => sum + c.finalAmount, 0).toFixed(4)} USDC`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
