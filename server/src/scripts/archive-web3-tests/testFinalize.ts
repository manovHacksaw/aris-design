
import { RewardsService } from '../services/rewardsService.js';
import { prisma } from '../lib/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

const TARGET_EVENT_ID = 'edef5a4d-716f-45b5-9e53-1f1eae6058d7';

async function testFinalize() {
    console.log("Testing executeFinalization for event:", TARGET_EVENT_ID);

    // WARNING: This will actually attempt to finalize. On-chain might fail if already finalized.
    // We already finalized it manually? No, we just processed rewards in DB.
    // The contract pool state should be checked.

    try {
        const pool = await RewardsService.executeFinalization(TARGET_EVENT_ID);
        console.log("Finalization Result:", JSON.stringify(pool, null, 2));
    } catch (error: any) {
        console.error("Test execution failed:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testFinalize();
