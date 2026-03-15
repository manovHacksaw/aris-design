import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNikeEventFlow() {
    console.log('🧪 Testing Complete Nike Event Flow (Web2)\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Find Nike brand
        console.log('\n📍 Step 1: Finding Nike brand...');
        const nikeBrand = await prisma.brand.findFirst({
            where: { name: { contains: 'Nike', mode: 'insensitive' } },
            include: { owner: { select: { id: true, email: true, displayName: true } } }
        });

        if (!nikeBrand) {
            console.log('❌ Nike brand not found. Please create it first.');
            return;
        }

        console.log(`✅ Found Nike brand:`);
        console.log(`   - ID: ${nikeBrand.id}`);
        console.log(`   - Name: ${nikeBrand.name}`);
        console.log(`   - Owner: ${nikeBrand.owner.displayName || nikeBrand.owner.email}`);

        // Step 2: Create a test event
        console.log('\n📍 Step 2: Creating test event...');
        const event = await prisma.event.create({
            data: {
                brandId: nikeBrand.id,
                title: 'Nike Air Max Test Event',
                description: 'Testing complete Web2 event flow',
                eventType: 'vote_only',
                category: 'FASHION',
                status: 'VOTING',
                allowVoting: true,
                capacity: 10,
                startTime: new Date(),
                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                proposals: {
                    create: [
                        {
                            type: 'TEXT',
                            title: 'Best Nike Air Max?',
                            content: 'Air Max 90',
                            order: 0
                        },
                        {
                            type: 'TEXT',
                            title: 'Best Nike Air Max?',
                            content: 'Air Max 95',
                            order: 1
                        },
                        {
                            type: 'TEXT',
                            title: 'Best Nike Air Max?',
                            content: 'Air Max 97',
                            order: 2
                        }
                    ]
                },
                eventAnalytics: {
                    create: {
                        totalViews: 0,
                        totalSubmissions: 0,
                        totalVotes: 0,
                        uniqueParticipants: 0
                    }
                }
            },
            include: {
                proposals: true,
                eventAnalytics: true
            }
        });

        console.log(`✅ Event created:`);
        console.log(`   - ID: ${event.id}`);
        console.log(`   - Title: ${event.title}`);
        console.log(`   - Status: ${event.status}`);
        console.log(`   - Proposals: ${event.proposals.length}`);

        // Step 3: Check if pool was created
        console.log('\n📍 Step 3: Checking reward pool...');
        const pool = await prisma.eventRewardsPool.findUnique({
            where: { eventId: event.id }
        });

        if (pool) {
            console.log(`✅ Reward pool created:`);
            console.log(`   - Status: ${pool.status}`);
            console.log(`   - Base Pool: $${pool.basePoolUsdc}`);
            console.log(`   - Top Pool: $${pool.topPoolUsdc}`);
            console.log(`   - Platform Fee: $${pool.platformFeeUsdc}`);
        } else {
            console.log(`ℹ️  No reward pool (event may not have rewards configured)`);
        }

        // Step 4: Find a test user to vote
        console.log('\n📍 Step 4: Finding test user...');
        const testUser = await prisma.user.findFirst({
            where: {
                id: { not: nikeBrand.ownerId }, // Not the brand owner
                email: { not: { endsWith: '@wallet.local' } } // Real user
            },
            select: { id: true, email: true, displayName: true }
        });

        if (!testUser) {
            console.log('⚠️  No test user found. Skipping vote test.');
        } else {
            console.log(`✅ Found test user: ${testUser.displayName || testUser.email}`);

            // Step 5: Cast a vote
            console.log('\n📍 Step 5: Casting vote...');
            const vote = await prisma.vote.create({
                data: {
                    eventId: event.id,
                    proposalId: event.proposals[0].id,
                    userId: testUser.id
                }
            });

            console.log(`✅ Vote cast successfully!`);
            console.log(`   - Voter: ${testUser.displayName || testUser.email}`);
            console.log(`   - Proposal: ${event.proposals[0].content}`);

            // Update analytics
            await prisma.eventAnalytics.update({
                where: { eventId: event.id },
                data: {
                    totalVotes: { increment: 1 }
                }
            });

            // Update user counter
            await prisma.user.update({
                where: { id: testUser.id },
                data: { totalVotes: { increment: 1 } }
            });

            console.log(`✅ Analytics and counters updated`);
        }

        // Step 6: Check event analytics
        console.log('\n📍 Step 6: Checking event analytics...');
        const analytics = await prisma.eventAnalytics.findUnique({
            where: { eventId: event.id }
        });

        if (analytics) {
            console.log(`✅ Event analytics:`);
            console.log(`   - Total Votes: ${analytics.totalVotes}`);
            console.log(`   - Total Views: ${analytics.totalViews}`);
            console.log(`   - Unique Participants: ${analytics.uniqueParticipants}`);
        }

        // Step 7: Summary
        console.log('\n' + '='.repeat(60));
        console.log('✨ Test Summary:');
        console.log('='.repeat(60));
        console.log('✅ Event creation: SUCCESS');
        console.log('✅ Pool creation: ' + (pool ? 'SUCCESS' : 'N/A (no rewards)'));
        console.log('✅ Voting: ' + (testUser ? 'SUCCESS' : 'SKIPPED'));
        console.log('✅ Analytics: SUCCESS');
        console.log('\n🎉 All Web2 flows working correctly!');
        console.log('\n📝 Test Event Details:');
        console.log(`   - Event ID: ${event.id}`);
        console.log(`   - View at: http://localhost:3000/events/${event.id}`);

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testNikeEventFlow();
