import { ethers } from 'ethers';

/**
 * Blockchain utility functions for Web3 integration
 */

/**
 * Convert UUID to bytes32 for smart contract
 * @param uuid - Event UUID from database
 * @returns bytes32 hash
 */
export function eventIdToBytes32(uuid: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(uuid));
}

/**
 * Format USDC amount from wei (6 decimals) to human-readable
 * @param amount - Amount in wei (6 decimals)
 * @returns Formatted string (e.g., "10.50")
 */
export function formatUsdc(amount: bigint | string): string {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    return ethers.formatUnits(amountBigInt, 6);
}

/**
 * Parse USDC amount from human-readable to wei (6 decimals)
 * @param amount - Amount in USDC (e.g., 10.5)
 * @returns Amount in wei
 */
export function parseUsdc(amount: number): bigint {
    return ethers.parseUnits(amount.toString(), 6);
}

/**
 * Calculate required USDC for event creation
 * @param params - Event parameters
 * @returns Required USDC amount
 */
export function calculateRequiredUsdc(params: {
    eventType: 'vote_only' | 'post_and_vote';
    maxParticipants: number;
    topPoolUsdc: number;
    leaderboardPoolUsdc?: number;
}): number {
    const BASE_REWARD_PER_VOTE = 0.03;
    const CREATOR_REWARD_PER_VOTE = 0.05;
    const PLATFORM_FEE_VOTE_ONLY = 0.015;
    const PLATFORM_FEE_POST_AND_VOTE = 0.02;

    const basePool = BASE_REWARD_PER_VOTE * params.maxParticipants;
    const platformFee = params.eventType === 'post_and_vote'
        ? PLATFORM_FEE_POST_AND_VOTE * params.maxParticipants
        : PLATFORM_FEE_VOTE_ONLY * params.maxParticipants;

    let creatorPool = 0;
    let leaderboardPool = 0;

    if (params.eventType === 'post_and_vote') {
        creatorPool = CREATOR_REWARD_PER_VOTE * params.maxParticipants;
        // Use provided leaderboard pool or default to 0 for backend validation (Frontend should pass it)
        leaderboardPool = params.leaderboardPoolUsdc || 0;
    }

    const minTopPool = basePool * 2;
    const effectiveTopPool = params.topPoolUsdc < minTopPool ? minTopPool : params.topPoolUsdc;

    return basePool + effectiveTopPool + platformFee + creatorPool + leaderboardPool;
}

/**
 * Get Mantlescan transaction URL
 * @param txHash - Transaction hash
 * @returns Mantlescan URL
 */
export function getMantlescanUrl(txHash: string): string {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
}

/**
 * Get Mantlescan address URL
 * @param address - Contract or wallet address
 * @returns Mantlescan URL
 */
export function getMantlescanAddressUrl(address: string): string {
    return `https://amoy.polygonscan.com/address/${address}`;
}

/**
 * Validate Ethereum address
 * @param address - Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

/**
 * Constants for reward economics
 */
export const REWARD_CONSTANTS = {
    BASE_REWARD_PER_VOTE: 0.03,
    CREATOR_REWARD_PER_VOTE: 0.05,
    PLATFORM_FEE_PER_PARTICIPANT: 0.015,
    MIN_TOP_POOL_MULTIPLIER: 2,
    USDC_DECIMALS: 6,
} as const;

// ==================== BACKEND SIGNER LOGIC (GASLESS via Pimlico) ====================

import { http, createPublicClient, encodeFunctionData, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';

const polygonAmoy = defineChain({
    id: 80002,
    name: 'Polygon Amoy Testnet',
    nativeCurrency: { decimals: 18, name: 'MATIC', symbol: 'MATIC' },
    rpcUrls: { default: { http: ['https://rpc-amoy.polygon.technology'] } },
    testnet: true,
});

const REWARDS_VAULT_ABI = [
    {
        inputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'users', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
            { name: 'actualParticipants', type: 'uint256' },
        ],
        name: 'creditRewardsBatch',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'eventId', type: 'bytes32' }],
        name: 'cancelEvent',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'brand', type: 'address' }],
        name: 'getBrandRefundBalance',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'withdrawRefund',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

export class BlockchainService {
    private static getPublicClient() {
        const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
        return createPublicClient({ chain: polygonAmoy, transport: http(rpcUrl) });
    }

    private static getVaultAddress(): `0x${string}` {
        return (process.env.REWARDS_VAULT_ADDRESS || '0x34C5A617e32c84BC9A54c862723FA5538f42F221') as `0x${string}`;
    }

