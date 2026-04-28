-- Step 1: Add new enum values first (before removing old ones)
ALTER TYPE "RewardsPoolStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Step 2: Migrate data from old to new enum values for RewardsPoolStatus
UPDATE event_rewards_pools SET status = 'ACTIVE' WHERE status = 'PENDING';
UPDATE event_rewards_pools SET status = 'COMPLETED' WHERE status = 'FINALIZED';
UPDATE event_rewards_pools SET status = 'CANCELLED' WHERE status = 'FAILED';

-- Step 3: Copy finalizedAt to completedAt
ALTER TABLE event_rewards_pools ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
UPDATE event_rewards_pools SET "completedAt" = "finalizedAt" WHERE "finalizedAt" IS NOT NULL;

-- Step 4: Migrate ClaimStatus data
UPDATE reward_claims SET status = 'CLAIMED' WHERE status = 'CREDITED';
UPDATE reward_claims SET status = 'PENDING' WHERE status = 'SIGNED';
UPDATE reward_claims SET status = 'EXPIRED' WHERE status = 'EXHAUSTED';

-- Step 5: Drop old columns from event_rewards_pools
ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "onChainEventId";
ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "transactionHash";
ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "refundAmount";
ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "refundTxHash";
ALTER TABLE event_rewards_pools DROP COLUMN IF EXISTS "finalizedAt";

-- Step 6: Drop old columns from reward_claims
ALTER TABLE reward_claims DROP COLUMN IF EXISTS "signature";
ALTER TABLE reward_claims DROP COLUMN IF EXISTS "signatureExpiry";
ALTER TABLE reward_claims DROP COLUMN IF EXISTS "transactionHash";

-- Step 7: Update default for new pools
ALTER TABLE event_rewards_pools ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- Note: Removing enum values requires recreating the enum, which Prisma will handle via db push
