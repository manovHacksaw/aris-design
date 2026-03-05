
import { PrismaClient } from '@prisma/client';
import { RewardsService } from '../src/services/rewardsService';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const eventId = process.argv[2] || '84df2a63-4800-483f-b005-01ecfe37d8b7';
    console.log(`🚀 Running Vote-Only Simulation for: ${eventId}`);

    const voters = await prisma.user.findMany({
        where: { walletAddress: { not: null }, role: 'USER' },
        take: 30
    });

    const proposals = await prisma.proposal.findMany({ where: { eventId } });
    if (proposals.length < 2) {
        console.error('❌ Need at least 2 proposals');
        return;
    }

    console.log('\n🗳️  Voting...');
    for (const voter of voters) {
        await prisma.vote.upsert({
            where: { userId_eventId: { userId: voter.id, eventId } },
            create: {
                id: randomUUID(),
                userId: voter.id,
                eventId,
                proposalId: proposals[0].id
            },
            update: {}
        });
    }

    console.log('\n🏁 Ending & Processing...');
    await prisma.event.update({
        where: { id: eventId },
        data: { endTime: new Date(now().getTime() - 1000) }
    });

    const result = await RewardsService.processEventRewards(eventId);
    console.log('Result:', result);
}

function now() { return new Date(); }

main().catch(console.error).finally(() => prisma.$disconnect());
