
import { PrismaClient } from '@prisma/client';
import { RewardsService } from '../services/rewardsService.js';

// Initialize Prisma
const prisma = new PrismaClient();

const USERS = [
    { username: 'manov', role: 'USER' },
    { username: 'candyman', role: 'USER' },
    { username: 'snapsofmanov', role: 'USER' },
    { username: 'chocopie', role: 'USER' }
];

async function main() {
    console.log('🚀 Starting Voting Simulation...');

    try {
        // 1. Get Latest Event
        const event = await prisma.event.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                submissions: {
                    include: { user: true }
                }
            }
        });

        if (!event) {
            console.error('❌ No event found!');
            return;
        }
        console.log(`✅ Using Event: "${event.title}" (${event.id})`);

        // 2. Ensure Users Exist (and get their IDs)
        const userMap = new Map();
        for (const u of USERS) {
            let user = await prisma.user.findFirst({ where: { username: u.username } });
            if (!user) {
                console.error(`❌ User ${u.username} not found in DB! Skipping...`);
                // We skip instead of create, per user constraints.
                // If strict mode, we could return;
                continue;
            }
            userMap.set(u.username, user);
        }

        // 3. Transition Event to VOTING (if needed)
        if (event.status !== 'VOTING') {
            console.log('🔄 Transitioning event to VOTING phase...');
            await prisma.event.update({
                where: { id: event.id },
                data: {
                    status: 'VOTING',
                    startTime: new Date(Date.now() - 3600000), // Started 1 hour ago
                    postingEnd: new Date(Date.now() - 1800000), // Posting ended 30 mins ago
                    endTime: new Date(Date.now() + 3600000), // Ends in 1 hour
                }
            });
        }

        // 4. Cast Votes
        // Logic: Each user votes for a submission NOT owned by them.
        // We want a clear winner.
        // Target winner: Any submission not owned by 'manov' (to show others winning?).
        // Or just pick the first valid submission.

        const submissions = event.submissions;
        if (submissions.length === 0) {
            console.error('❌ No submissions to vote on!');
            return;
        }

        console.log(`🗳️ Found ${submissions.length} submissions.`);

        // Distribute votes
        // Let's make the FIRST submission the winner with 3 votes, and 2nd with 1 vote.
        // Ensure voters don't vote for themselves.

        for (const [username, user] of userMap.entries()) {
            // Find a submission this user didn't author
            // Try to vote for Submission 0 if possible, else Submission 1.
            let targetSubmission = submissions[0];

            if (targetSubmission.userId === user.id) {
                // Find another one
                targetSubmission = submissions.find(s => s.userId !== user.id) || null;
            }

            if (targetSubmission) {
                // check if already voted
                const existingVote = await prisma.vote.findUnique({
                    where: {
                        unique_submission_vote: {
                            eventId: event.id,
                            submissionId: targetSubmission.id,
                            userId: user.id
                        }
                    }
                });

                if (!existingVote) {
                    await prisma.vote.create({
                        data: {
                            eventId: event.id,
                            userId: user.id,
                            submissionId: targetSubmission.id,
                        }
                    });
                    console.log(`✅ User ${username} voted for submission by ${targetSubmission.user.username || 'unknown'}`);

                    // Update stats
                    await prisma.submission.update({
                        where: { id: targetSubmission.id },
                        data: { voteCount: { increment: 1 } }
                    });

                } else {
                    console.log(`ℹ️ User ${username} already voted for this submission.`);
                }
            } else {
                console.warn(`⚠️ User ${username} could not find a valid submission to vote on (might be the only author).`);
            }
        }

        // 5. Finalize Event (Transition to COMPLETED and Process Rewards)
        console.log('🏁 Finalizing Event to trigger rewards...');

        // Set status to COMPLETED
        await prisma.event.update({
            where: { id: event.id },
            data: {
                status: 'COMPLETED',
                endTime: new Date(), // Ended now
            }
        });

        // Call RewardsService
        console.log('💰 Processing Rewards...');
        const result = await RewardsService.processEventRewards(event.id);

        if (result.success) {
            console.log('✅ Rewards Processed Successfully!');
            console.log(`   Claims Created: ${result.claimsCreated}`);
            console.log(`   Total Rewards: ${result.totalRewards} USDC`);
        } else {
            console.error('❌ Rewards Processing Failed:', result.errors);
        }

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
