import { prisma } from '../lib/prisma.js';
import { EventType } from '@prisma/client';

async function createTestEvents() {
  console.log('Creating test events for XP testing...\n');

  // Get active brands
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    take: 3,
  });

  if (brands.length === 0) {
    console.log('No active brands found. Creating a test brand...');
    const testBrand = await prisma.brand.create({
      data: {
        name: 'Test Brand XP',
        tagline: 'Testing the XP system',
        isActive: true,
        isVerified: true,
      },
    });
    brands.push({ id: testBrand.id, name: testBrand.name });
  }

  console.log('Using brands:', brands.map((b) => b.name).join(', '));

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const eventsToCreate = [];

  // Create POST_AND_VOTE events (in POSTING phase - users can submit)
  for (let i = 0; i < 2; i++) {
    const brand = brands[i % brands.length];
    eventsToCreate.push({
      title: `Creative Challenge ${i + 1} - Submit Your Art`,
      description: `Share your creative work and compete for rewards! This is a POST_AND_VOTE event where you can submit your content and vote on others.`,
      category: 'Art & Design',
      eventType: EventType.post_and_vote,
      status: 'posting',
      allowSubmissions: true,
      allowVoting: false,
      autoTransition: true,
      startTime: oneHourAgo,
      endTime: twoDaysFromNow,
      postingStart: oneHourAgo,
      postingEnd: oneDayFromNow,
      baseReward: 100 + i * 50,
      topReward: 500 + i * 100,
      capacity: 100,
      brandId: brand.id,
    });
  }

  // Create POST_AND_VOTE events (in VOTING phase - users can vote)
  for (let i = 0; i < 2; i++) {
    const brand = brands[(i + 1) % brands.length];
    eventsToCreate.push({
      title: `Photo Contest ${i + 1} - Vote Now!`,
      description: `Vote for your favorite submissions! This event is in the voting phase.`,
      category: 'Photography',
      eventType: EventType.post_and_vote,
      status: 'voting',
      allowSubmissions: false,
      allowVoting: true,
      autoTransition: true,
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endTime: oneDayFromNow,
      postingStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      postingEnd: oneHourAgo,
      baseReward: 200 + i * 100,
      topReward: 1000 + i * 200,
      capacity: 50,
      brandId: brand.id,
    });
  }

  // Create VOTE_ONLY events (in VOTING phase - users can vote on proposals)
  for (let i = 0; i < 2; i++) {
    const brand = brands[(i + 2) % brands.length];
    eventsToCreate.push({
      title: `Community Poll ${i + 1} - Cast Your Vote`,
      description: `Vote on these proposals! This is a VOTE_ONLY event.`,
      category: 'Community',
      eventType: EventType.vote_only,
      status: 'voting',
      allowSubmissions: false,
      allowVoting: true,
      autoTransition: true,
      startTime: oneHourAgo,
      endTime: oneDayFromNow,
      baseReward: 50 + i * 25,
      topReward: 250 + i * 50,
      capacity: 200,
      brandId: brand.id,
    });
  }

  // Create events
  const createdEvents = [];
  for (const eventData of eventsToCreate) {
    const event = await prisma.event.create({
      data: eventData,
    });
    createdEvents.push(event);
    console.log(`Created: ${event.title} (${event.eventType}, ${event.status})`);
  }

  // Add sample submissions to voting phase POST_AND_VOTE events
  const votingEvents = createdEvents.filter(
    (e) => e.eventType === EventType.post_and_vote && e.status === 'voting'
  );

  // Get some users to create submissions from
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, displayName: true },
  });

  if (users.length > 0) {
    console.log('\nAdding sample submissions to voting events...');
    for (const event of votingEvents) {
      for (let i = 0; i < Math.min(users.length, 3); i++) {
        const user = users[i];
        await prisma.submission.create({
          data: {
            eventId: event.id,
            userId: user.id,
            caption: `Sample submission ${i + 1} for ${event.title}`,
            status: 'approved',
            voteCount: Math.floor(Math.random() * 10),
          },
        });
      }
      console.log(`Added ${Math.min(users.length, 3)} submissions to: ${event.title}`);
    }
  }

  // Add proposals to VOTE_ONLY events
  const voteOnlyEvents = createdEvents.filter(
    (e) => e.eventType === EventType.vote_only
  );

  console.log('\nAdding proposals to vote-only events...');
  for (const event of voteOnlyEvents) {
    const proposals = [
      { title: 'Option A - Community Feature', content: 'Add a new community feature for discussions' },
      { title: 'Option B - Reward System', content: 'Enhance the reward system with new tiers' },
      { title: 'Option C - Mobile App', content: 'Prioritize mobile app development' },
    ];

    for (let i = 0; i < proposals.length; i++) {
      await prisma.proposal.create({
        data: {
          eventId: event.id,
          type: 'TEXT',
          title: proposals[i].title,
          content: proposals[i].content,
          order: i,
          voteCount: Math.floor(Math.random() * 5),
        },
      });
    }
    console.log(`Added 3 proposals to: ${event.title}`);
  }

  console.log('\n========================================');
  console.log('Test events created successfully!');
  console.log('========================================\n');
  console.log('Summary:');
  console.log(`- POST_AND_VOTE (posting phase): 2 events - users can submit content`);
  console.log(`- POST_AND_VOTE (voting phase): 2 events - users can vote on submissions`);
  console.log(`- VOTE_ONLY (voting phase): 2 events - users can vote on proposals`);
  console.log('\nTotal: 6 events created for XP testing');
}

createTestEvents()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error creating test events:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
