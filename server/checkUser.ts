
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
    const email = 'manobendra.mandal@aristhrottle.org';
    console.log(`Checking user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
            ownedBrands: true,
        },
    });

    if (!user) {
        console.log('User not found!');
    } else {
        console.log('User found:', JSON.stringify(user, null, 2));

        const isOnboardedCalc = !!(
            user.isOnboarded &&
            user.displayName &&
            user.email &&
            !user.email.includes("@wallet.local")
        );
        console.log('Calculated isOnboarded:', isOnboardedCalc);
    }
}

checkUser()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
