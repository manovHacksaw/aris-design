
import { prisma } from './src/lib/prisma';
import { generateToken } from './src/utils/jwt';

async function main() {
    try {
        // 1. Find a brand owner
        let user = await prisma.user.findFirst({
            where: { role: 'BRAND_OWNER' }
        });

        if (!user) {
            console.log('No brand owner found. Finding any user to promote...');
            user = await prisma.user.findFirst();

            if (user) {
                console.log(`Promoting user ${user.email} to BRAND_OWNER`);
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { role: 'BRAND_OWNER' }
                });
            } else {
                console.log('No users found. Creating a test brand owner...');
                user = await prisma.user.create({
                    data: {
                        email: 'test-brand@example.com',
                        username: 'testbrand',
                        role: 'BRAND_OWNER',
                        walletAddress: '0x0000000000000000000000000000000000000000',
                        isOnboarded: true
                    }
                });
            }
        }

        console.log(`Using user: ${user.email} (${user.id})`);

        // 2. Ensure user has a brand
        const brand = await prisma.brand.findFirst({
            where: { ownerId: user.id }
        });

        if (!brand) {
            console.log('User has no brand. Creating one...');
            await prisma.brand.create({
                data: {
                    name: 'Test Brand',
                    description: 'A test brand',
                    ownerId: user.id,
                    isActive: true,
                    isVerified: true
                }
            });
        }

        // 3. Create session
        const session = await prisma.userSession.create({
            data: {
                userId: user.id,
                isActive: true,
                expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        // 4. Generate token
        const token = generateToken({
            userId: user.id,
            address: user.walletAddress || '',
            email: user.email,
            sessionId: session.id
        });

        console.log('\nJWT Token:');
        console.log(token);
        console.log('\n');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
