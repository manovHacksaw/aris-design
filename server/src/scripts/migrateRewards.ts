
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

// Point dotenv to root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Config
// Allow Env to drive (should be 0x9a30 now)
// But fallback safely
const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS;
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.BACKEND_SIGNER_PRIVATE_KEY;

// Addresses
const OLD_WALLET = '0xb456a4f3bc892f8ee22da3f2856a24c0f957448c';
// Target correct new wallet from latest logs (Step 1131)
const NEW_WALLET = '0x977Dc738c29F9a6378B58557A91dc6C9EC0bd62F';

const EVENT_ID = '93acd472-c8d8-4d7f-b118-b84d2ff81102';
const EVENT_ID_HEX = EVENT_ID.replace(/-/g, '');
const EVENT_ID_BYTES32 = '0x' + EVENT_ID_HEX.padEnd(64, '0');

const ABI = [
    'function creditRewards(address user, uint256 amount, bytes32 eventId) external',
    'function getAccumulatedRewards(address user) view returns (uint256)'
];

async function main() {
    console.log('--- Starting On-Chain Migration (Final Fix) ---');
    console.log(`Vault Address: ${REWARDS_VAULT_ADDRESS}`);
    console.log(`Target User Wallet: ${NEW_WALLET}`);

    if (!PRIVATE_KEY) {
        throw new Error('BACKEND_SIGNER_PRIVATE_KEY not found in env');
    }
    if (!REWARDS_VAULT_ADDRESS) {
        throw new Error('REWARDS_VAULT_ADDRESS not found in env');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(REWARDS_VAULT_ADDRESS, ABI, wallet);

    // 1. Credit New Wallet
    // Blind credit of 0.05 USDC to ensure they have funds
    const amountToCredit = ethers.parseUnits("0.05", 6);

    try {
        console.log(`Crediting ${ethers.formatUnits(amountToCredit, 6)} USDC to ${NEW_WALLET}...`);
        // Use manual gas controls to avoid intrinsic gas errors
        const tx = await contract.creditRewards(NEW_WALLET, amountToCredit, EVENT_ID_BYTES32, {
            gasLimit: 500000
        });
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log('Transaction confirmed!');
    } catch (e: any) {
        console.error(`CREDIT REWARDS FAILED: ${e.message}`);
        throw e;
    }

    // 2. Verify
    try {
        const finalBalance = await contract.getAccumulatedRewards(NEW_WALLET);
        console.log(`Final Balance for ${NEW_WALLET}: ${ethers.formatUnits(finalBalance, 6)} USDC`);
    } catch (e: any) {
        console.log(`Verification failed: ${e.message}`);
    }
}

main().catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
});
