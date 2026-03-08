import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REQUESTED_USERNAMES = [
    'manovmandal',
    'chocopie',
    'shuttercandy',
    'snaps_of_manov',
    'tinni',
    'rajsha10'
];

async function main() {
    console.log('=== Checking Users ===\n');

    for (const username of REQUESTED_USERNAMES) {
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, email: true }
        });

        if (user) {
            console.log(`✅ ${username.padEnd(20)} - ${user.id}`);
        } else {
            console.log(`❌ ${username.padEnd(20)} - NOT FOUND`);
        }
    }

    console.log('\n=== All Users in DB ===\n');
    const allUsers = await prisma.user.findMany({
        select: { username: true, email: true },
        orderBy: { username: 'asc' }
    });

    allUsers.forEach(u => console.log(`  - ${u.username} (${u.email})`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
