
import { PrismaClient } from '@prisma/client';
import { EventService } from '../src/services/eventService';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting auto-transition for all events...');

    const events = await prisma.event.findMany({
        where: {
            isDeleted: false,
            status: {
                notIn: ['completed', 'cancelled']
            }
        },
        select: {
            id: true,
            title: true,
            status: true
        }
    });

    console.log(`Found ${events.length} events to check.`);

    let updatedCount = 0;
    for (const event of events) {
        try {
            const result = await EventService.autoTransitionEvent(event.id);
            if (result) {
                console.log(`✅ Transitioned [${event.status} -> ${result.status}] ${event.title}`);
                updatedCount++;
            }
        } catch (error) {
            console.error(`❌ Failed to transition ${event.title}:`, error);
        }
    }

    console.log(`\nDone. Updated ${updatedCount} events.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
