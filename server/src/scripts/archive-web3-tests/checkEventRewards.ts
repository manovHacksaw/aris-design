import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking "test2" Event ===\n');

    // Find the event
    const event = await prisma.event.findFirst({
        where: {
            title: {
                contains: 'test2',
                mode: 'insensitive'
            }
        },
        include: {
            brand: {
                select: { name: true }
            },
            rewardsPool: {
                include: {
                    claims: {
                        include: {
                            user: {
                                select: { username: true }
                            }
                        }
                    }
                }
            },
            _count: {
                select: {
                    votes: true,
                    submissions: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    if (!event) {
        console.error('❌ Event "test2" not found!');

        // Show recent events
        const recentEvents = await prisma.event.findMany({
            where: {
                brand: {
                    name: {
                        contains: 'Nike',
                        mode: 'insensitive'
                    }
                }
            },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });

        console.log('\nRecent Nike events:');
        recentEvents.forEach(e => {
            console.log(`  - ${e.title} (${e.status}) - ${e.id}`);
        });

        return;
    }

    console.log(`Event: ${event.title}`);
    console.log(`Brand: ${event.brand.name}`);
    console.log(`Status: ${event.status}`);
    console.log(`Type: ${event.eventType}`);
    console.log(`Capacity: ${event.capacity}`);
    console.log(`Total Votes: ${event._count.votes}`);
    console.log(`Total Submissions: ${event._count.submissions}`);
    console.log(`Created: ${event.createdAt}`);

    // Check rewards pool
    console.log(`\n=== Rewards Pool ===`);

    if (!event.rewardsPool) {
        console.error('❌ NO REWARDS POOL FOUND!');
        console.log('\nPossible reasons:');
        console.log('  1. Pool was never created by the brand');
        console.log('  2. Pool creation transaction failed');
        console.log('  3. Event was created before rewards system was implemented');
        console.log('\nTo fix: Brand needs to create a rewards pool for this event.');
        return;
    }

    const pool = event.rewardsPool;
    console.log(`✅ Pool exists`);
    console.log(`Status: ${pool.status}`);
    console.log(`OnChain Event ID: ${pool.onChainEventId}`);
    console.log(`Base Pool: ${pool.basePoolUsdc} USDC`);
    console.log(`Top Pool: ${pool.topPoolUsdc} USDC`);
    console.log(`Max Participants: ${pool.maxParticipants}`);
    console.log(`Actual Participants: ${pool.participantCount}`);
    console.log(`Total Disbursed: ${pool.totalDisbursed} USDC`);

    // Check claims
    console.log(`\n=== Claims ===`);
    console.log(`Total Claims: ${pool.claims.length}`);

    if (pool.claims.length === 0) {
        console.error('❌ NO CLAIMS FOUND!');
        console.log('\nPossible reasons:');
        console.log('  1. Event was not properly finalized/completed');
        console.log('  2. Reward processing failed after event completion');
        console.log('  3. No eligible voters (need at least 1 vote)');
        console.log(`\nEvent status: ${event.status}`);

        if (event.status !== 'completed') {
            console.log(`⚠️  Event is not completed yet (status: ${event.status})`);
            console.log('Claims are only created when event transitions to COMPLETED status.');
        } else {
            console.log('\n🔧 To fix: Manually trigger reward processing:');
            console.log(`   npx tsx -e "import('./src/services/rewardsService.js').then(m => m.RewardsService.processEventRewards('${event.id}'))"`);
        }
        return;
    }

    // Show claims breakdown
    console.log('\nClaims by user:');
    const claimsByUser = new Map<string, any[]>();

    for (const claim of pool.claims) {
        const username = claim.user?.username || 'Unknown';
        if (!claimsByUser.has(username)) {
            claimsByUser.set(username, []);
        }
        claimsByUser.get(username)!.push(claim);
    }

    for (const [username, claims] of claimsByUser.entries()) {
        console.log(`\n  ${username}:`);
        let total = 0;
        for (const claim of claims) {
            console.log(`    - ${claim.claimType}: $${claim.finalAmount.toFixed(4)} (${claim.status})`);
            total += claim.finalAmount;
        }
        console.log(`    Total: $${total.toFixed(4)}`);
    }

    const totalClaimable = pool.claims
        .filter(c => c.status === 'PENDING' || c.status === 'SIGNED')
        .reduce((sum, c) => sum + c.finalAmount, 0);

    console.log(`\n💰 Total Claimable: $${totalClaimable.toFixed(4)} USDC`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
