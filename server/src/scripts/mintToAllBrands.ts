import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const USDC_ADDRESS = (process.env.TEST_USDC_ADDRESS ?? '0x61d11C622Bd98A71aD9361833379A2066Ad29CCa') as `0x${string}`;
const PRIVATE_KEY = (process.env.BACKEND_SIGNER_PRIVATE_KEY ?? '') as `0x${string}`;
const RPC_URL = process.env.RPC_URL ?? 'https://rpc-amoy.polygon.technology';
const USDC_DECIMALS = 6;
const MINT_AMOUNT = '500';

const MINT_ABI = [
    {
        name: 'mint',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
] as const;

async function main() {
    if (!PRIVATE_KEY) {
        console.error('BACKEND_SIGNER_PRIVATE_KEY not set in .env');
        process.exit(1);
    }

    const pk = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}` as `0x${string}`;
    const account = privateKeyToAccount(pk);

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) });

    const amount = parseUnits(MINT_AMOUNT, USDC_DECIMALS);

    // Get all brand owners with a wallet address
    const brandOwners = await prisma.user.findMany({
        where: {
            AND: [
                { OR: [{ role: 'BRAND_OWNER' }, { ownedBrands: { some: {} } }] },
                { walletAddress: { not: null } }
            ]
        },
        select: {
            email: true,
            walletAddress: true,
        }
    });

    console.log(`Found ${brandOwners.length} brand owners to mint USDC to.`);

    for (const owner of brandOwners) {
        const TO = owner.walletAddress as `0x${string}`;

        // Balance before
        const before = await publicClient.readContract({
            address: USDC_ADDRESS,
            abi: MINT_ABI,
            functionName: 'balanceOf',
            args: [TO],
        });

        console.log(`\n--------------------------------------------------`);
        console.log(`Minting ${MINT_AMOUNT} USDC → ${TO} (${owner.email})`);
        console.log(`Balance before : ${formatUnits(before, USDC_DECIMALS)} USDC`);

        try {
            const txHash = await walletClient.writeContract({
                address: USDC_ADDRESS,
                abi: MINT_ABI,
                functionName: 'mint',
                args: [TO, amount],
            });

            console.log(`Tx submitted   : ${txHash}`);
            console.log('Waiting for confirmation...');

            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash,
                timeout: 120_000,
            });
            console.log(`Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);

            // Balance after
            const after = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: MINT_ABI,
                functionName: 'balanceOf',
                args: [TO],
            });

            console.log(`Balance after  : ${formatUnits(after, USDC_DECIMALS)} USDC`);
        } catch (error) {
            console.error(`Failed to mint for ${owner.email}:`, error);
        }
    }

    console.log(`\n✓ All minting operations completed.\n`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
