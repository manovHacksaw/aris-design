
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERS = ['manov', 'candyman', 'snapsofmanov', 'chocopie'];

async function main() {
    console.log('🔍 Debugging User Data for Rewards...');

    for (const username of USERS) {
        const user = await prisma.user.findFirst({ where: { username } });
        if (user) {
            console.log(`User: ${username}`);
            console.log(`  ID: ${user.id}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Wallet: ${user.walletAddress}`);

            // Valid for rewards?
            const isRoleValid = user.role === 'USER';
            const isWalletValid = user.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(user.walletAddress);

            console.log(`  [Reward Check]: Role Valid? ${isRoleValid} | Wallet Valid? ${isWalletValid}`);
        } else {
            console.log(`❌ User ${username} NOT FOUND`);
        }
    }

    // Check Event Votes
    const event = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' }, include: { votes: true } });
    if (event) {
        console.log(`Event: ${event.title}`);
        console.log(`Total Votes: ${event.votes.length}`);
    }
}

main();
