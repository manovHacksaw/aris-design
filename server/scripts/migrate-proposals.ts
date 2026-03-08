import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface MCQOptions {
  question: string;
  choices: string[];
}

interface ImageOptions {
  imageCid: string;
  caption?: string;
}

async function runMigration() {
  try {
    console.log('🚀 Starting proposal redesign migration...\n');

    // Step 1: Add new columns
    console.log('📝 Step 1: Adding new columns to proposals table...');
    await prisma.$executeRaw`
      ALTER TABLE "proposals"
      ADD COLUMN IF NOT EXISTS "content" TEXT,
      ADD COLUMN IF NOT EXISTS "imageCid" TEXT;
    `;

    // Step 2: Get all existing proposals
    console.log('📝 Step 2: Fetching existing proposals...');
    const proposals = await prisma.$queryRaw<any[]>`
      SELECT id, "eventId", type, title, options, "order", "voteCount", "createdAt", "updatedAt"
      FROM "proposals"
    `;

    console.log(`   Found ${proposals.length} proposals to migrate`);

    // Step 3: Migrate IMAGE proposals
    console.log('📝 Step 3: Migrating IMAGE proposals...');
    let imageCount = 0;
    for (const proposal of proposals) {
      if (proposal.type === 'IMAGE') {
        const options = proposal.options as ImageOptions;
        await prisma.$executeRaw`
          UPDATE "proposals"
          SET "imageCid" = ${options.imageCid},
              "title" = COALESCE(${proposal.title}, 'Untitled Image')
          WHERE id::text = ${proposal.id}
        `;
        imageCount++;
      }
    }
    console.log(`   ✓ Migrated ${imageCount} IMAGE proposals`);

    // Step 4: Migrate MCQ proposals to TEXT
    console.log('📝 Step 4: Migrating MCQ proposals to TEXT...');
    let mcqCount = 0;
    let newProposalsCreated = 0;

    for (const proposal of proposals) {
      if (proposal.type === 'MCQ') {
        mcqCount++;
        const options = proposal.options as MCQOptions;
        const choices = options.choices;

        if (!choices || choices.length === 0) {
          console.warn(`   ⚠️  Skipping MCQ proposal ${proposal.id} - no choices`);
          continue;
        }

        console.log(`   Processing MCQ: "${options.question}" with ${choices.length} choices`);

        // Convert first choice - reuse existing proposal
        await prisma.$executeRaw`
          UPDATE "proposals"
          SET type = 'TEXT'::"ProposalType",
              title = ${choices[0]},
              content = ${options.question}
          WHERE id::text = ${proposal.id}
        `;

        // Create new proposals for remaining choices
        for (let i = 1; i < choices.length; i++) {
          const newId = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "proposals" (
              id, "eventId", type, title, content, "order", "voteCount", "createdAt", "updatedAt"
            ) VALUES (
              ${newId}::uuid,
              ${proposal.eventId}::uuid,
              'TEXT'::"ProposalType",
              ${choices[i]},
              ${options.question},
              ${proposal.order + i},
              0,
              ${proposal.createdAt},
              ${proposal.updatedAt}
            )
          `;

          // Migrate votes for this choice to the new proposal
          const updatedVotes = await prisma.$executeRaw`
            UPDATE "votes"
            SET "proposalId" = ${newId}::uuid
            WHERE "proposalId"::text = ${proposal.id}
            AND "optionIndex" = ${i}
          `;

          console.log(`     → Created proposal for choice: "${choices[i]}" (migrated ${updatedVotes} votes)`);
          newProposalsCreated++;
        }
      }
    }
    console.log(`   ✓ Migrated ${mcqCount} MCQ proposals into ${mcqCount + newProposalsCreated} TEXT proposals`);

    // Step 5: Update vote counts
    console.log('📝 Step 5: Updating vote counts...');
    await prisma.$executeRaw`
      UPDATE "proposals" p
      SET "voteCount" = (
        SELECT COUNT(*)
        FROM "votes" v
        WHERE v."proposalId" = p.id
      )
    `;

    // Step 6: Drop old columns
    console.log('📝 Step 6: Dropping old columns...');
    await prisma.$executeRaw`ALTER TABLE "proposals" DROP COLUMN IF EXISTS "options"`;
    await prisma.$executeRaw`ALTER TABLE "votes" DROP COLUMN IF EXISTS "optionIndex"`;

    // Step 7: Make title NOT NULL
    console.log('📝 Step 7: Making title column required...');
    await prisma.$executeRaw`
      UPDATE "proposals" SET "title" = 'Untitled' WHERE "title" IS NULL
    `;
    await prisma.$executeRaw`ALTER TABLE "proposals" ALTER COLUMN "title" SET NOT NULL`;

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');

    // Get final counts using raw SQL (Prisma client not regenerated yet)
    const [totalResult] = await prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*) as count FROM "proposals"`;
    const [imageResult] = await prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*) as count FROM "proposals" WHERE type = 'IMAGE'`;
    const [textResult] = await prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*) as count FROM "proposals" WHERE type = 'TEXT'`;

    console.log(`   Total proposals: ${totalResult.count}`);
    console.log(`   IMAGE proposals: ${imageResult.count}`);
    console.log(`   TEXT proposals: ${textResult.count}`);
    console.log(`   New proposals created: ${newProposalsCreated}`);

    console.log('\n⚠️  IMPORTANT: You must now run:');
    console.log('   npx prisma generate');
    console.log('   to regenerate the Prisma client with the updated schema');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
