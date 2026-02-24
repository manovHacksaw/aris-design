import { PrismaClient } from '@prisma/client';
import { RewardsService } from '../services/rewardsService.js';
import { VoteService } from '../services/voteService.js';

const prisma = new PrismaClient();

/**
 * Complete test flow for Smart Account rewards:
 * 1. Find an active event with on-chain pool
 * 2. Simulate votes from users with Smart Account addresses
 * 3. Complete the event
 * 4. Process rewards (credits to Smart Accounts)
 * 5. Display claimable rewards
 */
async function testSmartAccountRewards() {
    console.log('🧪 Testing Smart Account Rewards Flow\n');
    console.log('========================================\n');

    try {
        // Step 1: Find an active event with a pool
        console.log('📋 Step 1: Finding active event with on-chain pool...');
        const event = await prisma.event.findFirst({
            where: {
                status: { in: ['VOTING', 'voting'] },
                rewardsPool: {
                    status: 'ACTIVE'
                }
            },
            include: {
                rewardsPool: true,
                proposals: true,
                brand: true,
                _count: {
                    select: { votes: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!event) {
            console.log('❌ No active event found with on-chain pool.');
            console.log('\n💡 Run this first to create a test event:');
            console.log('   cd server && npx tsx src/scripts/createEventWithPool.ts\n');
            return;
        }

        console.log(`✅ Found event: "${event.title}"`);
        console.log(`   Event ID: ${event.id}`);
        console.log(`   Current votes: ${event._count.votes}`);
        console.log(`   Capacity: ${event.capacity}`);
        console.log(`   Pool status: ${event.rewardsPool?.status}`);
        console.log('');

        // Step 2: Get users with Smart Account addresses
        console.log('👥 Step 2: Finding users with Smart Account addresses...');
        const users = await prisma.user.findMany({
            where: {
                walletAddress: { not: null },
                // Exclude brand owner if exists
                ...(event.brand.ownerId ? { id: { not: event.brand.ownerId } } : {})
            },
            take: Math.min(event.capacity, 10), // Limit to capacity or 10 users
        });

        console.log(`✅ Found ${users.length} users with Smart Account addresses`);
        users.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.username || u.email} - ${u.walletAddress?.slice(0, 10)}...`);
        });
        console.log('');

        // Step 3: Simulate votes
        console.log('🗳️  Step 3: Simulating votes...');
        let votesCreated = 0;

        for (const user of users) {
            try {
                // Check if already voted
                const existingVote = await prisma.vote.findFirst({
                    where: { eventId: event.id, userId: user.id }
                });

                if (existingVote) {
                    console.log(`   ⏭️  ${user.username || user.email} already voted`);
                    continue;
                }

                // Vote for random proposals
                if (event.proposals.length > 0) {
                    const numVotes = Math.min(
                        Math.floor(Math.random() * 3) + 1,
                        event.proposals.length
                    );
                    const shuffled = [...event.proposals].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, numVotes);
                    const proposalIds = selected.map(p => p.id);

                    await VoteService.voteForProposals(event.id, user.id, { proposalIds });
                    votesCreated++;
                    console.log(`   ✅ ${user.username || user.email} voted for ${numVotes} proposal(s)`);
                }
            } catch (error: any) {
                console.log(`   ⚠️  ${user.username || user.email}: ${error.message}`);
            }
        }

        console.log(`\n✅ Created ${votesCreated} new votes\n`);

        // Step 4: Complete the event
        console.log('🏁 Step 4: Completing event...');
        await prisma.event.update({
            where: { id: event.id },
            data: { status: 'COMPLETED' }
        });
        console.log('✅ Event marked as COMPLETED\n');

        // Step 5: Process rewards
        console.log('💰 Step 5: Processing rewards (crediting to Smart Accounts)...');
        const result = await RewardsService.processEventRewards(event.id);

        console.log('✅ Rewards processed!');
        console.log(`   Claims created: ${result.claimsCreated}`);
        console.log(`   Total rewards: $${result.totalRewards.toFixed(2)}`);
        if (result.errors.length > 0) {
            console.log(`   ⚠️  Errors: ${result.errors.length}`);
            result.errors.forEach(err => console.log(`      - ${err}`));
        }
        console.log('');

        // Step 6: Display claimable rewards
        console.log('🎁 Step 6: Checking claimable rewards...\n');
        const claims = await prisma.rewardClaim.findMany({
            where: { pool: { eventId: event.id } },
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                        walletAddress: true
                    }
                }
            },
            orderBy: { finalAmount: 'desc' }
        });

        console.log('========================================');
        console.log(`CLAIMABLE REWARDS (${claims.length} users)`);
        console.log('========================================\n');

        claims.forEach((claim, i) => {
            const userLabel = claim.user?.username || claim.user?.email || 'Unknown';
            const smartAccount = claim.user?.walletAddress || 'No address';
            console.log(`${i + 1}. ${userLabel}`);
            console.log(`   Smart Account: ${smartAccount}`);
            console.log(`   Claim Type: ${claim.claimType}`);
            console.log(`   Amount: $${claim.finalAmount.toFixed(4)} USDC`);
            console.log(`   Status: ${claim.status}`);
            console.log('');
        });

        // Summary
        console.log('========================================');
        console.log('✅ TEST COMPLETE!');
        console.log('========================================\n');
        console.log('📊 Summary:');
        console.log(`   Event: ${event.title}`);
        console.log(`   Votes: ${votesCreated} new votes`);
        console.log(`   Claims: ${claims.length} users can claim`);
        console.log(`   Total: $${result.totalRewards.toFixed(2)} USDC\n`);
        console.log('🎯 Next Steps:');
        console.log('   1. Login to the frontend with one of the users above');
        console.log('   2. Navigate to /reward page');
        console.log('   3. Check console logs for Smart Account address');
        console.log('   4. Click "Claim All" to test the claiming flow');
        console.log('   5. Verify USDC is sent to Smart Account (not EOA)\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSmartAccountRewards();
