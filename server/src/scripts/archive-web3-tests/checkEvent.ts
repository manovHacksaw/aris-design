
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const eventId = '40d1fe02-519f-4863-8d98-3d0e80b350a1';
    console.log(`Checking event: ${eventId}`);

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            eventAnalytics: true,
            brand: true,
            _count: {
                select: { votes: true }
            }
        }
    });

    if (!event) {
        console.log('Event not found');
        return;
    }

    console.log('Event Details:');
    console.log(`Title: ${event.title}`);
    console.log(`Status: ${event.status}`);
    console.log(`Capacity: ${event.capacity}`);
    console.log(`Total Votes (Analytics): ${event.eventAnalytics?.totalVotes}`);
    console.log(`Unique Participants (Analytics): ${event.eventAnalytics?.uniqueParticipants}`);
    console.log(`Actual Vote Count (DB): ${event._count.votes}`);
    console.log(`Start Time: ${event.startTime}`);
    console.log(`End Time: ${event.endTime}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
