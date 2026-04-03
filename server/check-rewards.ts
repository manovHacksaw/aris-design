import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const wallet = process.argv[2];
  if (!wallet) {
    console.log("Usage: node check-rewards.js <wallet_address>");
    return;
  }
  
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { walletAddress: { equals: wallet, mode: 'insensitive' } },
        { eoaAddress: { equals: wallet, mode: 'insensitive' } }
      ]
    }
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  console.log("User ID:", user.id);
  console.log("Username:", user.username);
  console.log("Wallet Address:", user.walletAddress);
  console.log("EOA Address:", user.eoaAddress);

  const claims = await prisma.rewardClaim.findMany({
    where: { userId: user.id },
    include: {
      pool: {
        include: {
          event: true
        }
      }
    }
  });

  console.log("Found", claims.length, "claims total:");
  claims.forEach((c: any) => {
    console.log(`- Event: ${c.pool.event.title}, ID: ${c.id}, Status: ${c.status}, Amount: ${c.finalAmount}, Type: ${c.claimType}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
