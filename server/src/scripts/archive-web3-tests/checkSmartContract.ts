
import { ethers } from 'ethers';
import { REWARDS_VAULT_ABI, REWARDS_VAULT_ADDRESS, SUPPORTED_CHAIN } from '../../frontend/constants/contracts'; // Adjust path if needed, usually scripts are in server/src/scripts so relative path might be tricky. Better to replicate ABI or use a simpler script.

// Simpler approach: Create a standalone script
import { createPublicClient, http, defineChain } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

// Minimal ABI for getPoolInfo
const abi = [
  {
    inputs: [{ name: 'eventId', type: 'bytes32' }],
    name: 'getPoolInfo',
    outputs: [
      {
        components: [
          { name: 'state', type: 'uint8' },
          { name: 'eventType', type: 'uint8' },
          { name: 'brandAddress', type: 'address' },
          { name: 'maxParticipants', type: 'uint256' },
          { name: 'basePool', type: 'uint256' },
          { name: 'topPool', type: 'uint256' },
          { name: 'platformFeePool', type: 'uint256' },
          { name: 'creatorPool', type: 'uint256' },
          { name: 'totalDisbursed', type: 'uint256' },
          { name: 'participantCount', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Helper to generate keccak256 hash of event ID string
import { keccak256, toUtf8Bytes } from 'ethers';

async function main() {
  const eventId = 'cf627c48-ba72-4605-8f74-c949efb0e199';
  const onChainEventId = keccak256(toUtf8Bytes(eventId));
  const contractAddress = '0x6aE731EbaC64f1E9c6A721eA2775028762830CF7'; // From previous file view

  console.log(`Checking Pool for Event ID: ${eventId}`);
  console.log(`On-Chain ID (Hash): ${onChainEventId}`);

  try {
    const poolInfo = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: abi,
      functionName: 'getPoolInfo',
      args: [onChainEventId as `0x${string}`],
    });

    console.log('Pool Info from Smart Contract:');
    console.log(poolInfo);

    // Enum mapping
    const states = ['NotCreated', 'Active', 'Finalized', 'Cancelled'];
    // @ts-ignore
    console.log(`State: ${states[poolInfo.state]} (${poolInfo.state})`);

  } catch (error) {
    console.error('Error fetching pool info:', error);
  }
}

main();

