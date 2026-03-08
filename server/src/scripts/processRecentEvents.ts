
import { prisma } from '../lib/prisma.js';
import { RewardsService } from '../services/rewardsService.js';
import { EventStatus } from '@prisma/client';

async function processRecentEvents() {
    console.log('Fetching last 5 completed/voting events...');

    try {
        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { status: 'COMPLETED' },
                    { status: 'VOTING' }
                ],
                isDeleted: false
            },
            orderBy: { endTime: 'desc' },
            take: 5
        });

        console.log(`Found ${events.length} events.`);

        for (const event of events) {
            console.log(`Processing Event: ${event.title} (${event.id}) - Status: ${event.status}`);
            try {
                const result = await RewardsService.processEventRewards(event.id);
                console.log(` > Result: Success=${result.success}, Claims=${result.claimsCreated}`);
            } catch (e: any) {
                console.error(` > FAILED: ${e.message}`);
            }
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

processRecentEvents();
