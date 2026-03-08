import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runSqlMigration() {
    console.log('🔄 Running manual Web2 migration...\n');

    try {
        // Step 1: Add COMPLETED enum value
        console.log('📝 Adding COMPLETED enum value...');
        await prisma.$executeRawUnsafe(`
      ALTER TYPE "RewardsPoolStatus" ADD VALUE IF NOT EXISTS 'COMPLETED'
    `);
        console.log('  ✓ Added COMPLETED to RewardsPoolStatus');

        // Step 2: Migrate RewardsPoolStatus data
        console.log('\n📝 Migrating RewardsPoolStatus data...');

        const pendingPools = await prisma.$executeRawUnsafe(`
      UPDATE event_rewards_pools SET status = 'ACTIVE' WHERE status = 'PENDING'
    `);
        console.log(`  ✓ Migrated ${pendingPools} PENDING → ACTIVE`);

        const finalizedPools = await prisma.$executeRawUnsafe(`
      UPDATE event_rewards_pools SET status = 'COMPLETED' WHERE status = 'FINALIZED'
    `);
        console.log(`  ✓ Migrated ${finalizedPools} FINALIZED → COMPLETED`);

        const failedPools = await prisma.$executeRawUnsafe(`
      UPDATE event_rewards_pools SET status = 'CANCELLED' WHERE status = 'FAILED'
    `);
        console.log(`  ✓ Migrated ${failedPools} FAILED → CANCELLED`);

        // Step 3: Add completedAt column and copy data
        console.log('\n📝 Adding completedAt column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE event_rewards_pools ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3)
    `);
        const copiedDates = await prisma.$executeRawUnsafe(`
      UPDATE event_rewards_pools SET "completedAt" = "finalizedAt" WHERE "finalizedAt" IS NOT NULL
    `);
        console.log(`  ✓ Copied ${copiedDates} finalizedAt → completedAt`);

        // Step 4: Migrate ClaimStatus data
        console.log('\n📝 Migrating ClaimStatus data...');

        const creditedClaims = await prisma.$executeRawUnsafe(`
      UPDATE reward_claims SET status = 'CLAIMED' WHERE status = 'CREDITED'
    `);
        console.log(`  ✓ Migrated ${creditedClaims} CREDITED → CLAIMED`);

        const signedClaims = await prisma.$executeRawUnsafe(`
      UPDATE reward_claims SET status = 'PENDING' WHERE status = 'SIGNED'
    `);
        console.log(`  ✓ Migrated ${signedClaims} SIGNED → PENDING`);

        const exhaustedClaims = await prisma.$executeRawUnsafe(`
      UPDATE reward_claims SET status = 'EXPIRED' WHERE status = 'EXHAUSTED'
    `);
        console.log(`  ✓ Migrated ${exhaustedClaims} EXHAUSTED → EXPIRED`);

        // Step 5: Drop old columns from event_rewards_pools
        console.log('\n📝 Dropping old columns from event_rewards_pools...');
        await prisma.$executeRawUnsafe(`ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "onChainEventId"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "transactionHash"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "refundAmount"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "refundTxHash"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "finalizedAt"`);
        console.log('  ✓ Dropped onChainEventId, transactionHash, refundAmount, refundTxHash, finalizedAt');

        // Step 6: Drop old columns from reward_claims
        console.log('\n📝 Dropping old columns from reward_claims...');
        await prisma.$executeRawUnsafe(`ALTER TABLE reward_claims DROP COLUMN IF EXISTS "signature"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE reward_claims DROP COLUMN IF EXISTS "signatureExpiry"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE reward_claims DROP COLUMN IF EXISTS "transactionHash"`);
        console.log('  ✓ Dropped signature, signatureExpiry, transactionHash');

        // Step 7: Update default for new pools
        console.log('\n📝 Updating default status...');
        await prisma.$executeRawUnsafe(`ALTER TABLE event_rewards_pools ALTER COLUMN status SET DEFAULT 'ACTIVE'`);
        console.log('  ✓ Set default status to ACTIVE');

        console.log('\n✅ Manual migration completed successfully!');
        console.log('\n📌 Next step: Run `npx prisma db pull` to sync schema, then `npx prisma generate`');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

runSqlMigration()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
