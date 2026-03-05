
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_EVENT_ID = 'edef5a4d-716f-45b5-9e53-1f1eae6058d7';

async function checkVotes() {
    console.log("Checking votes for event:", TARGET_EVENT_ID);
    const votes = await prisma.vote.count({
        where: { eventId: TARGET_EVENT_ID }
    });
    console.log(`Total votes for event ${TARGET_EVENT_ID}: ${votes}`);

    const event = await prisma.event.findUnique({ where: { id: TARGET_EVENT_ID } });
    console.log(`Event Status: ${event?.status}`);
}

checkVotes();
