import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Contract addresses on Mantle Sepolia
const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS || '0x9a30294499b8784b80096b6C6Dd87456972eCA70';
const TEST_USDC_ADDRESS = process.env.TEST_USDC_ADDRESS || '0x770bc6548328cD0b63327e55AD21C789Fba6a41f';
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

// ABIs
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function owner() view returns (address)',
];

const REWARDS_VAULT_ABI = [
  'function createPool(bytes32 eventId, uint8 eventType, uint256 maxParticipants, uint256 topPoolAmount)',
  'function calculateRequiredDeposit(uint8 eventType, uint256 maxParticipants, uint256 topPoolAmount) view returns (uint256)',
  'function getPoolInfo(bytes32 eventId) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount, uint256 refundAmount, bool refundClaimed))',
];

// Constants matching smart contract
const BASE_REWARD_VOTE_ONLY = 30000n; // $0.03 in 6 decimals
const PLATFORM_FEE_PER_PARTICIPANT = 15000n; // $0.015 in 6 decimals
const MIN_TOP_MULTIPLIER = 2n;

interface EventConfig {
  brandName: string;
  title: string;
  description: string;
  category: string;
  maxParticipants: number;
  proposals: { title: string; content: string }[];
}

// Event configurations
const EVENT_CONFIGS: EventConfig[] = [
  {
    brandName: 'Nike',
    title: 'Best Sneaker Design 2026',
    description: 'Vote for your favorite sneaker design concept',
    category: 'Fashion',
    maxParticipants: 5,
    proposals: [
      { title: 'Air Max Future', content: 'Futuristic Air Max with LED soles' },
      { title: 'Jordan Retro X', content: 'Classic Jordan design reimagined' },
      { title: 'Nike Free Run Pro', content: 'Ultra-lightweight running shoe' },
    ],
  },
  {
    brandName: 'Crunchora Chips',
    title: 'New Chip Flavor Vote',
    description: 'Help us choose our next chip flavor!',
    category: 'Food & Beverage',
    maxParticipants: 8,
    proposals: [
      { title: 'Spicy Sriracha', content: 'Hot and tangy sriracha flavor' },
      { title: 'Honey BBQ', content: 'Sweet and smoky BBQ taste' },
      { title: 'Sour Cream & Onion', content: 'Classic creamy flavor' },
      { title: 'Salt & Vinegar', content: 'Tangy traditional taste' },
    ],
  },
  {
    brandName: 'Wai Wai',
    title: 'Noodle Packaging Design',
    description: 'Vote for the best new packaging design',
    category: 'Food & Beverage',
    maxParticipants: 3,
    proposals: [
      { title: 'Modern Minimalist', content: 'Clean, simple design' },
      { title: 'Retro Vibes', content: 'Nostalgic vintage look' },
    ],
  },
  {
    brandName: 'Laby',
    title: 'Summer Collection Theme',
    description: 'Choose the theme for our summer collection',
    category: 'Fashion',
    maxParticipants: 10,
    proposals: [
      { title: 'Ocean Breeze', content: 'Cool blues and aqua tones' },
      { title: 'Tropical Paradise', content: 'Vibrant tropical patterns' },
      { title: 'Desert Sunset', content: 'Warm oranges and earth tones' },
    ],
  },
  {
    brandName: 'Yadav Brand',
    title: 'Logo Redesign Vote',
    description: 'Help us choose our new logo',
    category: 'Branding',
    maxParticipants: 6,
    proposals: [
      { title: 'Modern Geometric', content: 'Sharp, contemporary design' },
      { title: 'Classic Script', content: 'Elegant handwritten style' },
      { title: 'Bold & Simple', content: 'Minimalist wordmark' },
    ],
  },
];

