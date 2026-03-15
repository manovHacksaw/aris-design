import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Monitor an event and watch for automatic reward processing
 */
async function monitorEvent() {
    const eventId = process.argv[2];

    if (!eventId) {
        // Find latest active event
        const event = await prisma.event.findFirst({
            where: {
                status: { in: ['VOTING', 'voting'] },
                rewardsPool: { status: 'ACTIVE' }
            },
            include: {
                rewardsPool: true,
                _count: { select: { votes: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!event) {
            console.log('❌ No active event found');
            console.log('Usage: npx tsx src/scripts/monitorEvent.ts [eventId]');
            await prisma.$disconnect();
            return;
        }

        console.log(`📊 Monitoring latest event: "${event.title}"`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   End Time: ${event.endTime}`);
        console.log(`   Current Votes: ${event._count.votes}`);
        console.log(`   Capacity: ${event.capacity}\n`);

        await monitorEventById(event.id);
    } else {
        await monitorEventById(eventId);
    }

    await prisma.$disconnect();
}

async function monitorEventById(eventId: string) {
    console.log('🔍 Starting automatic monitoring...');
    console.log('   Checking every 10 seconds for status changes\n');
    console.log('========================================\n');

    let lastStatus = '';
    let lastVoteCount = 0;
    let lastClaimCount = 0;
    let checkCount = 0;

    const interval = setInterval(async () => {
        try {
            checkCount++;
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    rewardsPool: {
                        include: {
                            _count: {
                                select: { claims: true }
                            }
                        }
                    },
                    _count: {
                        select: { votes: true }
                    }
                }
            });

            if (!event) {
                console.log('❌ Event not found');
                clearInterval(interval);
                return;
            }

            const claimCount = event.rewardsPool?._count?.claims || 0;
            const now = new Date();
            const timeUntilEnd = event.endTime.getTime() - now.getTime();
            const minutesUntilEnd = Math.floor(timeUntilEnd / 60000);
            const secondsUntilEnd = Math.floor((timeUntilEnd % 60000) / 1000);

            // Check for status change
            if (event.status !== lastStatus) {
                console.log(`\n🔄 STATUS CHANGED: ${lastStatus || 'unknown'} → ${event.status}`);
                console.log(`   Time: ${now.toLocaleTimeString()}\n`);
                lastStatus = event.status;
            }

            // Check for vote changes
            if (event._count.votes !== lastVoteCount) {
                console.log(`📊 New vote! Total: ${event._count.votes}/${event.capacity}`);
                lastVoteCount = event._count.votes;
            }

            // Check for claim creation (rewards processed!)
            if (claimCount !== lastClaimCount) {
                console.log(`\n🎉 REWARDS PROCESSED!`);
                console.log(`   Claims created: ${claimCount}`);
                console.log(`   Time: ${now.toLocaleTimeString()}\n`);

                // Fetch and display claims
                const claims = await prisma.rewardClaim.findMany({
                    where: { pool: { eventId } },
                    include: {
                        user: {
                            select: {
                                username: true,
                                email: true,
                                walletAddress: true
                            }
                        }
                    },
                    orderBy: { finalAmount: 'desc' }
                });

                console.log('========================================');
                console.log(`CLAIMABLE REWARDS (${claims.length} users)`);
                console.log('========================================\n');

                claims.forEach((claim, i) => {
                    const userLabel = claim.user?.username || claim.user?.email || 'Unknown';
                    const smartAccount = claim.user?.walletAddress || 'No address';
                    console.log(`${i + 1}. ${userLabel}`);
                    console.log(`   Smart Account: ${smartAccount}`);
                    console.log(`   Amount: $${claim.finalAmount.toFixed(4)} USDC`);
                    console.log(`   Type: ${claim.claimType}`);
                    console.log('');
                });

                lastClaimCount = claimCount;
            }

            // Status update every 5 checks
            if (checkCount % 5 === 0) {
                console.log(`⏰ Check #${checkCount} - Status: ${event.status} | Votes: ${event._count.votes}/${event.capacity} | Claims: ${claimCount}`);

                if (event.status === 'voting' || event.status === 'VOTING') {
                    if (timeUntilEnd > 0) {
                        console.log(`   Time until end: ${minutesUntilEnd}m ${secondsUntilEnd}s`);
                    } else {
                        console.log(`   ⚠️  Event should have ended! Waiting for auto-transition...`);
                    }
                }
            }

            // Stop monitoring if event is completed and rewards are processed
            if ((event.status === 'COMPLETED' || event.status === 'completed') && claimCount > 0) {
                console.log('\n✅ Event completed and rewards processed!');
                console.log('   Stopping monitor.\n');
                clearInterval(interval);
            }

        } catch (error) {
            console.error('Error monitoring event:', error);
        }
    }, 10000); // Check every 10 seconds

    // Set initial status
    const initialEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            rewardsPool: {
                include: {
                    _count: { select: { claims: true } }
                }
            },
            _count: { select: { votes: true } }
        }
    });

    if (initialEvent) {
        lastStatus = initialEvent.status;
        lastVoteCount = initialEvent._count.votes;
        lastClaimCount = initialEvent.rewardsPool?._count?.claims || 0;
    }

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n\n👋 Monitoring stopped by user');
        clearInterval(interval);
        prisma.$disconnect();
        process.exit(0);
    });
}

monitorEvent();
