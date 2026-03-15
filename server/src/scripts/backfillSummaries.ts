import { PrismaClient } from '@prisma/client';
import { AiService } from '../services/aiService.js';

const prisma = new PrismaClient();

async function backfill() {
  const events = await prisma.event.findMany({
    where: {
      status: 'completed',
      isDeleted: false,
      eventAnalytics: { aiSummary: null },
    },
    select: { id: true, title: true },
  });

  console.log(`Found ${events.length} completed events without AI summary`);

  for (const event of events) {
    console.log(`Generating for: "${event.title}" (${event.id})`);
    const summary = await AiService.generateEventSummary(event.id);
    console.log(summary ? `  -> OK` : `  -> Failed`);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('Backfill complete');
  await prisma.$disconnect();
}

backfill().catch(e => {
  console.error(e);
  process.exit(1);
});
