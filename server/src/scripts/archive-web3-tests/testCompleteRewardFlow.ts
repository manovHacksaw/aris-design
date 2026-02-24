import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = '3149747c-422f-473e-9aef-c402f3b8f11d';

async function testCompleteRewardFlow() {
    console.log('🎯 Testing Complete Reward Flow\n');
    console.log('='.repeat(70));

    try {
        // Step 1: Get event details
        console.log('\n📍 Step 1: Fetching event details...');
        const event = await prisma.event.findUnique({
            where: { id: EVENT_ID },
            include: {
                proposals: true,
                rewardsPool: true,
                brand: { select: { name: true } }
            }
        });

        if (!event) {
            console.log('❌ Event not found');
            return;
        }

        console.log(`✅ Event: ${event.title}`);
        console.log(`   Brand: ${event.brand.name}`);
        console.log(`   Type: ${event.eventType}`);
        console.log(`   Capacity: ${event.capacity}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Proposals: ${event.proposals.length}`);

        if (event.rewardsPool) {
            console.log(`\n💰 Reward Pool:`);
            console.log(`   Base Pool: $${event.rewardsPool.basePoolUsdc}`);
            console.log(`   Top Pool: $${event.rewardsPool.topPoolUsdc}`);
            console.log(`   Platform Fee: $${event.rewardsPool.platformFeeUsdc}`);
            console.log(`   Creator Pool: $${event.rewardsPool.creatorPoolUsdc}`);
            console.log(`   Status: ${event.rewardsPool.status}`);
        } else {
            console.log('\n⚠️  No reward pool found');
        }

        // Step 2: Check current votes
        const currentVotes = await prisma.vote.count({ where: { eventId: EVENT_ID } });
        console.log(`\n📍 Step 2: Current votes: ${currentVotes}/${event.capacity}`);

        if (currentVotes >= event.capacity) {
            console.log('⚠️  Event already at capacity');
        } else {
            // Step 3: Cast votes
            console.log(`\n📍 Step 3: Casting ${event.capacity - currentVotes} votes...`);

            const votedUserIds = await prisma.vote.findMany({
                where: { eventId: EVENT_ID },
                select: { userId: true }
            }).then(votes => votes.map(v => v.userId));

            const users = await prisma.user.findMany({
                where: {
                    id: { notIn: votedUserIds },
                    email: { not: { endsWith: '@wallet.local' } }
                },
                take: event.capacity - currentVotes,
                select: { id: true, email: true, displayName: true }
            });

            console.log(`   Found ${users.length} users to vote\n`);

            for (const user of users) {
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

                console.log(`   ✅ ${user.displayName || user.email} → ${randomProposal.content}`);
            }

            await prisma.eventAnalytics.update({
                where: { eventId: EVENT_ID },
                data: { totalVotes: { increment: users.length } }
            });
        }

        // Step 4: Check if capacity reached
        const finalVotes = await prisma.vote.count({ where: { eventId: EVENT_ID } });
        console.log(`\n📍 Step 4: Final vote count: ${finalVotes}/${event.capacity}`);

        if (finalVotes >= event.capacity && event.status !== 'COMPLETED') {
            console.log('\n🎯 CAPACITY REACHED! Triggering event completion...');

            // Complete the event
            await prisma.event.update({
                where: { id: EVENT_ID },
                data: { status: 'COMPLETED' }
            });

            console.log('✅ Event status updated to COMPLETED');

            // Step 5: Process rewards (this would normally be done by backend service)
            if (event.rewardsPool) {
                console.log('\n📍 Step 5: Processing rewards...');

                // Import and call the rewards service
                const { RewardsService } = await import('../services/rewardsService.js');

                try {
                    await RewardsService.processEventRewards(EVENT_ID);
                    console.log('✅ Rewards processed successfully');
                } catch (error: any) {
                    console.log(`⚠️  Reward processing: ${error.message}`);
                }
            }
        }

        // Step 6: Check reward claims
        console.log('\n📍 Step 6: Checking reward claims...');
        const claims = await prisma.rewardClaim.findMany({
            where: {
                pool: { eventId: EVENT_ID }
            },
            include: {
                user: { select: { displayName: true, email: true, totalEarnings: true } }
            },
            orderBy: { finalAmount: 'desc' }
        });

        if (claims.length > 0) {
            console.log(`\n✅ Found ${claims.length} reward claims:\n`);
            claims.forEach((claim, i) => {
                console.log(`   ${i + 1}. ${claim.user.displayName || claim.user.email}`);
                console.log(`      Type: ${claim.claimType}`);
                console.log(`      Amount: $${claim.finalAmount.toFixed(2)}`);
                console.log(`      Status: ${claim.status}`);
                console.log(`      User Total Earnings: $${claim.user.totalEarnings}`);
                console.log('');
            });

            // Step 7: Test claiming
            console.log('📍 Step 7: Testing reward claiming...');
            const pendingClaim = claims.find(c => c.status === 'PENDING');

            if (pendingClaim) {
                console.log(`\n   Claiming reward for ${pendingClaim.user.displayName || pendingClaim.user.email}...`);

                const { RewardsService } = await import('../services/rewardsService.js');

                try {
                    await RewardsService.confirmClaim(
                        EVENT_ID,
                        pendingClaim.userId,
                        pendingClaim.claimType
                    );

                    // Check updated claim
                    const updatedClaim = await prisma.rewardClaim.findUnique({
                        where: { id: pendingClaim.id },
                        include: { user: { select: { totalEarnings: true, totalRewardsClaimed: true } } }
                    });

                    if (updatedClaim) {
                        console.log(`   ✅ Claim status: ${updatedClaim.status}`);
                        console.log(`   ✅ User totalEarnings: $${updatedClaim.user.totalEarnings}`);
                        console.log(`   ✅ User totalRewardsClaimed: ${updatedClaim.user.totalRewardsClaimed}`);
                    }
                } catch (error: any) {
                    console.log(`   ⚠️  Claiming error: ${error.message}`);
                }
            } else {
                console.log('   ℹ️  No pending claims to test');
            }
        } else {
            console.log('⚠️  No reward claims found');
        }

        console.log('\n' + '='.repeat(70));
        console.log('✨ Test Complete!');
        console.log(`\n📝 View event: http://localhost:3000/events/${EVENT_ID}`);
        console.log(`📊 View Prisma Studio: http://localhost:5555`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testCompleteRewardFlow();
