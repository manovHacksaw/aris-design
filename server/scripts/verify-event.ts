import { createPublicClient, http, formatUnits } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';
import { PrismaClient } from '@prisma/client';

// Hardcode ABI/Address from frontend constants to avoid import issues if paths differ
export const REWARDS_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_REWARDS_VAULT_ADDRESS || '0xf42C313d6C00e009C35097d9DE35C1Eba2Ff65a5') as `0x${string}`;

const REWARDS_VAULT_ABI = [
    {
        inputs: [{ name: 'eventId', type: 'bytes32' }],
        name: 'eventPools',
        outputs: [
            { name: 'eventId', type: 'bytes32' },
            { name: 'status', type: 'uint8' },
            { name: 'eventType', type: 'uint8' },
            { name: 'brandOwner', type: 'address' },
            { name: 'maxParticipants', type: 'uint256' },
            { name: 'basePoolUsdc', type: 'uint256' },
            { name: 'topPoolUsdc', type: 'uint256' },
            { name: 'platformFeeUsdc', type: 'uint256' },
            { name: 'creatorPoolUsdc', type: 'uint256' },
            { name: 'leaderboardPoolUsdc', type: 'uint256' },
            { name: 'totalDisbursed', type: 'uint256' },
            { name: 'actualParticipants', type: 'uint256' },
            { name: 'createdAt', type: 'uint256' },
            { name: 'completedAt', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;


// Modify DB URL to restrict connections for this script
const dbUrl = process.env.DATABASE_URL?.includes('?')
    ? `${process.env.DATABASE_URL}&connection_limit=1`
    : `${process.env.DATABASE_URL}?connection_limit=1`;

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

async function main() {
    console.log("🔍 Finding latest event with on-chain ID...");
    // console.log("DB URL:", dbUrl.replace(/:[^:]+@/, ':****@')); // Debug if needed

    const event = await prisma.event.findFirst({
        where: {
            onChainEventId: { not: null }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!event || !event.onChainEventId) {
        console.error("❌ No event found in DB with onChainEventId.");
        return;
    }

    console.log(`✅ Found Event: ${event.title}`);
    console.log(`   Internal ID: ${event.id}`);
    console.log(`   On-Chain ID: ${event.onChainEventId}`);
    console.log(`   Tx Hash: ${event.poolTxHash}`);

    console.log("\n🌍 Querying Blockchain (Mantle Sepolia)...");

    const client = createPublicClient({
        chain: mantleSepoliaTestnet,
        transport: http('https://rpc.sepolia.mantle.xyz')
    });

    try {
        const pool = await client.readContract({
            address: REWARDS_VAULT_ADDRESS,
            abi: REWARDS_VAULT_ABI,
            functionName: 'eventPools',
            args: [event.onChainEventId as `0x${string}`]
        });

        // The output is an array/object matching the tuple
        // Since abi defines output components, viem might return an object or array depending on version/config
        // Based on typical behavior with named outputs in ABI, it might return an object if using specific versions, or array.
        // Let's assume typical viem behavior with structured return.

        console.log("\n📦 Smart Contract Data (Raw):", pool);
        // Using 'any' cast to inspect structure safely without strict type mapping here
        const [
            r_eventId,
            r_status,
            r_eventType,
            r_brandOwner,
            r_maxParticipants,
            r_basePoolUsdc,
            r_topPoolUsdc,
            r_platformFeeUsdc,
            r_creatorPoolUsdc
        ] = pool as any;

        console.log(`   Status: ${r_status} (0=Active, 1=Completed, 2=Cancelled)`);
        console.log(`   Type: ${r_eventType} (0=VoteOnly, 1=PostAndVote)`);
        console.log(`   Brand Owner: ${r_brandOwner}`);
        console.log(`   Max Participants: ${r_maxParticipants.toString()}`);
        console.log(`   Base Pool: ${formatUnits(r_basePoolUsdc, 6)} USDC`);
        console.log(`   Top Pool: ${formatUnits(r_topPoolUsdc, 6)} USDC`);
        console.log(`   Creator Pool: ${formatUnits(r_creatorPoolUsdc, 6)} USDC`);
        console.log(`   Platform Fee: ${formatUnits(r_platformFeeUsdc, 6)} USDC`);

        console.log("\n✅ Verification Successful!");

    } catch (error) {
        console.error("❌ Failed to read contract:", error);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
