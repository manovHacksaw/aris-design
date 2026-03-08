import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = 'bc7ff604-aa7b-4405-b45b-ae641c5c191a';

async function castFinalVotes() {
    console.log('🗳️  Casting final votes to complete event...\n');

    try {
        // Get any 2 users who haven't voted yet
        const event = await prisma.event.findUnique({
            where: { id: EVENT_ID },
            include: { proposals: true }
        });

        if (!event) {
            console.log('❌ Event not found');
            return;
        }

        // Get users who haven't voted
        const votedUserIds = await prisma.vote.findMany({
            where: { eventId: EVENT_ID },
            select: { userId: true }
        }).then(votes => votes.map(v => v.userId));

        const remainingUsers = await prisma.user.findMany({
            where: {
                id: { notIn: votedUserIds },
                email: { not: { endsWith: '@wallet.local' } }
            },
            take: 2,
            select: { id: true, email: true, displayName: true }
        });

        console.log(`📍 Found ${remainingUsers.length} users to complete voting\n`);

        for (const user of remainingUsers) {
            const randomProposal = event.proposals[Math.floor(Math.random() * event.proposals.length)];

            await prisma.vote.create({
                data: {
                    eventId: EVENT_ID,
                    proposalId: randomProposal.id,
                    userId: user.id
                }
            });

            await prisma.user.update({
                where: { id: user.id },
                data: { totalVotes: { increment: 1 } }
            });

            console.log(`✅ ${user.displayName || user.email} → ${randomProposal.content}`);
        }

        // Update analytics
        await prisma.eventAnalytics.update({
            where: { eventId: EVENT_ID },
            data: { totalVotes: { increment: remainingUsers.length } }
        });

        const finalCount = await prisma.vote.count({ where: { eventId: EVENT_ID } });
        console.log(`\n📊 Total Votes: ${finalCount}/${event.capacity}`);

        if (finalCount >= event.capacity) {
            console.log('\n🎯 CAPACITY REACHED! Completing event...\n');

            // Update event to COMPLETED
            await prisma.event.update({
                where: { id: EVENT_ID },
                data: { status: 'COMPLETED' }
            });

            console.log('✅ Event status: COMPLETED');

            // Check for rewards pool
            const pool = await prisma.eventRewardsPool.findUnique({
                where: { eventId: EVENT_ID }
            });

            if (pool) {
                console.log('\n💰 Reward Pool:');
                console.log(`   Base Pool: $${pool.basePoolUsdc}`);
                console.log(`   Top Pool: $${pool.topPoolUsdc}`);
                console.log(`   Status: ${pool.status}`);

                console.log('\n🎁 Checking for reward claims...');
                const claims = await prisma.rewardClaim.findMany({
                    where: { poolId: pool.id },
                    include: { user: { select: { displayName: true, email: true } } }
                });

                if (claims.length > 0) {
                    console.log(`\n✅ Found ${claims.length} reward claims:`);
                    claims.forEach(claim => {
                        console.log(`   - ${claim.user.displayName || claim.user.email}: $${claim.finalAmount} (${claim.claimType}) - ${claim.status}`);
                    });
                } else {
                    console.log('\n⚠️  No reward claims found. Rewards may need to be processed by backend service.');
                }
            } else {
                console.log('\nℹ️  No reward pool for this event (test event without rewards)');
            }
        }

        console.log(`\n📝 View at: http://localhost:3000/events/${EVENT_ID}`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

castFinalVotes();
