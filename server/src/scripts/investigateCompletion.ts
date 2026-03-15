import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Investigating test2 Event Completion ===\n');

    const event = await prisma.event.findFirst({
        where: {
            title: {
                contains: 'test2',
                mode: 'insensitive'
            }
        },
        select: {
            id: true,
            title: true,
            status: true,
            capacity: true,
            createdAt: true,
            updatedAt: true,
            endTime: true,
            _count: {
                select: {
                    votes: true
                }
            }
        }
    });

    if (!event) {
        console.error('Event not found');
        return;
    }

    console.log(`Event: ${event.title}`);
    console.log(`Status: ${event.status}`);
    console.log(`Capacity: ${event.capacity}`);
    console.log(`Total Votes: ${event._count.votes}`);
    console.log(`Created: ${event.createdAt}`);
    console.log(`Updated: ${event.updatedAt}`);
    console.log(`End Time: ${event.endTime || 'Not set'}`);

    const timeDiff = new Date(event.updatedAt).getTime() - new Date(event.createdAt).getTime();
    const minutesDiff = Math.floor(timeDiff / 1000 / 60);

    console.log(`\nTime from creation to completion: ${minutesDiff} minutes`);

    // Check if capacity was reached
    const capacityReached = event._count.votes >= event.capacity!;
    console.log(`\nCapacity reached: ${capacityReached} (${event._count.votes}/${event.capacity})`);

    // Check if time expired
    const now = new Date();
    const timeExpired = event.endTime ? now >= new Date(event.endTime) : false;
    console.log(`Time expired: ${timeExpired}`);

    console.log('\n=== Possible Completion Scenarios ===');

    if (capacityReached && !timeExpired) {
        console.log('✅ Event likely completed due to CAPACITY REACHED');
        console.log('   This should have triggered via VoteService when the last vote was cast');
        console.log('   Check: server/src/services/voteService.ts lines 353-368');
    } else if (timeExpired) {
        console.log('✅ Event likely completed due to TIME EXPIRED');
        console.log('   This should have triggered via autoTransitionEvent');
        console.log('   Check: server/src/services/eventService.ts lines 1401-1424');
    } else {
        console.log('⚠️  Event completed manually or through unknown mechanism');
    }

    console.log('\n=== Debugging Steps ===');
    console.log('1. Check server logs around the completion time for errors');
    console.log('2. Look for "Failed to process event rewards" error message');
    console.log('3. Verify RewardsService.processEventRewards was called');
    console.log('4. Check if there were any database transaction failures');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
