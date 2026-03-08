import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const brandOwners = await prisma.user.findMany({
        where: {
            OR: [
                { role: 'BRAND_OWNER' },
                { ownedBrands: { some: {} } }
            ]
        },
        select: {
            email: true,
            username: true,
            walletAddress: true,
            role: true,
        }
    });

    console.log('Brand Owners found:');
    console.log(JSON.stringify(brandOwners, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
