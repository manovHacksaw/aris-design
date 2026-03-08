
import { PrismaClient } from '@prisma/client';
import { RewardsService } from '../src/services/rewardsService';
import { EventService } from '../src/services/eventService';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const eventId = process.argv[2] || 'c9428ccf-9d90-41a0-a73d-3a7203d0ec86';
    console.log(`🚀 Running Full Simulation for Event: ${eventId}`);

    // 1. Setup Phase: Ensure we have creators and voters with Smart Accounts
    const validUsers = await prisma.user.findMany({
        where: { walletAddress: { not: null }, role: 'USER' },
        take: 50
    });

    if (validUsers.length < 5) {
        console.error(`❌ Need at least 5 Smart Account users. Found ${validUsers.length}`);
        return;
    }

    const creators = validUsers.slice(0, 3);
    const voters = validUsers.slice(3);

    // 2. Posting Phase (Submissions)
    console.log('\n📸 Phase: Posting...');
    for (const user of creators) {
        await prisma.submission.upsert({
            where: { eventId_userId: { eventId, userId: user.id } },
            create: {
                id: randomUUID(),
                eventId,
                userId: user.id,
                imageCid: 'QmTestSub',
                caption: `Test Submission by ${user.username}`,
                status: 'active'
            },
            update: { status: 'active' }
        });
    }

    // 3. Voting Phase (Transition to Voting)
    console.log('\n🗳️  Phase: Voting...');
    const now = new Date();
    await prisma.event.update({
        where: { id: eventId },
        data: {
            status: 'ACTIVE',
            startTime: new Date(now.getTime() - 1000),
            endTime: new Date(now.getTime() + 3600000)
        }
    });

    const submissions = await prisma.submission.findMany({ where: { eventId, status: 'active' } });
    for (const [idx, voter] of voters.entries()) {
        const subId = submissions[idx % submissions.length].id;
        await prisma.vote.upsert({
            where: { userId_eventId: { userId: voter.id, eventId } },
            create: { id: randomUUID(), userId: voter.id, eventId, submissionId: subId },
            update: {}
        });
    }

    // 4. Finalization Phase (Ranking & Rewards)
    console.log('\n🏁 Phase: Finalization...');
    await prisma.event.update({
        where: { id: eventId },
        data: { endTime: new Date(now.getTime() - 1000) }
    });

    // Compute rankings first (Required for Leaderboard)
    await EventService.computeRankings(eventId);

    // Process rewards
    const result = await RewardsService.processEventRewards(eventId);
    console.log('Reward Result:', result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
