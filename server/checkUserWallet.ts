
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserWallet() {
    const email = 'manobendra.mandal@aristhrottle.org';
    console.log(`Checking user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
            id: true,
            email: true,
            walletAddress: true,
            displayName: true,
            isOnboarded: true
        }
    });

    console.log('User:', user);
}

checkUserWallet()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
