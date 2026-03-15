import { PrismaClient } from '@prisma/client';
import { RewardsService } from '../services/rewardsService.js';

const prisma = new PrismaClient();

async function processRewards() {
  const eventId = process.argv[2];

  if (!eventId) {
    console.log('Usage: npx tsx src/scripts/processRewards.ts <eventId>');
    return;
  }

  console.log('Processing rewards for event:', eventId);

  try {
    const result = await RewardsService.processEventRewards(eventId);

    console.log('\nProcessing Result:');
    console.log('  Success:', result.success);
    console.log('  Claims Created:', result.claimsCreated);
    console.log('  Total Rewards:', '$' + result.totalRewards.toFixed(2));
    if (result.errors.length > 0) {
      console.log('  Errors:', result.errors);
    }

    // Check claims
    const claims = await prisma.rewardClaim.findMany({
      where: { pool: { eventId } },
      include: { user: { select: { username: true, walletAddress: true } } }
    });

    console.log('\n========================================');
    console.log('CLAIMS IN DATABASE:', claims.length);
    console.log('========================================');

    claims.forEach(c => {
      console.log({
        user: c.user?.username || c.user?.walletAddress?.slice(0, 10),
        type: c.claimType,
        amount: '$' + c.finalAmount.toFixed(2),
        status: c.status
      });
    });
  } catch (error) {
    console.error('Error processing rewards:', error);
  }

  await prisma.$disconnect();
}

processRewards();
