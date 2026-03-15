import { PrismaClient } from '@prisma/client';
import { EventService } from '../services/eventService.js';

const prisma = new PrismaClient();

async function completeLatestEvent() {
  try {
    // Use specific event ID if provided, otherwise find latest
    const specificEventId = process.argv[2];

    // Find the event
    const latestEvent = specificEventId
      ? await prisma.event.findFirst({
          where: { id: specificEventId },
          include: { brand: true },
        })
      : await prisma.event.findFirst({
          where: {
            isDeleted: false,
            status: {
              notIn: ['COMPLETED', 'CANCELLED'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            brand: true,
          },
        });

    if (!latestEvent) {
      console.log('No active events found to complete.');
      return;
    }

    console.log('Found latest event:');
    console.log(`  ID: ${latestEvent.id}`);
    console.log(`  Title: ${latestEvent.title}`);
    console.log(`  Status: ${latestEvent.status}`);
    console.log(`  Type: ${latestEvent.eventType}`);
    console.log(`  Brand: ${latestEvent.brand?.name}`);
    console.log(`  Created: ${latestEvent.createdAt}`);
    console.log('');

    console.log('Transitioning to COMPLETED...');

    const completedEvent = await EventService.transitionToCompleted(latestEvent.id);

    console.log('');
    console.log('Event completed successfully!');
    console.log(`  New Status: ${completedEvent.status}`);
    console.log('');
    console.log('Rewards are now being processed in the background.');
    console.log('Waiting 3 seconds for processing...');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if claims were created
    const claims = await prisma.rewardClaim.findMany({
      where: { pool: { eventId: latestEvent.id } },
      include: {
        user: { select: { username: true, walletAddress: true } },
        pool: { select: { onChainEventId: true } }
      }
    });

    console.log('');
    console.log('========================================');
    console.log('REWARD CLAIMS CREATED:', claims.length);
    console.log('========================================');

    if (claims.length > 0) {
      claims.forEach(c => {
        console.log({
          user: c.user?.username || c.user?.walletAddress?.slice(0, 10),
          claimType: c.claimType,
          amount: c.finalAmount + ' USDC',
          status: c.status
        });
      });
    } else {
      console.log('No claims created. Check if the event has a rewards pool.');
    }

  } catch (error) {
    console.error('Error completing event:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeLatestEvent();
