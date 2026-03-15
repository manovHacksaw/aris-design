import { PrismaClient } from '@prisma/client';
import { VoteService } from '../services/voteService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('VOTING ON LATEST EVENT');
  console.log('='.repeat(60));

  // Get latest event
  const event = await prisma.event.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { proposals: true, rewardsPool: true }
  });

  if (!event) {
    console.log('No event found');
    return;
  }

  console.log('\nEvent:', event.title);
  console.log('Event ID:', event.id);
  console.log('Status:', event.status);
  console.log('Proposals:', event.proposals.length);

  // Users to vote
  const usernames = ['manov', 'choco_pie', 'candyman', 'snaps_of_manov', 'rajsha10'];

  console.log('\n--- Creating Votes ---\n');

  for (const username of usernames) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { username: { contains: username, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log(`User ${username}: NOT FOUND`);
      continue;
    }

    // Check if already voted
    const existingVote = await prisma.vote.findFirst({
      where: { eventId: event.id, userId: user.id }
    });

    if (existingVote) {
      console.log(`${user.username || user.email}: Already voted`);
      continue;
    }

    // Pick a random proposal to vote for
    const randomIndex = Math.floor(Math.random() * event.proposals.length);
    const proposalId = event.proposals[randomIndex].id;

    try {
      await VoteService.voteForProposals(event.id, user.id, { proposalIds: [proposalId] });
      console.log(`${user.username || user.email}: Voted for "${event.proposals[randomIndex].title}"`);
    } catch (e: any) {
      console.log(`${user.username || user.email}: Failed - ${e.message}`);
    }
  }

  // Show vote count
  const voteCount = await prisma.vote.count({
    where: { eventId: event.id }
  });

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Event:', event.title);
  console.log('Total votes:', voteCount);
  console.log('Capacity:', event.capacity);
  console.log('\nRewards will be processed when event completes.');

  await prisma.$disconnect();
}

main().catch(console.error);
