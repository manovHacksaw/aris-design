
import { prisma } from '../lib/prisma.js';
import { VoteService } from '../services/voteService.js';
import { EventStatus } from '@prisma/client';

async function simulateVotes() {
    console.log('--- Starting Vote Simulation ---');

    try {
        // 1. Fetch Active Events
        const events = await prisma.event.findMany({
            where: {
                status: 'VOTING',
                isDeleted: false
            },
            include: {
                proposals: true,
                submissions: {
                    where: { status: 'active' }
                }
            }
        });

        console.log(`Found ${events.length} active voting events.`);

        if (events.length === 0) {
            console.log('No active events to vote on.');
            return;
        }

        // 2. Fetch Users
        const users = await prisma.user.findMany({
            take: 50, // Simulate 50 users voting
        });
        console.log(`Found ${users.length} users to cast votes.`);

        // 3. Iterate Events and Vote
        for (const event of events) {
            console.log(`Simulating voting for Event: ${event.title} (${event.eventType})`);

            let voteCount = 0;

            for (const user of users) {
                try {
                    // Check if already voted
                    const existingVote = await prisma.vote.findFirst({
                        where: { eventId: event.id, userId: user.id }
                    });

                    if (existingVote) {
                        continue; // Skip if already voted
                    }

                    // Determine what to vote for
                    if (event.eventType === 'vote_only') {
                        // Vote for Proposals
                        if (event.proposals.length === 0) continue;

                        // Pick 1-3 random proposals
                        const numVotes = Math.floor(Math.random() * 3) + 1;
                        const shuffled = [...event.proposals].sort(() => 0.5 - Math.random());
                        const selected = shuffled.slice(0, numVotes);
                        const proposalIds = selected.map(p => p.id);

                        await VoteService.voteForProposals(event.id, user.id, { proposalIds });
                        voteCount++;

                    } else if (event.eventType === 'post_and_vote') {
                        // Vote for Submission
                        if (event.submissions.length === 0) continue;

                        // Pick 1 random submission
                        const randomSubmission = event.submissions[Math.floor(Math.random() * event.submissions.length)];

                        // Cannot vote for own submission
                        if (randomSubmission.userId === user.id) continue;

                        await VoteService.voteForSubmission(event.id, user.id, { submissionId: randomSubmission.id });
                        voteCount++;
                    }

                    process.stdout.write('.'); // Progress indicator

                } catch (e: any) {
                    // Ignore specific errors (e.g. "Brand owners cannot vote", "Capacity reached")
                    // if (!e.message.includes('Brand owners') && !e.message.includes('own submission')) {
                    //     console.log(`Vote failed: ${e.message}`);
                    // }
                }
            }
            console.log(`\nEvent ${event.id}: Cast ${voteCount} new votes.`);
        }

    } catch (error) {
        console.error('Simulation Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

simulateVotes();
