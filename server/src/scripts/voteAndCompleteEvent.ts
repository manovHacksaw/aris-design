import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = 'bc7ff604-aa7b-4405-b45b-ae641c5c191a';

async function voteAndCompleteEvent() {
    console.log('🗳️  Casting votes to complete Nike event...\n');
    console.log('='.repeat(60));

    try {
        // Get the event
        const event = await prisma.event.findUnique({
            where: { id: EVENT_ID },
            include: { proposals: true }
        });

        if (!event) {
            console.log('❌ Event not found');
            return;
        }

        console.log(`📍 Event: ${event.title}`);
        console.log(`   Capacity: ${event.capacity}`);
        console.log(`   Current Status: ${event.status}`);

        // Get current vote count
        const currentVotes = await prisma.vote.count({
            where: { eventId: EVENT_ID }
        });
        console.log(`   Current Votes: ${currentVotes}\n`);

        // Get 9 users to vote (we already have 1 vote from Argha Saha)
        const users = await prisma.user.findMany({
            where: {
                email: {
                    in: [
                        'manobendra.mandal@gmail.com',
                        'wadenade992@gmail.com',
                        'payments.mizu@gmail.com',
                        'raj.sharma861741@gmail.com',
                        'arghasaha369@gmail.com',
                        'kaustavroy49@gmail.com',
                        'hngryblcky@gmail.com',
                        'anuskaswork@gmail.com',
                        'jubhuvanesh@gmail.com'
                    ]
                }
            },
            select: { id: true, email: true, displayName: true }
        });

        console.log(`📍 Found ${users.length} users to vote\n`);

        // Cast votes
        let votesNeeded = event.capacity - currentVotes;
        let votescast = 0;

        for (let i = 0; i < Math.min(users.length, votesNeeded); i++) {
            const user = users[i];

            // Check if user already voted
            const existingVote = await prisma.vote.findFirst({
                where: {
                    eventId: EVENT_ID,
                    userId: user.id
                }
            });

            if (existingVote) {
                console.log(`⏭️  ${user.displayName || user.email} already voted, skipping...`);
                continue;
            }

            // Random proposal
            const randomProposal = event.proposals[Math.floor(Math.random() * event.proposals.length)];

            // Cast vote
            await prisma.vote.create({
                data: {
                    eventId: EVENT_ID,
                    proposalId: randomProposal.id,
                    userId: user.id
                }
            });

            // Update user counter
            await prisma.user.update({
                where: { id: user.id },
                data: { totalVotes: { increment: 1 } }
            });

            votescast++;
            console.log(`✅ Vote ${currentVotes + votescast}/${event.capacity}: ${user.displayName || user.email} → ${randomProposal.content}`);
        }

        // Update event analytics
        await prisma.eventAnalytics.update({
            where: { eventId: EVENT_ID },
            data: {
                totalVotes: { increment: votescast }
            }
        });

        console.log(`\n✅ Cast ${votescast} new votes`);

        // Check if event should be completed
        const finalVoteCount = await prisma.vote.count({
            where: { eventId: EVENT_ID }
        });

        console.log(`\n📊 Final Vote Count: ${finalVoteCount}/${event.capacity}`);

        if (finalVoteCount >= event.capacity) {
            console.log('\n🎯 Capacity reached! Event should auto-complete...');

            // Check if there's a cron job or we need to manually trigger completion
            console.log('\n⏳ Waiting for auto-transition (or manual trigger needed)...');
            console.log('   Note: Event completion may be handled by cron job or API call');

            // Let's manually trigger completion for testing
            console.log('\n🔧 Manually triggering event completion...');

            await prisma.event.update({
                where: { id: EVENT_ID },
                data: { status: 'COMPLETED' }
            });

            console.log('✅ Event status updated to COMPLETED');

            // Check for reward pool
            const pool = await prisma.eventRewardsPool.findUnique({
                where: { eventId: EVENT_ID }
            });

            if (pool) {
                console.log('\n💰 Reward Pool Found:');
                console.log(`   Status: ${pool.status}`);
                console.log(`   Base Pool: $${pool.basePoolUsdc}`);
                console.log(`   Top Pool: $${pool.topPoolUsdc}`);

                // Process rewards (this would normally be done by the backend service)
                console.log('\n🎁 Rewards would be processed by backend service...');
            } else {
                console.log('\nℹ️  No reward pool configured for this event');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Voting complete!');
        console.log(`\n📝 View event at: http://localhost:3000/events/${EVENT_ID}`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

voteAndCompleteEvent();
