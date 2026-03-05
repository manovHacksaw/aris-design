import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = '2a7e1a7c-7348-4d1c-ad76-b4fe6bd77063';
const USERNAMES = [
    'manov',           // was manovmandal
    'choco_pie',       // was chocopie
    'candyman',        // was shuttercandy
    'snaps_of_manov',
    'tinni',
    'rajsha10'
];

async function main() {
    console.log('=== Creating Votes for Event ===\n');

    // Get event details
    const event = await prisma.event.findUnique({
        where: { id: EVENT_ID },
        include: {
            proposals: true,
            submissions: true,
        }
    });

    if (!event) {
        console.error('Event not found!');
        return;
    }

    console.log(`Event: ${event.title}`);
    console.log(`Type: ${event.eventType}`);
    console.log(`Status: ${event.status}`);
    console.log(`Proposals: ${event.proposals.length}`);
    console.log(`Submissions: ${event.submissions.length}\n`);

    // Get users
    const users = await prisma.user.findMany({
        where: {
            username: { in: USERNAMES }
        }
    });

    console.log(`Found ${users.length} users:\n`);
    users.forEach(u => console.log(`  - ${u.username} (${u.id})`));

    if (users.length !== USERNAMES.length) {
        console.warn(`\nWarning: Only found ${users.length} out of ${USERNAMES.length} users`);
    }

    // Determine what to vote on
    let votableItems: { id: string; type: 'proposal' | 'submission'; title?: string }[] = [];

    if (event.eventType === 'vote_only') {
        votableItems = event.proposals.map(p => ({
            id: p.id,
            type: 'proposal' as const,
            title: p.title || p.content?.substring(0, 50)
        }));
    } else if (event.eventType === 'post_and_vote') {
        votableItems = event.submissions.map(s => ({
            id: s.id,
            type: 'submission' as const,
        }));
    }

    if (votableItems.length === 0) {
        console.error('\nNo items to vote on! Event has no proposals or submissions.');
        return;
    }

    console.log(`\nVotable items: ${votableItems.length}`);

    // Create votes for each user
    let votesCreated = 0;
    let votesSkipped = 0;

    for (const user of users) {
        console.log(`\n--- Creating votes for ${user.username} ---`);

        // Each user votes on a random item (or first item for simplicity)
        const randomItem = votableItems[Math.floor(Math.random() * votableItems.length)];

        try {
            // Check if user already voted
            const existingVote = await prisma.vote.findFirst({
                where: {
                    eventId: EVENT_ID,
                    userId: user.id,
                }
            });

            if (existingVote) {
                console.log(`  ⏭️  Already voted, skipping`);
                votesSkipped++;
                continue;
            }

            // Create vote
            const vote = await prisma.vote.create({
                data: {
                    eventId: EVENT_ID,
                    userId: user.id,
                    proposalId: randomItem.type === 'proposal' ? randomItem.id : null,
                    submissionId: randomItem.type === 'submission' ? randomItem.id : null,
                }
            });

            console.log(`  ✅ Voted on ${randomItem.type}: ${randomItem.id.substring(0, 8)}...`);
            votesCreated++;

            // Update event analytics
            await prisma.eventAnalytics.upsert({
                where: { eventId: EVENT_ID },
                create: {
                    eventId: EVENT_ID,
                    totalVotes: 1,
                    uniqueParticipants: 1,
                },
                update: {
                    totalVotes: { increment: 1 },
                }
            });

        } catch (error: any) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    }

    // Update unique participants count
    const uniqueVoters = await prisma.vote.findMany({
        where: { eventId: EVENT_ID },
        distinct: ['userId'],
        select: { userId: true }
    });

    await prisma.eventAnalytics.update({
        where: { eventId: EVENT_ID },
        data: {
            uniqueParticipants: uniqueVoters.length,
        }
    });

    console.log(`\n=== Summary ===`);
    console.log(`Votes created: ${votesCreated}`);
    console.log(`Votes skipped: ${votesSkipped}`);
    console.log(`Total unique voters: ${uniqueVoters.length}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
