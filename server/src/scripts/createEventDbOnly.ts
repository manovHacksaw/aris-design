import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Use the on-chain pool that was already created
const ON_CHAIN_EVENT_ID = '0x682c3566b9685a670f0321dfbef7e2688f9400ec48339e2bb869ca11260aad18';
const POOL_TX_HASH = '0x0837d3025ce88d599ac88ee431cf155b802aee85cd06b4656d3908abde6e8b26';
const MAX_PARTICIPANTS = 10;
const BASE_POOL_USDC = 0.30; // $0.03 * 10
const TOP_POOL_USDC = 0.60;
const PLATFORM_FEE_USDC = 0.15; // $0.015 * 10

async function createEventDbOnly() {
  // Get Nike brand
  const brand = await prisma.brand.findFirst({
    where: { name: { contains: 'Nike', mode: 'insensitive' } },
  });

  if (!brand) {
    throw new Error('Nike brand not found');
  }

  console.log('Creating event for brand:', brand.name);

  const now = new Date();
  const startTime = new Date(now.getTime() + 1 * 60 * 1000); // Start in 1 minute
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // End in 1 hour

  // Create event with proposals (vote_only needs at least 2 proposals)
  const event = await prisma.event.create({
    data: {
      title: 'Test Event with On-Chain Pool',
      description: 'This is a test event created with actual smart contract pool',
      category: 'Fashion',
      eventType: 'vote_only',
      status: 'voting', // Start directly in voting for testing
      startTime: startTime,
      endTime: endTime,
      capacity: MAX_PARTICIPANTS,
      baseReward: 0.03,
      topReward: TOP_POOL_USDC,
      brandId: brand.id,
      proposals: {
        create: [
          {
            type: 'IMAGE',
            title: 'Option A',
            content: 'Vote for this option',
            imageCid: 'QmXqcpYuZHYBX9Fee45hfqVTWUow1eejCjTCSoYUv1VGya',
            order: 1,
          },
          {
            type: 'IMAGE',
            title: 'Option B',
            content: 'Or vote for this option',
            imageCid: 'QmXqcpYuZHYBX9Fee45hfqVTWUow1eejCjTCSoYUv1VGya',
            order: 2,
          },
        ],
      },
    },
  });

  console.log('Event created:', event.id);

  // Create EventRewardsPool record
  const pool = await prisma.eventRewardsPool.create({
    data: {
      eventId: event.id,
      onChainEventId: ON_CHAIN_EVENT_ID,
      transactionHash: POOL_TX_HASH,
      maxParticipants: MAX_PARTICIPANTS,
      basePoolUsdc: BASE_POOL_USDC,
      topPoolUsdc: TOP_POOL_USDC,
      platformFeeUsdc: PLATFORM_FEE_USDC,
      creatorPoolUsdc: 0,
      status: 'ACTIVE',
    },
  });

  console.log('Pool record created:', pool.id);

  console.log('\n========================================');
  console.log('SUCCESS! Event created with on-chain pool');
  console.log('========================================');
  console.log('Event ID:', event.id);
  console.log('Event Title:', event.title);
  console.log('Event Status:', event.status);
  console.log('On-chain Event ID:', ON_CHAIN_EVENT_ID);
  console.log('Pool TX:', POOL_TX_HASH);
  console.log('');
  console.log('Next steps:');
  console.log('1. Vote on the event from the frontend');
  console.log('2. Complete the event (run completeLatestEvent.ts)');
  console.log('3. Check claimable rewards on the rewards page');

  await prisma.$disconnect();
}

createEventDbOnly().catch(console.error);
