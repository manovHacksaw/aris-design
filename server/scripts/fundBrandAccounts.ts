/**
 * fundBrandAccounts.ts
 *
 * Mints test USDC from the backend signer to every brand owner's smart-account
 * (walletAddress in DB).  The signer must be the minter / owner of the test USDC
 * contract deployed at NEXT_PUBLIC_TEST_USDC_ADDRESS.
 *
 * Usage:
 *   npx ts-node scripts/fundBrandAccounts.ts [--amount 100]
 *
 * Optional flags:
 *   --amount  <n>   USDC to mint per account (default 100)
 *   --address <a>   Fund a single specific address instead of all brands
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createWalletClient, createPublicClient, http, encodeFunctionData, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────────
const USDC_ADDRESS   = (process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS || '0x61d11C622Bd98A71aD9361833379A2066Ad29CCa') as `0x${string}`;
const SIGNER_PK      = (process.env.BACKEND_SIGNER_PK || 'c6b08c97b6039baeffaa806542acb680ae5e1ddda3e6c6496b8ac5c9aa1c256a') as `0x${string}`;
const RPC_URL        = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';

const USDC_MINT_ABI = [
    {
        inputs: [
            { name: 'to',     type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'mint',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// ── Parse args ────────────────────────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    let amount  = 100;
    let address: string | null = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--amount'  && args[i + 1]) amount  = parseFloat(args[++i]);
        if (args[i] === '--address' && args[i + 1]) address = args[++i];
    }
    return { amount, address };
}

async function main() {
    const { amount, address: singleAddress } = parseArgs();

    const account      = privateKeyToAccount(`0x${SIGNER_PK.replace(/^0x/, '')}`);
    const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) });
    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });

    console.log('🔑 Signer address :', account.address);
    console.log('📍 USDC contract  :', USDC_ADDRESS);
    console.log('💵 Mint amount    : $' + amount + ' USDC each\n');

    // ── Determine target addresses ────────────────────────────────────────────
    let targets: { label: string; address: string }[] = [];

    if (singleAddress) {
        targets = [{ label: singleAddress, address: singleAddress }];
    } else {
        const brands = await prisma.user.findMany({
            where: { role: 'BRAND_OWNER', walletAddress: { not: null } },
            select: { id: true, email: true, username: true, walletAddress: true },
        });

        if (brands.length === 0) {
            console.log('⚠️  No brand owners with wallet addresses found in DB.');
            return;
        }

        targets = brands.map((b) => ({
            label: b.email || b.username || b.id,
            address: b.walletAddress!,
        }));
        console.log(`Found ${targets.length} brand owner(s) with wallet addresses.\n`);
    }

    // ── Mint loop ─────────────────────────────────────────────────────────────
    const mintAmount  = parseUnits(amount.toString(), 6);
    const minBalance  = parseUnits('0.50', 6);    // skip if already has ≥ $0.50

    for (const target of targets) {
        const addr = target.address as `0x${string}`;

        try {
            // Check current balance — skip if already funded
            const balanceBefore = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: USDC_MINT_ABI,
                functionName: 'balanceOf',
                args: [addr],
            }) as bigint;

            console.log(`📬 ${target.label}`);
            console.log(`   Address : ${addr}`);
            console.log(`   Balance : $${(Number(balanceBefore) / 1_000_000).toFixed(2)} USDC`);

            if (balanceBefore >= minBalance) {
                console.log(`   ⏭  Already funded — skipping.\n`);
                continue;
            }

            const data = encodeFunctionData({
                abi: USDC_MINT_ABI,
                functionName: 'mint',
                args: [addr, mintAmount],
            });

            const hash = await walletClient.sendTransaction({
                to: USDC_ADDRESS,
                data,
                gas: 100_000n,   // explicit gas limit to avoid estimation failures
            });

            console.log(`   TX hash : ${hash}`);
            console.log('   Waiting for confirmation...');

            await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });

            const balanceAfter = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: USDC_MINT_ABI,
                functionName: 'balanceOf',
                args: [addr],
            }) as bigint;

            console.log(`   ✅ New balance: $${(Number(balanceAfter) / 1_000_000).toFixed(2)} USDC\n`);
        } catch (err: any) {
            console.error(`   ❌ Failed: ${err?.message ?? err}\n`);
        }
    }

    console.log('Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
