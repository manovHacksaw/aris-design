import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Contract addresses on Mantle Sepolia
const REWARDS_VAULT_ADDRESS = '0x2Ece3CBE5734B92cb9E51DB47c904e33DB83157B';
const TEST_USDC_ADDRESS = '0x770bc6548328cD0b63327e55AD21C789Fba6a41f';
const RPC_URL = 'https://rpc-amoy.polygon.technology';

// ABIs
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const REWARDS_VAULT_ABI = [
  'function createPool(bytes32 eventId, uint8 eventType, uint256 maxParticipants, uint256 topPoolAmount)',
  'function calculateRequiredDeposit(uint8 eventType, uint256 maxParticipants, uint256 topPoolAmount) view returns (uint256)',
  'function getPoolInfo(bytes32 eventId) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount))',
];

// Constants matching smart contract
const BASE_REWARD_VOTE_ONLY = 30000n; // $0.03 in 6 decimals
const PLATFORM_FEE_PER_PARTICIPANT = 15000n; // $0.015 in 6 decimals

async function createEventWithPool() {
  const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BACKEND_SIGNER_PRIVATE_KEY not set in environment');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Wallet address:', wallet.address);

  // Setup contracts
  const usdc = new ethers.Contract(TEST_USDC_ADDRESS, ERC20_ABI, wallet);
  const rewardsVault = new ethers.Contract(REWARDS_VAULT_ADDRESS, REWARDS_VAULT_ABI, wallet);

  // Check USDC balance
  const balance = await usdc.balanceOf(wallet.address);
  console.log('USDC Balance:', ethers.formatUnits(balance, 6), 'USDC');

  // Event parameters
  const eventType = 0; // VoteOnly
  const maxParticipants = 10n;
  // Base pool = $0.03 * 10 = $0.30 = 300000 in 6 decimals
  // Top pool must be >= 2x base pool = $0.60 = 600000 in 6 decimals
  const topPoolAmount = 600000n; // $0.60 top pool (must be >= 2x base pool)

  // Calculate required deposit
  const requiredDeposit = await rewardsVault.calculateRequiredDeposit(eventType, maxParticipants, topPoolAmount);
  console.log('Required deposit:', ethers.formatUnits(requiredDeposit, 6), 'USDC');

  if (balance < requiredDeposit) {
    console.error('Insufficient USDC balance!');
    console.log('Need:', ethers.formatUnits(requiredDeposit, 6));
    console.log('Have:', ethers.formatUnits(balance, 6));
    return;
  }

  // Get Nike brand
  const brand = await prisma.brand.findFirst({
    where: { name: { contains: 'Nike', mode: 'insensitive' } },
  });

  if (!brand) {
    throw new Error('Nike brand not found');
  }

  console.log('Creating event for brand:', brand.name);

  // Create a temporary event ID for on-chain reference
  const tempEventId = `temp-${Date.now()}`;
  const onChainEventId = keccak256(toUtf8Bytes(tempEventId));

  console.log('Temp Event ID:', tempEventId);
  console.log('On-chain Event ID (bytes32):', onChainEventId);

  // Step 1: Approve USDC
  console.log('\n--- Step 1: Approving USDC ---');
  const currentAllowance = await usdc.allowance(wallet.address, REWARDS_VAULT_ADDRESS);
  console.log('Current allowance:', ethers.formatUnits(currentAllowance, 6));

  if (currentAllowance < requiredDeposit) {
    console.log('Approving USDC...');
    const approveTx = await usdc.approve(REWARDS_VAULT_ADDRESS, requiredDeposit);
    console.log('Approve TX:', approveTx.hash);
    await approveTx.wait();
    console.log('USDC approved!');
  } else {
    console.log('Already has sufficient allowance');
  }

  // Step 2: Create pool on-chain
  console.log('\n--- Step 2: Creating pool on-chain ---');
  const createPoolTx = await rewardsVault.createPool(
    onChainEventId,
    eventType,
    maxParticipants,
    topPoolAmount
  );
  console.log('Create Pool TX:', createPoolTx.hash);
  const receipt = await createPoolTx.wait();
  console.log('Pool created on-chain!');

  // Verify pool was created
  const poolInfo = await rewardsVault.getPoolInfo(onChainEventId);
  console.log('Pool Info:', {
    state: poolInfo.state,
    eventType: poolInfo.eventType,
    brandAddress: poolInfo.brandAddress,
    maxParticipants: poolInfo.maxParticipants.toString(),
    basePool: ethers.formatUnits(poolInfo.basePool, 6),
    topPool: ethers.formatUnits(poolInfo.topPool, 6),
  });

  // Step 3: Create event in database
  console.log('\n--- Step 3: Creating event in database ---');

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
      capacity: Number(maxParticipants),
      baseReward: Number(BASE_REWARD_VOTE_ONLY) / 1e6,
      topReward: Number(topPoolAmount) / 1e6,
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
  const basePoolUsdc = Number(BASE_REWARD_VOTE_ONLY * maxParticipants) / 1e6;
  const topPoolUsdc = Number(topPoolAmount) / 1e6;
  const platformFeeUsdc = Number(PLATFORM_FEE_PER_PARTICIPANT * maxParticipants) / 1e6;

  const pool = await prisma.eventRewardsPool.create({
    data: {
      eventId: event.id,
      onChainEventId: onChainEventId,
      transactionHash: createPoolTx.hash,
      maxParticipants: Number(maxParticipants),
      basePoolUsdc: basePoolUsdc,
      topPoolUsdc: topPoolUsdc,
      platformFeeUsdc: platformFeeUsdc,
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
  console.log('On-chain Event ID:', onChainEventId);
  console.log('Pool TX:', createPoolTx.hash);
  console.log('');
  console.log('Next steps:');
  console.log('1. Vote on the event from the frontend');
  console.log('2. Complete the event (run completeLatestEvent.ts)');
  console.log('3. Check claimable rewards on the rewards page');

  await prisma.$disconnect();
}

createEventWithPool().catch(console.error);
