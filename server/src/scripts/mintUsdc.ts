

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const TO     = (process.env.TO     ?? '0xc6BC85D7631A5272e39449DF8DC5605eB0b832D3') as `0x${string}`;
const AMOUNT = process.env.AMOUNT  ?? '500';

const USDC_ADDRESS     = (process.env.TEST_USDC_ADDRESS ?? '0x61d11C622Bd98A71aD9361833379A2066Ad29CCa') as `0x${string}`;
const PRIVATE_KEY      = (process.env.BACKEND_SIGNER_PRIVATE_KEY ?? '') as `0x${string}`;
const RPC_URL          = process.env.RPC_URL ?? 'https://rpc-amoy.polygon.technology';
const USDC_DECIMALS    = 6;

const MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
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

  const amount = parseUnits(AMOUNT, USDC_DECIMALS);

  // Balance before
  const before = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: MINT_ABI,
    functionName: 'balanceOf',
    args: [TO],
  });

  console.log(`\nMinting ${AMOUNT} USDC → ${TO}`);
  console.log(`Balance before : ${formatUnits(before, USDC_DECIMALS)} USDC`);
  console.log(`Signer         : ${account.address}`);

  const txHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: MINT_ABI,
    functionName: 'mint',
    args: [TO, amount],
  });

  console.log(`\nTx submitted   : ${txHash}`);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);

  // Balance after
  const after = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: MINT_ABI,
    functionName: 'balanceOf',
    args: [TO],
  });

  console.log(`Balance after  : ${formatUnits(after, USDC_DECIMALS)} USDC`);
  console.log(`\n✓ Done. https://amoy.polygonscan.com/tx/${txHash}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
