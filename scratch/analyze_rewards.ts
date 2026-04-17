
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Analyzing Completed Events and Rewards ---');

  const completedEvents = await prisma.event.findMany({
    where: { status: 'completed' },
    include: {
      rewardsPool: {
        include: {
          claims: true
        }
      },
      votes: {
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              eoaAddress: true,
              role: true
            }
          }
        }
      }
    },
    take: 5,
    orderBy: { updatedAt: 'desc' }
  });

  if (completedEvents.length === 0) {
    console.log('No completed events found.');
    return;
  }

  for (const event of completedEvents) {
    console.log(`\nEvent: ${event.title} (${event.id})`);
    console.log(`Status: ${event.status}`);
    
    if (!event.rewardsPool) {
      console.log('❌ No RewardsPool found for this event.');
      continue;
    }

    console.log(`Pool Status: ${event.rewardsPool.status}`);
    console.log(`Claims in DB: ${event.rewardsPool.claims.length}`);
    
    const uniqueVoters = new Set(event.votes.map(v => v.userId));
    console.log(`Unique Voters: ${uniqueVoters.size}`);

    // Analyze voters
    const voterMap = new Map();
    event.votes.forEach(v => {
      if (!voterMap.has(v.userId)) {
        voterMap.set(v.userId, v.user);
      }
    });

    let rejectedByWallet = 0;
    let rejectedByRole = 0;
    
    for (const [userId, user] of voterMap) {
      if (user.role !== 'USER') {
        rejectedByRole++;
        continue;
      }
      
      const hasValidFormat = user.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(user.walletAddress);
      const isSmartAccount = hasValidFormat && user.walletAddress !== user.eoaAddress;
      
      if (!isSmartAccount) {
        rejectedByWallet++;
        // console.log(`  Rejected User ${userId}: wallet=${user.walletAddress}, eoa=${user.eoaAddress}`);
      }
    }

    console.log(`Voters rejected by Role (not USER): ${rejectedByRole}`);
    console.log(`Voters rejected by Wallet (EOA/Invalid): ${rejectedByWallet}`);
    
    if (event.rewardsPool.claims.length === 0 && uniqueVoters.size > 0 && rejectedByWallet > 0) {
      console.log('⚠️ POTENTIAL ISSUE: All voters were rejected due to wallet status, so no claims were created.');
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
