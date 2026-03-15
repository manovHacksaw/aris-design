/**
 * Cleanup Script: Remove events and rewards created with old smart contracts
 *
 * The new RewardsVaultV3 contract was deployed on 2026-02-07T05:26:51.265Z
 * at address: 0x7BEbA9297aED5a2c09a05807617318bAA0F561C6
 *
 * This script removes all events and related data created before this deployment.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// New contract deployment timestamp
const NEW_CONTRACT_DEPLOYMENT = new Date('2026-02-07T05:26:51.265Z');
const NEW_CONTRACT_ADDRESS = '0x7BEbA9297aED5a2c09a05807617318bAA0F561C6';

async function cleanupOldContractData() {
    console.log('='.repeat(60));
    console.log('🧹 Cleanup Script: Old Contract Data');
    console.log('='.repeat(60));
    console.log(`New contract deployed at: ${NEW_CONTRACT_DEPLOYMENT.toISOString()}`);
    console.log(`New contract address: ${NEW_CONTRACT_ADDRESS}`);
    console.log('');

    try {
        // Find events created before the new contract deployment
        const oldEvents = await prisma.event.findMany({
            where: {
                createdAt: {
                    lt: NEW_CONTRACT_DEPLOYMENT
                }
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
                onChainEventId: true,
                poolTxHash: true,
                blockchainStatus: true,
                _count: {
                    select: {
                        votes: true,
                        submissions: true,
                        proposals: true,
                    }
                }
            }
        });

        console.log(`Found ${oldEvents.length} events created before new contract deployment:\n`);

        if (oldEvents.length === 0) {
            console.log('✅ No old events to clean up!');
            return;
        }

        // Display events to be deleted
        for (const event of oldEvents) {
            console.log(`  📌 "${event.title}" (${event.id})`);
            console.log(`     Created: ${event.createdAt.toISOString()}`);
            console.log(`     Votes: ${event._count.votes}, Submissions: ${event._count.submissions}, Proposals: ${event._count.proposals}`);
            console.log(`     OnChainId: ${event.onChainEventId || 'N/A'}`);
            console.log('');
        }

        const eventIds = oldEvents.map(e => e.id);

        console.log('🗑️  Starting cleanup...\n');

        // Delete in correct order to respect foreign key constraints

        // 1. Find pools for these events first
        const pools = await prisma.eventRewardsPool.findMany({
            where: { eventId: { in: eventIds } },
            select: { id: true }
        });
        const poolIds = pools.map(p => p.id);

        // 2. Delete reward claims (via poolId)
        if (poolIds.length > 0) {
            const deletedClaims = await prisma.rewardClaim.deleteMany({
                where: { poolId: { in: poolIds } }
            });
            console.log(`   ✓ Deleted ${deletedClaims.count} reward claims`);
        } else {
            console.log(`   ✓ No reward claims to delete (no pools found)`);
        }

        // 3. Delete votes
        const deletedVotes = await prisma.vote.deleteMany({
            where: { eventId: { in: eventIds } }
        });
        console.log(`   ✓ Deleted ${deletedVotes.count} votes`);

        // 4. Delete submissions
        const deletedSubmissions = await prisma.submission.deleteMany({
            where: { eventId: { in: eventIds } }
        });
        console.log(`   ✓ Deleted ${deletedSubmissions.count} submissions`);

        // 5. Delete proposals
        const deletedProposals = await prisma.proposal.deleteMany({
            where: { eventId: { in: eventIds } }
        });
        console.log(`   ✓ Deleted ${deletedProposals.count} proposals`);

        // 6. Delete event analytics
        const deletedAnalytics = await prisma.eventAnalytics.deleteMany({
            where: { eventId: { in: eventIds } }
        });
        console.log(`   ✓ Deleted ${deletedAnalytics.count} event analytics records`);

        // 7. Delete event rewards pools (cascade deletes claims)
        const deletedPools = await prisma.eventRewardsPool.deleteMany({
            where: { eventId: { in: eventIds } }
        });
        console.log(`   ✓ Deleted ${deletedPools.count} event rewards pools`);

        // 8. Finally, delete the events
        const deletedEvents = await prisma.event.deleteMany({
            where: { id: { in: eventIds } }
        });
        console.log(`   ✓ Deleted ${deletedEvents.count} events`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ Cleanup completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupOldContractData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
