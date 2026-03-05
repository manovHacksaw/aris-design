import { ethers } from 'ethers';

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const REWARDS_VAULT_ADDRESS = '0x9a30294499b8784b80096b6C6Dd87456972eCA70';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.BACKEND_SIGNER_PRIVATE_KEY;

const ABI = [
    'function creditRewards(bytes32 eventId, address user, uint256 amount)',
    'function getAccumulatedRewards(address user) view returns (uint256)',
    'function getRemainingPool(bytes32 eventId) view returns (uint256)'
];

// Pending users from the event
const PENDING_USERS = [
    { wallet: '0x4a0cce134d1b71b5527d262468e444d4b275d4ca', name: 'snaps_of_manov', amount: 0.53 },
    { wallet: '0x1304d9ba6a6a8339eb86a2065973f5b7b93088f4', name: 'user2', amount: 0.53 },
    { wallet: '0xb7c13fcde1cb5751bcb66c5e2cadb6815c36c2da', name: 'choco_pie', amount: 0.33 }
];

// Pool with available balance (from "Summer Collection Theme" event)
const SOURCE_POOL_EVENT_ID = '0x56ade67dce82dbadb95aacb93ca8e74e01a671a5077c7164fbed3dfbcae60476';

async function manualCredit() {
    console.log('🔧 Manual Reward Crediting from Contract\n');

    if (!PRIVATE_KEY) {
        throw new Error('DEPLOYER_PRIVATE_KEY not set');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(REWARDS_VAULT_ADDRESS, ABI, wallet);

    // Check pool balance
    const remaining = await contract.getRemainingPool(SOURCE_POOL_EVENT_ID);
    console.log(`Source pool remaining: ${ethers.formatUnits(remaining, 6)} USDC\n`);

    if (remaining === 0n) {
        console.log('❌ Source pool has no remaining balance!');
        return;
    }

    // Credit each user
    for (const user of PENDING_USERS) {
        try {
            console.log(`💰 Processing ${user.name} (${user.wallet.slice(0, 10)}...)...`);

            // Check current balance
            const currentBalance = await contract.getAccumulatedRewards(user.wallet);
            const neededAmount = BigInt(Math.round(user.amount * 1_000_000));

            console.log(`   Current: ${ethers.formatUnits(currentBalance, 6)} USDC`);
            console.log(`   Needed: ${ethers.formatUnits(neededAmount, 6)} USDC`);

            if (currentBalance >= neededAmount) {
                console.log(`   ✅ Already has sufficient balance\n`);
                continue;
            }

            const amountToCredit = neededAmount - currentBalance;
            console.log(`   📤 Crediting ${ethers.formatUnits(amountToCredit, 6)} USDC...`);

            const tx = await contract.creditRewards(
                SOURCE_POOL_EVENT_ID,
                user.wallet,
                amountToCredit
            );

            console.log(`   TX: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Confirmed\n`);

        } catch (error: any) {
            console.error(`   ❌ Failed:`, error.message, '\n');
        }
    }

    console.log('✅ Manual crediting complete!');
}

manualCredit().catch(console.error);
