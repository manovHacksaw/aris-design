import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('Running migration: add_leaderboardPoolUsdc');

        // Add the leaderboardPoolUsdc column to event_rewards_pools table
        await prisma.$executeRaw`
      ALTER TABLE event_rewards_pools ADD COLUMN IF NOT EXISTS "leaderboardPoolUsdc" DOUBLE PRECISION NOT NULL DEFAULT 0
    `;

        console.log('✅ Migration completed successfully!');
        console.log('Added leaderboardPoolUsdc column to event_rewards_pools table');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