    /**
     * Build a Pimlico-sponsored smart account client for the backend signer.
     * No POL required — Pimlico paymaster covers gas fees.
     */
    private static async getSmartAccountClient() {
        let privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
        const pimlicoApiKey = process.env.PIMLICO_API_KEY;

        if (!privateKey) throw new Error('BACKEND_SIGNER_PRIVATE_KEY not configured');
        if (!pimlicoApiKey) throw new Error('PIMLICO_API_KEY not configured');

        if (!privateKey.startsWith('0x')) privateKey = `0x${privateKey}`;

        const publicClient = this.getPublicClient();
        const owner = privateKeyToAccount(privateKey as `0x${string}`);

        const pimlicoRpc = `https://api.pimlico.io/v2/80002/rpc?apikey=${pimlicoApiKey}`;

        const pimlico = createPimlicoClient({
            transport: http(pimlicoRpc),
            entryPoint: { address: entryPoint07Address, version: '0.7' },
        });

        const smartAccount = await toSimpleSmartAccount({
            client: publicClient,
            owner,
            entryPoint: { address: entryPoint07Address, version: '0.7' },
        });

        const smartAccountClient = createSmartAccountClient({
            account: smartAccount,
            chain: polygonAmoy,
            bundlerTransport: http(pimlicoRpc),
            paymaster: pimlico,
            userOperation: {
                estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
            },
        });

        return { smartAccountClient, smartAccount, publicClient };
    }

    /**
     * Distribute rewards on-chain via Pimlico-sponsored smart account.
     * No POL needed — gas is sponsored by Pimlico paymaster.
     */
    static async distributeRewardsBatch(
        eventId: string,
        users: string[],
        amounts: bigint[],
        actualParticipants: number
    ): Promise<string> {
        const eventIdBytes32 = eventIdToBytes32(eventId) as `0x${string}`;
        const vaultAddress = this.getVaultAddress();

        console.log(`🔗 Blockchain: Distributing rewards for event ${eventId}`);
        console.log(`   - Users: ${users.length}`);
        console.log(`   - Total Participants: ${actualParticipants}`);

        try {
            const { smartAccountClient, publicClient } = await this.getSmartAccountClient();

            const hash = await smartAccountClient.writeContract({
                address: vaultAddress,
                abi: REWARDS_VAULT_ABI,
                functionName: 'creditRewardsBatch',
                args: [eventIdBytes32, users as `0x${string}`[], amounts, BigInt(actualParticipants)],
            });

            console.log(`✅ Blockchain: Distribution UserOp sent: ${hash}`);

            const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });

            if (receipt.status !== 'success') {
                throw new Error('Transaction reverted on-chain');
            }

            console.log(`✅ Blockchain: Confirmed in block ${receipt.blockNumber}`);
            return hash;

        } catch (error: any) {
            console.error('❌ Blockchain: Distribution Failed:', error);
            throw new Error(`On-chain distribution failed: ${error.message || error}`);
        }
    }

    /**
     * Cancel an event on-chain via Pimlico-sponsored smart account.
     */
    static async cancelEventOnChain(eventId: string): Promise<string> {
        const eventIdBytes32 = eventIdToBytes32(eventId) as `0x${string}`;
        const vaultAddress = this.getVaultAddress();

        console.log(`🔗 Blockchain: Cancelling event ${eventId}`);

        try {
            const { smartAccountClient, publicClient } = await this.getSmartAccountClient();

            const hash = await smartAccountClient.writeContract({
                address: vaultAddress,
                abi: REWARDS_VAULT_ABI,
                functionName: 'cancelEvent',
                args: [eventIdBytes32],
            });

            console.log(`✅ Blockchain: Cancel Event UserOp sent: ${hash}`);

            const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });

            if (receipt.status !== 'success') {
                throw new Error('Transaction reverted on-chain');
            }

            console.log(`✅ Blockchain: Event cancelled in block ${receipt.blockNumber}`);
            return hash;

        } catch (error: any) {
            console.error('❌ Blockchain: Cancel Event Failed:', error);
            throw new Error(`On-chain cancellation failed: ${error.message || error}`);
        }
    }

    /**
     * Get brand's refund balance from smart contract.
     */
    static async getBrandRefundBalance(brandAddress: string): Promise<number> {
        const publicClient = this.getPublicClient();
        const vaultAddress = this.getVaultAddress();

        try {
            const balance = await publicClient.readContract({
                address: vaultAddress,
                abi: REWARDS_VAULT_ABI,
                functionName: 'getBrandRefundBalance',
                args: [brandAddress as `0x${string}`],
            });

            return Number(balance) / 1_000_000;
        } catch (error: any) {
            console.error('❌ Blockchain: Failed to fetch brand refund balance:', error);
            return 0;
        }
    }
}
