import { PrismaClient } from '@prisma/client';
import { EventService } from '../services/eventService.js';

const prisma = new PrismaClient();

const EVENT_ID = '2a7e1a7c-7348-4d1c-ad76-b4fe6bd77063';

async function main() {
    console.log('=== Closing Event ===\n');

    // Get event details
    const event = await prisma.event.findUnique({
        where: { id: EVENT_ID },
        include: {
            _count: {
                select: {
                    votes: true,
                }
            }
        }
    });

    if (!event) {
        console.error('Event not found!');
        return;
    }

    console.log(`Event: ${event.title}`);
    console.log(`Current Status: ${event.status}`);
    console.log(`Capacity: ${event.capacity}`);
    console.log(`Total Votes: ${event._count.votes}`);
    console.log(`Capacity Reached: ${event._count.votes >= event.capacity}\n`);

    if (event.status === 'completed') {
        console.log('✅ Event is already completed!');
        return;
    }

    // Use EventService to properly transition to completed
    // This will compute rankings, update status, and trigger reward processing
    console.log('Transitioning event to COMPLETED status...');

    try {
        const completedEvent = await EventService.transitionToCompleted(EVENT_ID);

        console.log('\n✅ Event successfully closed!');
        console.log(`New Status: ${completedEvent.status}`);
        console.log('\nThe following actions were triggered:');
        console.log('  - Rankings computed for proposals');
        console.log('  - Event status updated to COMPLETED');
        console.log('  - Milestone processing initiated (async)');
        console.log('  - Brand XP recalculation initiated (async)');
        console.log('  - Reward claims creation initiated (async)');

    } catch (error: any) {
        console.error('\n❌ Error closing event:', error.message);
        console.error('Full error:', error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
