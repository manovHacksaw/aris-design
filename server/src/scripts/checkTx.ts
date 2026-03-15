import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

const TX = '0x42154fee18aacdea7d2622be4441661c1dbef96da3ab3f00e95b31af9f15bce3';
const client = createPublicClient({ chain: polygonAmoy, transport: http(process.env.RPC_URL ?? 'https://rpc-amoy.polygon.technology') });

try {
  const receipt = await client.getTransactionReceipt({ hash: TX as `0x${string}` });
  console.log('STATUS :', receipt.status);
  console.log('BLOCK  :', receipt.blockNumber.toString());
  console.log('GAS    :', receipt.gasUsed.toString());
  console.log('URL    :', `https://amoy.polygonscan.com/tx/${TX}`);
} catch(e: any) {
  console.log('NOT FOUND / STILL PENDING:', e.shortMessage ?? e.message);
}
