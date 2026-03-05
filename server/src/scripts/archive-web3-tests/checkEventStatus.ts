import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_ID = '2a7e1a7c-7348-4d1c-ad76-b4fe6bd77063';

async function main() {
    console.log('=== Checking Event Status ===\n');

    const event = await prisma.event.findUnique({
        where: { id: EVENT_ID },
        include: {
            eventAnalytics: true,
            proposals: true,
            _count: {
                select: {
                    votes: true,
                    submissions: true,
                }
            }
        }
    });

    if (!event) {
        console.error('Event not found!');
        return;
    }

    console.log(`Event: ${event.title}`);
    console.log(`ID: ${event.id}`);
    console.log(`Type: ${event.eventType}`);
    console.log(`Status: ${event.status}`);
    console.log(`Capacity: ${event.capacity}`);
    console.log(`\nTimestamps:`);
    console.log(`  Created: ${event.createdAt}`);
    console.log(`  Starts: ${event.startDate}`);
    console.log(`  Ends: ${event.endDate}`);
    console.log(`  Current Time: ${new Date().toISOString()}`);

    const now = new Date();
    const isBeforeStart = now < new Date(event.startDate);
    const isAfterEnd = now > new Date(event.endDate);

    console.log(`\nTime Status:`);
    console.log(`  Before Start: ${isBeforeStart}`);
    console.log(`  After End: ${isAfterEnd}`);
    console.log(`  Within Time Window: ${!isBeforeStart && !isAfterEnd}`);

    console.log(`\nVoting Stats:`);
    console.log(`  Total Votes: ${event._count.votes}`);
    console.log(`  Unique Participants: ${event.eventAnalytics?.uniqueParticipants || 0}`);
    console.log(`  Capacity Reached: ${event._count.votes >= event.capacity}`);

    console.log(`\nProposals: ${event.proposals.length}`);
    event.proposals.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title || p.content?.substring(0, 50)}`);
    });

    console.log(`\n=== Event Closure Status ===`);
    const shouldBeClosed = event._count.votes >= event.capacity || isAfterEnd;
    console.log(`Should be closed: ${shouldBeClosed}`);
    console.log(`  - Capacity reached (${event._count.votes}/${event.capacity}): ${event._count.votes >= event.capacity}`);
    console.log(`  - Time expired: ${isAfterEnd}`);
    console.log(`Actual status: ${event.status}`);

    if (shouldBeClosed && event.status === 'voting') {
        console.log(`\n⚠️  WARNING: Event should be closed but is still in 'voting' status!`);
        console.log(`Run the event transition cron job or manually update the status.`);
    } else if (!shouldBeClosed && event.status !== 'voting') {
        console.log(`\n⚠️  WARNING: Event should be open but is in '${event.status}' status!`);
    } else {
        console.log(`\n✅ Event status is correct.`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
