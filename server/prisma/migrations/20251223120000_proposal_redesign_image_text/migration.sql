-- Step 1: Add new columns to proposals table if they don't exist
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "imageCid" TEXT;

-- Step 2: Add TEXT to the enum temporarily (so we have IMAGE, MCQ, TEXT)
ALTER TYPE "ProposalType" ADD VALUE IF NOT EXISTS 'TEXT';

-- Step 3: Update all MCQ proposals to TEXT type
UPDATE "proposals" SET "type" = 'TEXT' WHERE "type" = 'MCQ';

-- Step 4: Remove optionIndex from votes table if it exists
ALTER TABLE "votes" DROP COLUMN IF EXISTS "optionIndex";

-- Step 5: Drop the old options column if it exists
ALTER TABLE "proposals" DROP COLUMN IF EXISTS "options";

-- Step 6: Create new enum with only IMAGE and TEXT
CREATE TYPE "ProposalType_new" AS ENUM ('IMAGE', 'TEXT');

-- Step 7: Alter column to use new enum (all MCQ are now TEXT, so this is safe)
ALTER TABLE "proposals" ALTER COLUMN "type" TYPE "ProposalType_new" USING ("type"::text::"ProposalType_new");

-- Step 8: Drop old enum and rename new one
DROP TYPE "ProposalType";
ALTER TYPE "ProposalType_new" RENAME TO "ProposalType";

-- Step 9: Make title NOT NULL if not already
ALTER TABLE "proposals" ALTER COLUMN "title" SET NOT NULL;
