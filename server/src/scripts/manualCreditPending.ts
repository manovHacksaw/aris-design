import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const REWARDS_VAULT_ADDRESS = '0x9a30294499b8784b80096b6C6Dd87456972eCA70';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.BACKEND_SIGNER_PRIVATE_KEY;

const ABI = [
    'function creditRewards(bytes32 eventId, address user, uint256 amount)',
    'function getAccumulatedRewards(address user) view returns (uint256)',
    'function getPoolInfo(bytes32 eventId) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount, uint256 refundAmount, bool refundClaimed))',
    'function getRemainingPool(bytes32 eventId) view returns (uint256)'
];

/**
 * Manually credit pending rewards using a pool with available balance
 */
async function manualCreditPendingRewards() {
    console.log('🔧 Manual Reward Crediting\n');
    console.log('========================================\n');

    if (!PRIVATE_KEY) {
        throw new Error('DEPLOYER_PRIVATE_KEY or BACKEND_SIGNER_PRIVATE_KEY not set');
    }

    // Setup contract
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(REWARDS_VAULT_ADDRESS, ABI, wallet);

    // Find all PENDING claims
    const pendingClaims = await prisma.rewardClaim.findMany({
        where: { status: 'PENDING' },
        include: {
            user: {
                select: {
                    username: true,
                    email: true,
                    walletAddress: true
                }
            },
            pool: {
                select: {
                    eventId: true,
                    onChainEventId: true,
                    event: {
                        select: { title: true }
                    }
                }
            }
        }
    });

    console.log(`Found ${pendingClaims.length} PENDING claims\n`);

    if (pendingClaims.length === 0) {
        console.log('✅ No pending claims to process!');
        await prisma.$disconnect();
        return;
    }

    // Group by user wallet
    const userRewards = new Map<string, { username: string; totalAmount: number; claims: any[] }>();

    for (const claim of pendingClaims) {
        if (!claim.user?.walletAddress) {
            console.log(`⚠️  Skipping claim ${claim.id} - user has no wallet address`);
            continue;
        }

        const existing = userRewards.get(claim.user.walletAddress);
        if (existing) {
            existing.totalAmount += claim.finalAmount;
            existing.claims.push(claim);
        } else {
            userRewards.set(claim.user.walletAddress, {
                username: claim.user.username || claim.user.email || 'Unknown',
                totalAmount: claim.finalAmount,
                claims: [claim]
            });
        }
    }

    console.log('Users with PENDING rewards:');
    for (const [wallet, data] of userRewards.entries()) {
        console.log(`  - ${data.username} (${wallet.slice(0, 10)}...): $${data.totalAmount.toFixed(4)} USDC`);
    }
    console.log('');

    // Find a pool with remaining balance
    console.log('🔍 Finding pool with available balance...\n');

    const pools = await prisma.eventRewardsPool.findMany({
        where: { status: 'ACTIVE' },
        select: {
            eventId: true,
            onChainEventId: true,
            event: { select: { title: true } }
        }
    });

    let selectedPool = null;
    let selectedPoolRemaining = 0n;

    for (const pool of pools) {
        try {
            const remaining = await contract.getRemainingPool(pool.onChainEventId);
            console.log(`Pool "${pool.event.title}": ${ethers.formatUnits(remaining, 6)} USDC remaining`);

            if (remaining > selectedPoolRemaining) {
                selectedPool = pool;
                selectedPoolRemaining = remaining;
            }
        } catch (error) {
            console.log(`  ⚠️  Error checking pool: ${error.message}`);
        }
    }

    if (!selectedPool || selectedPoolRemaining === 0n) {
        console.log('\n❌ No pool with available balance found!');
        await prisma.$disconnect();
        return;
    }

    console.log(`\n✅ Using pool "${selectedPool.event.title}" with ${ethers.formatUnits(selectedPoolRemaining, 6)} USDC available\n`);
    console.log('========================================\n');

    // Credit each user
    for (const [walletAddress, data] of userRewards.entries()) {
        try {
            console.log(`💰 Processing ${data.username}...`);

            // Check current balance
            const currentBalance = await contract.getAccumulatedRewards(walletAddress);
            const neededAmount = BigInt(Math.round(data.totalAmount * 1_000_000));

            console.log(`   Current balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
            console.log(`   Needed amount: ${ethers.formatUnits(neededAmount, 6)} USDC`);

            if (currentBalance >= neededAmount) {
                console.log(`   ✅ Already has sufficient balance, updating claims to CREDITED`);

                // Update claims to CREDITED
                for (const claim of data.claims) {
                    await prisma.rewardClaim.update({
                        where: { id: claim.id },
                        data: { status: 'CREDITED' }
                    });
                }

                console.log(`   ✅ Updated ${data.claims.length} claims to CREDITED\n`);
                continue;
            }

            // Credit the difference
            const amountToCredit = neededAmount - currentBalance;
            console.log(`   📤 Crediting ${ethers.formatUnits(amountToCredit, 6)} USDC...`);

            const tx = await contract.creditRewards(
                selectedPool.onChainEventId,
                walletAddress,
                amountToCredit
            );

            console.log(`   Transaction: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Transaction confirmed`);

            // Update claims to CREDITED
            for (const claim of data.claims) {
                await prisma.rewardClaim.update({
                    where: { id: claim.id },
                    data: { status: 'CREDITED' }
                });
            }

            console.log(`   ✅ Updated ${data.claims.length} claims to CREDITED\n`);

        } catch (error: any) {
            console.error(`   ❌ Failed to credit ${data.username}:`, error.message, '\n');
        }
    }

    console.log('========================================');
    console.log('✅ Manual crediting complete!\n');

    // Show final status
    const stillPending = await prisma.rewardClaim.count({
        where: { status: 'PENDING' }
    });

    console.log(`Remaining PENDING claims: ${stillPending}`);

    await prisma.$disconnect();
}

manualCreditPendingRewards().catch(console.error);
