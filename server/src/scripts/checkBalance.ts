import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const USDC = (process.env.TEST_USDC_ADDRESS ?? '0x61d11C622Bd98A71aD9361833379A2066Ad29CCa') as `0x${string}`;
const SIGNER = '0x2D4575003f6017950C2f7a10aFb17bf2fBb648d2' as `0x${string}`;
const TARGET = '0xc6BC85D7631A5272e39449DF8DC5605eB0b832D3' as `0x${string}`;

const ERC20_ABI = [{
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }],
}] as const;

const client = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.RPC_URL ?? 'https://rpc-amoy.polygon.technology'),
});

const [signerMatic, targetUsdc] = await Promise.all([
  client.getBalance({ address: SIGNER }),
  client.readContract({ address: USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [TARGET] }),
]);

console.log(`Signer (${SIGNER})`);
console.log(`  POL/MATIC : ${formatEther(signerMatic)}`);
console.log(`Target (${TARGET})`);
console.log(`  USDC      : ${formatUnits(targetUsdc, 6)}`);
