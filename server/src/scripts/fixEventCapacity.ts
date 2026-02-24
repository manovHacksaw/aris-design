
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const eventId = '40d1fe02-519f-4863-8d98-3d0e80b350a1';
    console.log(`Fixing event: ${eventId}`);

    // 1. Update Capacity to 100
    // 2. Ensure status is 'voting' if it was 'completed' (though it was 'voting' in DB)
    // 3. Reset uniqueParticipants in analytics if it's strangely high (8 participants vs 2 votes?)
    //    Actually, uniqueParticipants might track visits too? No, usually it tracks voters.
    //    Let's check code: In voteService, we increment totalVotes.
    //    uniqueParticipants - where is it updated?
    //    It seems likely it's updated elsewhere or I should trust it.
    //    But if 8 people tried to vote and failed, maybe?
    //    Regardless, setting capacity to 100 should solve it for now.

    const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
            capacity: 3,
            status: 'voting', // Ensure it's open
        },
        include: {
            eventAnalytics: true
        }
    });

    console.log('Event Updated:');
    console.log(`New Capacity: ${updatedEvent.capacity}`);
    console.log(`Status: ${updatedEvent.status}`);
    console.log(`Participants: ${updatedEvent.eventAnalytics?.uniqueParticipants}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
