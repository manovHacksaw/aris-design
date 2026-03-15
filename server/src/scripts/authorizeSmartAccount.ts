/**
 * authorizeSmartAccount.ts
 * Calls addSigner() on RewardsVaultV3 from the owner EOA to whitelist
 * the Pimlico smart account so it can call creditRewardsBatch() gaslessly.
 *
 * Usage:
 *   bun run src/scripts/authorizeSmartAccount.ts
 */
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { entryPoint07Address } from 'viem/account-abstraction';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const polygonAmoy = defineChain({
    id: 80002,
    name: 'Polygon Amoy Testnet',
    nativeCurrency: { decimals: 18, name: 'MATIC', symbol: 'MATIC' },
    rpcUrls: { default: { http: ['https://rpc-amoy.polygon.technology'] } },
    testnet: true,
});

const VAULT_ADDRESS = (process.env.REWARDS_VAULT_ADDRESS || '0x34C5A617e32c84BC9A54c862723FA5538f42F221') as `0x${string}`;
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

let privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY!;
if (!privateKey.startsWith('0x')) privateKey = `0x${privateKey}`;

const VAULT_ABI = [
    {
        inputs: [{ name: 'newSigner', type: 'address' }],
        name: 'setBackendSigner',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'owner',
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'backendSigner',
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
const account = privateKeyToAccount(privateKey as `0x${string}`);
const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) });

// Derive the smart account address (deterministic from private key)
const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: account,
    entryPoint: { address: entryPoint07Address, version: '0.7' },
});
const smartAccountAddress = smartAccount.address;

console.log(`\nEOA (owner)    : ${account.address}`);
console.log(`Smart Account  : ${smartAccountAddress}`);
console.log(`Vault          : ${VAULT_ADDRESS}\n`);

// Check current owner
const owner = await publicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'owner' });
console.log(`Vault owner    : ${owner}`);
console.log(`Is owner?      : ${owner.toLowerCase() === account.address.toLowerCase()}`);

// Check current backend signer
const currentSigner = await publicClient.readContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'backendSigner',
});
console.log(`Current signer : ${currentSigner}`);

if (currentSigner.toLowerCase() === smartAccountAddress.toLowerCase()) {
    console.log('\n✅ Smart account is already the backend signer. No action needed.');
    process.exit(0);
}

// Check EOA balance
const balance = await publicClient.getBalance({ address: account.address });
const balanceEth = Number(balance) / 1e18;
console.log(`EOA POL balance: ${balanceEth.toFixed(6)} POL`);

if (balanceEth < 0.001) {
    console.error('\n❌ Insufficient POL for addSigner tx. Need ~0.001 POL.');
    console.error('   Fund the EOA at a Polygon Amoy faucet: https://faucet.polygon.technology/');
    process.exit(1);
}

console.log(`\nSetting smart account as new backend signer...`);
console.log(`  Old signer: ${currentSigner}`);
console.log(`  New signer: ${smartAccountAddress}\n`);

try {
    const hash = await walletClient.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'setBackendSigner',
        args: [smartAccountAddress],
    });

    console.log(`\nTx submitted: ${hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    console.log(`\n✅ Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);
    console.log(`   https://amoy.polygonscan.com/tx/${hash}`);
    console.log(`\n✅ Smart account ${smartAccountAddress} is now the backend signer.`);
    console.log('   Gasless reward distribution is now enabled.');
    console.log('   Run: EVENT_ID=128d25c8-35c4-429d-a0e8-39159d718c8a bun run src/scripts/retryRewards.ts');
} catch (err: any) {
    console.error('\n❌ addSigner failed:', err.shortMessage ?? err.message);
    process.exit(1);
}
