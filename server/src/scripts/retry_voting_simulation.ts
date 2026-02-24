
import { PrismaClient, EventType } from '@prisma/client';
import { RewardsService } from '../services/rewardsService.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const USERS = ['manov', 'candyman', 'snapsofmanov', 'chocopie'];

async function main() {
    console.log('🔄 Starting Retry Voting Simulation on NEW Event...');

    try {
        // 1. Ensure Users have Wallets
        const userMap = new Map();
        for (const username of USERS) {
            let user = await prisma.user.findFirst({ where: { username } });
            if (!user) {
                console.error(`❌ User ${username} not found!`);
                // In retry, we expect them to exist now.
                continue;
            }

            // Ensure valid wallet
            if (!user.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(user.walletAddress)) {
                const fakeWallet = `0x${username.split('').map(c => c.charCodeAt(0).toString(16)).join('').padEnd(40, '0').slice(0, 40)}`;
                console.log(`Updating wallet for ${username} to ${fakeWallet}`);
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { walletAddress: fakeWallet }
                });
            }
            userMap.set(username, user);
        }

        if (userMap.size < 2) {
            console.error("Not enough users to proceed.");
            return;
        }

        const manov = userMap.get('manov');
        const candyman = userMap.get('candyman');

        // 2. Create New Event
        console.log('Creating Clean Event...');
        const eventId = uuidv4();
        const startTime = new Date();
        const endTime = new Date(Date.now() + 3600000); // 1h later

        const event = await prisma.event.create({
            data: {
                id: eventId,
                title: `Retry Simulation Event ${Date.now()}`,
                description: "Simulated event for rewards testing",
                eventType: 'post_and_vote',
                status: 'SCHEDULED', // Start as scheduled, will transition
                startTime,
                endTime,
                postingStart: startTime,
                postingEnd: new Date(Date.now() + 1800000), // 30m
                brandId: (await prisma.brand.findFirst({ where: { ownerId: manov.id } }))?.id || (await prisma.brand.create({
                    data: { name: `Brand-${Date.now()}`, ownerId: manov.id }
                })).id,
                capacity: 10,
                baseReward: 0.1,
                topReward: 1.0,
                leaderboardPool: 0.5,
                samples: ["QmSample..."]
            }
        });

        console.log(`Event Created: ${event.id}`);

        // Create Rewards Pool (Needed!)
        await RewardsService.createPoolRecord(event.id, 10, 1.0, 0.5);
        console.log('Rewards Pool Created');

        // 3. Create Submissions (Manov and Candyman)
        console.log('Creating Submissions...');
        const sub1 = await prisma.submission.create({
            data: {
                eventId: event.id,
                userId: manov.id,
                imageCid: "QmSub1...",
                caption: "Manov Submission",
                status: "active"
            }
        });

        const sub2 = await prisma.submission.create({
            data: {
                eventId: event.id,
                userId: candyman.id,
                imageCid: "QmSub2...",
                caption: "Candyman Submission",
                status: "active"
            }
        });

        // 4. Transition to VOTING
        console.log('Transitioning to VOTING...');
        await prisma.event.update({
            where: { id: event.id },
            data: { status: 'VOTING' }
        });

        // 5. Cast Votes
        // Manov cannot vote for Sub1. Candyman cannot vote for Sub2.
        // Others can vote for any.
        // Goal: Manov wins? Or Candyman wins?
        // Let's make Candyman (Sub2) win.
        // Voters: manov (votes Sub2), snapsofmanov (votes Sub2), chocopie (votes Sub2).
        // candyman (votes Sub1 - cannot vote Sub2).

        console.log('Casting Votes...');

        await prisma.vote.create({ data: { eventId: event.id, submissionId: sub2.id, userId: manov.id } }); // Manov -> Sub2
        await prisma.vote.create({ data: { eventId: event.id, submissionId: sub2.id, userId: userMap.get('snapsofmanov').id } });
        await prisma.vote.create({ data: { eventId: event.id, submissionId: sub2.id, userId: userMap.get('chocopie').id } });

        await prisma.vote.create({ data: { eventId: event.id, submissionId: sub1.id, userId: candyman.id } }); // Candyman -> Sub1

        // Update vote counts
        await prisma.submission.update({ where: { id: sub2.id }, data: { voteCount: 3 } });
        await prisma.submission.update({ where: { id: sub1.id }, data: { voteCount: 1 } });

        console.log('Votes Cast. Winner should be Candyman (Sub2).');

        // 6. Finalize
        console.log('Finalizing Event...');
        await prisma.event.update({
            where: { id: event.id },
            data: { status: 'COMPLETED', endTime: new Date() }
        });

        // 7. Process Rewards
        console.log('Processing Rewards...');
        const result = await RewardsService.processEventRewards(event.id);

        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Error in Retry Simulation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
