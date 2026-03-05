-- Step 1: Add new columns to proposals table
ALTER TABLE "proposals"
  ADD COLUMN IF NOT EXISTS "content" TEXT,
  ADD COLUMN IF NOT EXISTS "imageCid" TEXT;

-- Step 2: Make title required (will be populated from options for MCQ)
-- For now, ensure all existing proposals have a title
UPDATE "proposals"
SET "title" = COALESCE("title", 'Untitled Proposal')
WHERE "title" IS NULL;

-- Step 3: Migrate IMAGE proposals - extract imageCid from options JSON
UPDATE "proposals"
SET "imageCid" = ("options"->>'imageCid')
WHERE "type" = 'IMAGE';

-- Step 4: Migrate MCQ proposals to TEXT proposals
-- For MCQ proposals, we need to create separate TEXT proposals for each choice
-- First, let's create a temporary table to store the expanded proposals
CREATE TEMP TABLE temp_mcq_proposals AS
SELECT
  p.id as original_id,
  p."eventId",
  p."order",
  p."createdAt",
  p."updatedAt",
  p."options"->>'question' as question,
  jsonb_array_elements_text(("options"->>'choices')::jsonb) as choice,
  row_number() OVER (PARTITION BY p.id ORDER BY ordinality) - 1 as choice_index
FROM "proposals" p
CROSS JOIN LATERAL jsonb_array_elements_text(("options"->>'choices')::jsonb) WITH ORDINALITY
WHERE p."type" = 'MCQ';

-- Step 5: For each MCQ proposal, create new TEXT proposals for each choice
-- We'll insert new proposals for choices (except the first one which will reuse the existing record)
DO $$
DECLARE
    mcq_record RECORD;
    new_proposal_id UUID;
    choice_count INT;
    current_order INT;
BEGIN
    FOR mcq_record IN
        SELECT DISTINCT original_id, "eventId", "order", question, "createdAt", "updatedAt"
        FROM temp_mcq_proposals
    LOOP
        -- Count how many choices this MCQ has
        SELECT COUNT(*) INTO choice_count
        FROM temp_mcq_proposals
        WHERE original_id = mcq_record.original_id;

        -- Get the current order
        current_order := mcq_record."order";

        -- Convert the first choice to TEXT (reuse existing record)
        UPDATE "proposals"
        SET
            "type" = 'TEXT',
            "title" = (SELECT choice FROM temp_mcq_proposals WHERE original_id = mcq_record.original_id AND choice_index = 0),
            "content" = mcq_record.question
        WHERE id = mcq_record.original_id;

        -- Create new proposals for remaining choices
        FOR i IN 1..(choice_count - 1) LOOP
            new_proposal_id := gen_random_uuid();
            current_order := current_order + 1;

            INSERT INTO "proposals" (
                id,
                "eventId",
                type,
                title,
                content,
                "order",
                "voteCount",
                "createdAt",
                "updatedAt"
            )
            SELECT
                new_proposal_id,
                mcq_record."eventId",
                'TEXT',
                choice,
                mcq_record.question,
                current_order,
                0,
                mcq_record."createdAt",
                mcq_record."updatedAt"
            FROM temp_mcq_proposals
            WHERE original_id = mcq_record.original_id AND choice_index = i;

            -- Migrate votes for this choice to the new proposal
            -- Votes with optionIndex matching this choice should point to the new proposal
            UPDATE "votes"
            SET "proposalId" = new_proposal_id
            WHERE "proposalId" = mcq_record.original_id
            AND "optionIndex" = i;
        END LOOP;
    END LOOP;
END $$;

-- Step 6: Update vote counts for all proposals after migration
UPDATE "proposals" p
SET "voteCount" = (
    SELECT COUNT(*)
    FROM "votes" v
    WHERE v."proposalId" = p.id
);

-- Step 7: Drop temporary table
DROP TABLE temp_mcq_proposals;

-- Step 8: Now safe to drop the old columns
ALTER TABLE "proposals" DROP COLUMN IF EXISTS "options";
ALTER TABLE "votes" DROP COLUMN IF EXISTS "optionIndex";

-- Step 9: Make title NOT NULL now that all proposals have titles
ALTER TABLE "proposals" ALTER COLUMN "title" SET NOT NULL;

-- Step 10: Update the ProposalType enum
-- First rename MCQ to TEXT for any remaining records
UPDATE "proposals" SET "type" = 'TEXT' WHERE "type" = 'MCQ';

-- Drop the old enum value and add the new one
ALTER TYPE "ProposalType" RENAME VALUE 'MCQ' TO 'TEXT';
