import { PrismaClient, ClaimStatus, ClaimType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const eventId = 'edef5a4d-716f-45b5-9e53-1f1eae6058d7';

  // Find the pool
  const pool = await prisma.eventRewardsPool.findUnique({
    where: { eventId }
  });

  if (!pool) {
    console.log('Pool not found');
    return;
  }

  console.log('Pool found:', pool.id);

  // Find choco_pie user
  const user = await prisma.user.findFirst({
    where: { username: 'choco_pie' }
  });

  if (!user) {
    console.log('choco_pie user not found');
    return;
  }

  console.log('User found:', user.id, user.username);

  // Get choco_pie's claims
  const claims = await prisma.rewardClaim.findMany({
    where: {
      poolId: pool.id,
      userId: user.id
    }
  });

  console.log('\n=== choco_pie Claims ===');
  for (const claim of claims) {
    console.log(`${claim.claimType}: Status=${claim.status} | Amount=${claim.finalAmount} USDC`);
  }

  // Reset BASE_VOTER from SIGNED to PENDING so it can get a fresh signature
  const baseVoterClaim = claims.find(c => c.claimType === ClaimType.BASE_VOTER);
  if (baseVoterClaim && baseVoterClaim.status === ClaimStatus.SIGNED) {
    console.log('\n→ Resetting BASE_VOTER from SIGNED to PENDING for fresh signature...');
    await prisma.rewardClaim.update({
      where: { id: baseVoterClaim.id },
      data: {
        status: ClaimStatus.PENDING,
        signature: null,
        signatureExpiry: null
      }
    });
    console.log('✅ BASE_VOTER reset to PENDING - choco_pie can now claim 0.03 USDC');
  } else if (baseVoterClaim) {
    console.log(`\nBASE_VOTER status is ${baseVoterClaim.status}, no reset needed`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