async function setupMultipleEvents() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY or BACKEND_SIGNER_PRIVATE_KEY not set');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('='.repeat(60));
  console.log('SETUP MULTIPLE EVENTS WITH ON-CHAIN POOLS');
  console.log('='.repeat(60));
  console.log('Wallet address:', wallet.address);
  console.log('RewardsVault:', REWARDS_VAULT_ADDRESS);
  console.log('TestUSDC:', TEST_USDC_ADDRESS);
  console.log('');

  // Setup contracts
  const usdc = new ethers.Contract(TEST_USDC_ADDRESS, ERC20_ABI, wallet);
  const rewardsVault = new ethers.Contract(REWARDS_VAULT_ADDRESS, REWARDS_VAULT_ABI, wallet);

  // Check if wallet is USDC owner (can mint)
  let canMint = false;
  try {
    const owner = await usdc.owner();
    canMint = owner.toLowerCase() === wallet.address.toLowerCase();
    console.log('USDC Owner:', owner);
    console.log('Can mint USDC:', canMint);
  } catch (e) {
    console.log('Could not check USDC owner');
  }

  // Check initial USDC balance
  let balance = await usdc.balanceOf(wallet.address);
  console.log('Initial USDC Balance:', ethers.formatUnits(balance, 6), 'USDC');

  // Calculate total USDC needed for all events
  let totalNeeded = 0n;
  for (const config of EVENT_CONFIGS) {
    const maxParticipants = BigInt(config.maxParticipants);
    const basePool = BASE_REWARD_VOTE_ONLY * maxParticipants;
    const topPool = basePool * MIN_TOP_MULTIPLIER; // Minimum top pool
    const platformFee = PLATFORM_FEE_PER_PARTICIPANT * maxParticipants;
    totalNeeded += basePool + topPool + platformFee;
  }

  console.log('Total USDC needed:', ethers.formatUnits(totalNeeded, 6), 'USDC');

  // Mint USDC if needed and possible
  if (balance < totalNeeded && canMint) {
    const mintAmount = totalNeeded - balance + 100000000n; // Extra 100 USDC buffer
    console.log('\n--- Minting USDC ---');
    console.log('Minting:', ethers.formatUnits(mintAmount, 6), 'USDC');
    const mintTx = await usdc.mint(wallet.address, mintAmount);
    console.log('Mint TX:', mintTx.hash);
    await mintTx.wait();
    console.log('Minted successfully!');
    balance = await usdc.balanceOf(wallet.address);
    console.log('New balance:', ethers.formatUnits(balance, 6), 'USDC');
  } else if (balance < totalNeeded) {
    console.error('Insufficient USDC balance and cannot mint!');
    return;
  }

  // Approve RewardsVault to spend USDC
  console.log('\n--- Approving USDC ---');
  const currentAllowance = await usdc.allowance(wallet.address, REWARDS_VAULT_ADDRESS);
  if (currentAllowance < totalNeeded) {
    const approveTx = await usdc.approve(REWARDS_VAULT_ADDRESS, totalNeeded * 2n);
    console.log('Approve TX:', approveTx.hash);
    await approveTx.wait();
    console.log('Approved!');
  } else {
    console.log('Already has sufficient allowance');
  }

  // Process each event
  const createdEvents: { eventId: string; title: string; brandName: string; txHash: string }[] = [];

  for (let i = 0; i < EVENT_CONFIGS.length; i++) {
    const config = EVENT_CONFIGS[i];
    console.log('\n' + '='.repeat(60));
    console.log(`EVENT ${i + 1}/${EVENT_CONFIGS.length}: ${config.title}`);
    console.log('='.repeat(60));

    // Find or create brand
    let brand = await prisma.brand.findFirst({
      where: { name: { contains: config.brandName, mode: 'insensitive' } },
    });

    if (!brand) {
      console.log(`Creating brand: ${config.brandName}`);
      // Find a user to be the brand owner
      const user = await prisma.user.findFirst();
      if (!user) {
        console.error('No users found in database!');
        continue;
      }
      brand = await prisma.brand.create({
        data: {
          name: config.brandName,
          description: `${config.brandName} official brand account`,
          userId: user.id,
        },
      });
    }

    console.log('Brand:', brand.name, '(', brand.id, ')');

    // Calculate pool amounts
    const maxParticipants = BigInt(config.maxParticipants);
    const basePool = BASE_REWARD_VOTE_ONLY * maxParticipants;
    const topPool = basePool * MIN_TOP_MULTIPLIER;
    const platformFee = PLATFORM_FEE_PER_PARTICIPANT * maxParticipants;
    const totalDeposit = basePool + topPool + platformFee;

    console.log('Max participants:', config.maxParticipants);
    console.log('Base pool:', ethers.formatUnits(basePool, 6), 'USDC');
    console.log('Top pool:', ethers.formatUnits(topPool, 6), 'USDC');
    console.log('Platform fee:', ethers.formatUnits(platformFee, 6), 'USDC');
    console.log('Total deposit:', ethers.formatUnits(totalDeposit, 6), 'USDC');

    // Generate on-chain event ID
    const tempEventId = `event-${Date.now()}-${i}`;
    const onChainEventId = ethers.keccak256(ethers.toUtf8Bytes(tempEventId));
    console.log('On-chain Event ID:', onChainEventId);

    // Create pool on-chain
    try {
      console.log('Creating pool on-chain...');
      const createPoolTx = await rewardsVault.createPool(
        onChainEventId,
        0, // VoteOnly
        maxParticipants,
        topPool
      );
      console.log('Pool TX:', createPoolTx.hash);
      await createPoolTx.wait();
      console.log('Pool created on-chain!');

      // Verify pool
      const poolInfo = await rewardsVault.getPoolInfo(onChainEventId);
      console.log('Pool state:', poolInfo.state, '(1=Active)');

      // Create event in database
      const now = new Date();
      const startTime = new Date(now.getTime() + 2 * 60 * 1000); // Start in 2 minutes
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // End in 24 hours

      const event = await prisma.event.create({
        data: {
          title: config.title,
          description: config.description,
          category: config.category,
          eventType: 'vote_only',
          status: 'voting',
          startTime: startTime,
          endTime: endTime,
          capacity: config.maxParticipants,
          baseReward: Number(BASE_REWARD_VOTE_ONLY) / 1e6,
          topReward: Number(topPool) / 1e6,
          brandId: brand.id,
          proposals: {
            create: config.proposals.map((p, idx) => ({
              type: 'TEXT',
              title: p.title,
              content: p.content,
              order: idx + 1,
            })),
          },
        },
      });

      console.log('Event created:', event.id);

      // Create EventRewardsPool record
      const pool = await prisma.eventRewardsPool.create({
        data: {
          eventId: event.id,
          onChainEventId: onChainEventId,
          transactionHash: createPoolTx.hash,
          maxParticipants: config.maxParticipants,
          basePoolUsdc: Number(basePool) / 1e6,
          topPoolUsdc: Number(topPool) / 1e6,
          platformFeeUsdc: Number(platformFee) / 1e6,
          creatorPoolUsdc: 0,
          status: 'ACTIVE',
        },
      });

      console.log('Pool record created:', pool.id);

      createdEvents.push({
        eventId: event.id,
        title: config.title,
        brandName: config.brandName,
        txHash: createPoolTx.hash,
      });

      // Small delay between transactions
      await new Promise((resolve) => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error('Failed to create event:', error.message);
      if (error.message.includes('PoolAlreadyExists')) {
        console.log('Pool already exists, skipping...');
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Created ${createdEvents.length} events with on-chain pools:\n`);

  for (const event of createdEvents) {
    console.log(`- ${event.title}`);
    console.log(`  Brand: ${event.brandName}`);
    console.log(`  Event ID: ${event.eventId}`);
    console.log(`  TX: ${event.txHash}`);
    console.log('');
  }

  const finalBalance = await usdc.balanceOf(wallet.address);
  console.log('Final USDC Balance:', ethers.formatUnits(finalBalance, 6), 'USDC');

  await prisma.$disconnect();
}

setupMultipleEvents().catch(console.error);
