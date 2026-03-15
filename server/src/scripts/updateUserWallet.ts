import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserWallet() {
  const username = process.argv[2];
  const newWalletAddress = process.argv[3];

  if (!username || !newWalletAddress) {
    console.log('Usage: npx tsx src/scripts/updateUserWallet.ts <username> <newWalletAddress>');
    console.log('');
    console.log('Example: npx tsx src/scripts/updateUserWallet.ts choco_pie 0x123...abc');
    return;
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(newWalletAddress)) {
    console.error('Invalid wallet address format. Must be 0x followed by 40 hex characters.');
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!user) {
      console.error('User not found:', username);
      return;
    }

    console.log('Found user:', user.username);
    console.log('Current wallet:', user.walletAddress);
    console.log('New wallet:', newWalletAddress);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { walletAddress: newWalletAddress.toLowerCase() },
    });

    console.log('');
    console.log('✅ Successfully updated wallet address!');
    console.log('User:', updated.username);
    console.log('Wallet:', updated.walletAddress);

  } catch (error) {
    console.error('Error updating wallet:', error);
  }

  await prisma.$disconnect();
}

updateUserWallet();
