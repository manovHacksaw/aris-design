
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying Rewards...');

    try {
        // 1. Get Latest Event
        const event = await prisma.event.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                rewardsPool: {
                    include: {
                        claims: {
                            include: { user: true }
                        }
                    }
                }
            }
        });

        if (!event) {
            console.error('❌ No event found!');
            return;
        }

        console.log(`Event: ${event.title} (${event.status})`);

        if (!event.rewardsPool) {
            console.log('⚠️ No Rewards Pool found for this event.');
            return;
        }

        console.log(`Pool Status: ${event.rewardsPool.status}`);
        console.log(`Total Claims: ${event.rewardsPool.claims.length}`);

        if (event.rewardsPool.claims.length > 0) {
            console.log('----------- CLAIMS -----------');
            for (const claim of event.rewardsPool.claims) {
                console.log(`User: ${claim.user.username.padEnd(15)} | Type: ${claim.claimType.padEnd(12)} | Amount: ${claim.finalAmount} USDC | Status: ${claim.status}`);
            }
            console.log('------------------------------');
        } else {
            console.log('❌ No claims generated yet.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
